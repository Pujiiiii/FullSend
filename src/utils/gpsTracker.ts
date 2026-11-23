import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { GpsPoint, MapTheme } from '../types/database';

export const GPS_ROUTE_TASK = 'STATSTRACKER_GPS_ROUTE_TASK';
const ACTIVE_ROUTE_STORAGE_KEY = '@statstracker_active_gps_route_v3';

export interface RouteTrackingState {
  isTracking: boolean;
  vehicleId?: string;
  startTime: number;
  elapsedSeconds: number;
  distanceKm: number;
  currentSpeedKmh: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  currentAltitudeM: number | null;
  elevationGainM: number;
  elevationLossM: number;
  coordinatesCount: number;
  coordinates?: GpsPoint[];
}

interface StoredRouteData {
  vehicleId?: string;
  startTime: number;
  distanceKm: number;
  maxSpeedKmh: number;
  lastCoords: Location.LocationObjectCoords | null;
  lastTimestamp: number;
  lastValidAltM?: number | null;
  coordinates: GpsPoint[];
  elevationGainM: number;
  elevationLossM: number;
  maxAltitudeM: number | null;
  minAltitudeM: number | null;
  mapTheme: MapTheme;
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let activeRoute: {
  vehicleId?: string;
  startTime: number;
  distanceKm: number;
  maxSpeedKmh: number;
  lastCoords: Location.LocationObjectCoords | null;
  lastTimestamp: number;
  lastValidAltM?: number | null;
  coordinates: GpsPoint[];
  elevationGainM: number;
  elevationLossM: number;
  maxAltitudeM: number | null;
  minAltitudeM: number | null;
  mapTheme: MapTheme;
  onUpdateCallback: ((state: RouteTrackingState) => void) | null;
} | null = null;

async function persistRouteState() {
  if (!activeRoute) return;
  const snapshot: StoredRouteData = {
    vehicleId: activeRoute.vehicleId,
    startTime: activeRoute.startTime,
    distanceKm: activeRoute.distanceKm,
    maxSpeedKmh: activeRoute.maxSpeedKmh,
    lastCoords: activeRoute.lastCoords,
    lastTimestamp: activeRoute.lastTimestamp,
    lastValidAltM: activeRoute.lastValidAltM ?? null,
    coordinates: activeRoute.coordinates,
    elevationGainM: activeRoute.elevationGainM,
    elevationLossM: activeRoute.elevationLossM,
    maxAltitudeM: activeRoute.maxAltitudeM,
    minAltitudeM: activeRoute.minAltitudeM,
    mapTheme: activeRoute.mapTheme,
  };
  try {
    await AsyncStorage.setItem(ACTIVE_ROUTE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Error saving GPS snapshot:', e);
  }
}

export function attachRouteUpdateCallback(cb: ((state: RouteTrackingState) => void) | null) {
  if (activeRoute) {
    activeRoute.onUpdateCallback = cb;
  }
}

TaskManager.defineTask(GPS_ROUTE_TASK, async ({ data, error }) => {
  if (error || !data) return;

  if (!activeRoute) {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY);
      if (stored) {
        const parsed: StoredRouteData = JSON.parse(stored);
        activeRoute = {
          ...parsed,
          onUpdateCallback: null,
        };
      } else {
        return;
      }
    } catch {
      return;
    }
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
  for (const loc of sorted) {
    processLocationUpdate(loc);
  }

  await persistRouteState();
});

export function processLocationUpdate(loc: Location.LocationObject) {
  if (!activeRoute) return;

  const coords = loc.coords;

  // 1. Accuracy filter (allow vehicle highway speeds up to 120m)
  if (coords.accuracy !== null && coords.accuracy !== undefined && coords.accuracy > 120) {
    return;
  }

  // 2. Hardware GPS Doppler speed
  const hardwareSpeed = coords.speed !== null && coords.speed !== undefined && coords.speed >= 0
    ? coords.speed * 3.6
    : 0;

  if (hardwareSpeed > 0 && hardwareSpeed <= 260) {
    const roundedHw = Math.round(hardwareSpeed);
    if (roundedHw > activeRoute.maxSpeedKmh) {
      activeRoute.maxSpeedKmh = roundedHw;
    }
  }

  // 3. Distance & segment speed
  let segmentSpeed = 0;
  let dist = 0;

  if (activeRoute.lastCoords) {
    const timeDeltaSec = (loc.timestamp - activeRoute.lastTimestamp) / 1000;
    dist = calculateDistanceKm(
      activeRoute.lastCoords.latitude,
      activeRoute.lastCoords.longitude,
      coords.latitude,
      coords.longitude
    );

    if (timeDeltaSec > 0.5) {
      segmentSpeed = dist / (timeDeltaSec / 3600);
    }

    if (segmentSpeed <= 260 && dist >= 0.004) {
      activeRoute.distanceKm = Number((activeRoute.distanceKm + dist).toFixed(2));

      if (hardwareSpeed <= 0 && segmentSpeed > 0 && segmentSpeed <= 260) {
        const roundedSeg = Math.round(segmentSpeed);
        if (roundedSeg > activeRoute.maxSpeedKmh) {
          activeRoute.maxSpeedKmh = roundedSeg;
        }
      }
    } else if (dist > 2.0 && segmentSpeed > 260) {
      activeRoute.lastCoords = coords;
      activeRoute.lastTimestamp = loc.timestamp;
      return;
    }
  }

  // 4. Altitude & Elevation Gain/Loss (+D / -D) with accuracy check & smoothing
  const altAcc = (coords as any).altitudeAccuracy;
  const isAltReliable = altAcc === null || altAcc === undefined || altAcc <= 35;
  const rawAlt = coords.altitude !== null && coords.altitude !== undefined
    ? Math.round(coords.altitude)
    : null;

  let currentAlt: number | null = activeRoute.lastValidAltM ?? null;
  if (rawAlt !== null && isAltReliable) {
    // Exponential smoothing to avoid GPS vertical jitter spikes
    const smoothedAlt = activeRoute.lastValidAltM !== null && activeRoute.lastValidAltM !== undefined
      ? Math.round(activeRoute.lastValidAltM * 0.65 + rawAlt * 0.35)
      : rawAlt;
    currentAlt = smoothedAlt;

    if (activeRoute.maxAltitudeM === null || smoothedAlt > activeRoute.maxAltitudeM) {
      activeRoute.maxAltitudeM = smoothedAlt;
    }
    if (activeRoute.minAltitudeM === null || smoothedAlt < activeRoute.minAltitudeM) {
      activeRoute.minAltitudeM = smoothedAlt;
    }

    if (activeRoute.lastValidAltM !== null && activeRoute.lastValidAltM !== undefined) {
      const altDelta = smoothedAlt - activeRoute.lastValidAltM;
      // 4m hysteresis threshold to filter micro jitter while keeping real climbs
      if (altDelta >= 4 && altDelta <= 150) {
        activeRoute.elevationGainM += altDelta;
        activeRoute.lastValidAltM = smoothedAlt;
      } else if (altDelta <= -4 && altDelta >= -150) {
        activeRoute.elevationLossM += Math.abs(altDelta);
        activeRoute.lastValidAltM = smoothedAlt;
      }
    } else {
      activeRoute.lastValidAltM = smoothedAlt;
    }
  }

  const effectiveSpeed = hardwareSpeed > 0 ? Math.round(hardwareSpeed) : Math.round(segmentSpeed);

  // 5. Breadcrumb route coordinates (for rendering on map)
  const lastPoint = activeRoute.coordinates[activeRoute.coordinates.length - 1];
  const shouldAddPoint =
    activeRoute.coordinates.length === 0 ||
    dist >= 0.008 || // 8 meters
    (lastPoint && loc.timestamp - lastPoint.timestamp >= 5000); // at least every 5s

  if (shouldAddPoint && activeRoute.coordinates.length < 3500) {
    activeRoute.coordinates.push({
      latitude: Number(coords.latitude.toFixed(6)),
      longitude: Number(coords.longitude.toFixed(6)),
      altitude: currentAlt,
      speed: effectiveSpeed,
      timestamp: loc.timestamp,
    });
  }

  activeRoute.lastCoords = coords;
  activeRoute.lastTimestamp = loc.timestamp;

  const elapsedSec = Math.max(1, Math.floor((Date.now() - activeRoute.startTime) / 1000));
  const hours = elapsedSec / 3600;
  const avgSpeed = hours > 0 && activeRoute.distanceKm > 0
    ? Number((activeRoute.distanceKm / hours).toFixed(1))
    : 0;

  if (activeRoute.onUpdateCallback) {
    activeRoute.onUpdateCallback({
      isTracking: true,
      startTime: activeRoute.startTime,
      elapsedSeconds: elapsedSec,
      distanceKm: activeRoute.distanceKm,
      currentSpeedKmh: effectiveSpeed,
      maxSpeedKmh: activeRoute.maxSpeedKmh,
      avgSpeedKmh: avgSpeed,
      currentAltitudeM: currentAlt,
      elevationGainM: activeRoute.elevationGainM,
      elevationLossM: activeRoute.elevationLossM,
      coordinatesCount: activeRoute.coordinates.length,
    });
  }
}

export async function startGpsTracking(
  onUpdate: (state: RouteTrackingState) => void,
  mapTheme: MapTheme = 'dark_road',
  keepScreenAwake = true,
  vehicleId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return { success: false, error: 'Es requereix permís de localització (GPS).' };
    }

    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      // Foreground service notification is sufficient on Android
    }

    const now = Date.now();
    activeRoute = {
      vehicleId,
      startTime: now,
      distanceKm: 0,
      maxSpeedKmh: 0,
      lastCoords: null,
      lastTimestamp: now,
      lastValidAltM: null,
      coordinates: [],
      elevationGainM: 0,
      elevationLossM: 0,
      maxAltitudeM: null,
      minAltitudeM: null,
      mapTheme,
      onUpdateCallback: onUpdate,
    };

    await persistRouteState();

    if (keepScreenAwake) {
      try {
        await activateKeepAwakeAsync('GPS_TRACKER');
      } catch (e) {
        console.warn('Keep awake error:', e);
      }
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_ROUTE_TASK).catch(() => false);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(GPS_ROUTE_TASK).catch(() => {});
    }

    await Location.startLocationUpdatesAsync(GPS_ROUTE_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1500,
      distanceInterval: 4,
      deferredUpdatesInterval: 0,
      deferredUpdatesDistance: 0,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Full Send • Gravant trajecte',
        notificationBody: 'Registrant velocitat, ruta i desnivell en segon pla...',
        notificationColor: '#CCFF00',
        killServiceOnDestroy: false,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error iniciant GPS' };
  }
}

export async function stopGpsTracking(): Promise<{
  vehicleId?: string;
  distance_km: number;
  duration_seconds: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  max_altitude_m: number | null;
  min_altitude_m: number | null;
  map_theme: MapTheme;
  coordinates: GpsPoint[];
}> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_ROUTE_TASK).catch(() => false);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(GPS_ROUTE_TASK);
    }
  } catch (e) {
    console.warn('Error stopping location task:', e);
  }

  try {
    await deactivateKeepAwake('GPS_TRACKER');
  } catch (e) {
    console.warn('Error deactivating keep awake:', e);
  }

  if (!activeRoute) {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY);
      if (stored) {
        activeRoute = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  const snapshot = activeRoute;
  await AsyncStorage.removeItem(ACTIVE_ROUTE_STORAGE_KEY).catch(() => {});
  activeRoute = null;

  if (!snapshot) {
    return {
      distance_km: 0,
      duration_seconds: 0,
      max_speed_kmh: 0,
      avg_speed_kmh: 0,
      elevation_gain_m: 0,
      elevation_loss_m: 0,
      max_altitude_m: null,
      min_altitude_m: null,
      map_theme: 'dark_road',
      coordinates: [],
    };
  }

  const totalElapsedSec = Math.max(1, Math.floor((Date.now() - snapshot.startTime) / 1000));
  const hours = totalElapsedSec / 3600;
  const finalAvgSpeed = hours > 0 && snapshot.distanceKm > 0
    ? Number((snapshot.distanceKm / hours).toFixed(1))
    : 0;

  return {
    vehicleId: snapshot.vehicleId,
    distance_km: snapshot.distanceKm,
    duration_seconds: totalElapsedSec,
    max_speed_kmh: snapshot.maxSpeedKmh,
    avg_speed_kmh: finalAvgSpeed,
    elevation_gain_m: Math.round(snapshot.elevationGainM),
    elevation_loss_m: Math.round(snapshot.elevationLossM),
    max_altitude_m: snapshot.maxAltitudeM,
    min_altitude_m: snapshot.minAltitudeM,
    map_theme: snapshot.mapTheme,
    coordinates: snapshot.coordinates,
  };
}

export async function checkActiveRouteOnStartup(): Promise<RouteTrackingState | null> {
  // Always prefer fresh AsyncStorage if background task wrote newer points while UI was paused
  try {
    const stored = await AsyncStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY);
    if (stored) {
      const parsed: StoredRouteData = JSON.parse(stored);
      const existingCb = activeRoute?.onUpdateCallback ?? null;
      if (!activeRoute || parsed.coordinates.length >= activeRoute.coordinates.length) {
        activeRoute = {
          ...parsed,
          onUpdateCallback: existingCb,
        };
      }
    }
  } catch {
    // ignore
  }

  if (activeRoute) {
    const elapsedSec = Math.max(1, Math.floor((Date.now() - activeRoute.startTime) / 1000));
    const hours = elapsedSec / 3600;
    const avgSpeed = hours > 0 && activeRoute.distanceKm > 0
      ? Number((activeRoute.distanceKm / hours).toFixed(1))
      : 0;
    return {
      isTracking: true,
      vehicleId: activeRoute.vehicleId,
      startTime: activeRoute.startTime,
      elapsedSeconds: elapsedSec,
      distanceKm: activeRoute.distanceKm,
      currentSpeedKmh: 0,
      maxSpeedKmh: activeRoute.maxSpeedKmh,
      avgSpeedKmh: avgSpeed,
      currentAltitudeM: activeRoute.coordinates[activeRoute.coordinates.length - 1]?.altitude ?? null,
      elevationGainM: activeRoute.elevationGainM,
      elevationLossM: activeRoute.elevationLossM,
      coordinatesCount: activeRoute.coordinates.length,
      coordinates: activeRoute.coordinates,
    };
  }

  return null;
}
