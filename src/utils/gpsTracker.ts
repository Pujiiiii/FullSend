import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export const GPS_ROUTE_TASK = 'STATSTRACKER_GPS_ROUTE_TASK';
const ACTIVE_ROUTE_STORAGE_KEY = '@statstracker_active_gps_route';

export interface RouteTrackingState {
  isTracking: boolean;
  startTime: number; // timestamp in ms
  elapsedSeconds: number;
  distanceKm: number;
  currentSpeedKmh: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
}

interface StoredRouteData {
  startTime: number;
  distanceKm: number;
  maxSpeedKmh: number;
  lastCoords: Location.LocationObjectCoords | null;
  lastTimestamp: number;
}

// Distance calculation using Haversine formula (km)
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

// Active singleton route state
let activeRoute: {
  startTime: number;
  distanceKm: number;
  maxSpeedKmh: number;
  lastCoords: Location.LocationObjectCoords | null;
  lastTimestamp: number;
  onUpdateCallback: ((state: RouteTrackingState) => void) | null;
} | null = null;

// Save route snapshot to storage for resilience against OS memory cleanups
async function persistRouteState() {
  if (!activeRoute) return;
  const snapshot: StoredRouteData = {
    startTime: activeRoute.startTime,
    distanceKm: activeRoute.distanceKm,
    maxSpeedKmh: activeRoute.maxSpeedKmh,
    lastCoords: activeRoute.lastCoords,
    lastTimestamp: activeRoute.lastTimestamp,
  };
  try {
    await AsyncStorage.setItem(ACTIVE_ROUTE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Error saving GPS snapshot:', e);
  }
}

// Define background task (runs even when phone is locked / screen off)
TaskManager.defineTask(GPS_ROUTE_TASK, async ({ data, error }) => {
  if (error || !data) {
    return;
  }

  // If memory was cleared while screen was off, restore from storage
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

  for (const loc of locations) {
    processLocationUpdate(loc);
  }

  await persistRouteState();
});

export function processLocationUpdate(loc: Location.LocationObject) {
  if (!activeRoute) return;

  const coords = loc.coords;

  // 1. Accuracy filter: ignore GPS fixes with poor precision (> 35 meters)
  if (coords.accuracy !== null && coords.accuracy !== undefined && coords.accuracy > 35) {
    return;
  }

  // 2. Hardware GPS speed (Doppler)
  const hardwareSpeed = coords.speed !== null && coords.speed !== undefined && coords.speed >= 0
    ? coords.speed * 3.6
    : 0;

  // 3. Coordinate distance & segment speed calculation
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

    // Anti-teleportation filter: reject GPS jump spikes (> 230 km/h)
    if (segmentSpeed <= 230) {
      // Ignore stationary jitter (< 4 meters)
      if (dist >= 0.004) {
        activeRoute.distanceKm = Number((activeRoute.distanceKm + dist).toFixed(2));
      }
    } else {
      // Discard spike jump, only update baseline position
      activeRoute.lastCoords = coords;
      activeRoute.lastTimestamp = loc.timestamp;
      return;
    }
  }

  // 4. Effective speed determination (combining hardware speed and segment speed)
  // When mobile is locked, hardware speed is sometimes reported as 0 by power savers, so segmentSpeed acts as reliable fallback
  let effectiveSpeed = hardwareSpeed > 0 ? hardwareSpeed : segmentSpeed;
  if (effectiveSpeed > 230) effectiveSpeed = 0;

  const roundedSpeed = Math.round(effectiveSpeed);

  // Update max speed (with realistic vehicle cap)
  if (roundedSpeed > activeRoute.maxSpeedKmh && roundedSpeed <= 230) {
    activeRoute.maxSpeedKmh = roundedSpeed;
  }

  activeRoute.lastCoords = coords;
  activeRoute.lastTimestamp = loc.timestamp;

  // 5. Real-world elapsed time (wall-clock based)
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
      currentSpeedKmh: roundedSpeed,
      maxSpeedKmh: activeRoute.maxSpeedKmh,
      avgSpeedKmh: avgSpeed,
    });
  }
}

export async function startGpsTracking(
  onUpdate: (state: RouteTrackingState) => void,
  keepScreenAwake = true
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
      startTime: now,
      distanceKm: 0,
      maxSpeedKmh: 0,
      lastCoords: null,
      lastTimestamp: now,
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
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(GPS_ROUTE_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 4, // 4 meters
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'StatsTracker • Gravant trajecte',
          notificationBody: 'Mesurant distància, velocitat màxima i temps...',
          notificationColor: '#6366F1',
          killServiceOnDestroy: false,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error iniciant GPS' };
  }
}

export async function stopGpsTracking(): Promise<{
  distance_km: number;
  duration_seconds: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
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

  // Restore snapshot if needed
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
    return { distance_km: 0, duration_seconds: 0, max_speed_kmh: 0, avg_speed_kmh: 0 };
  }

  // Exact real-world elapsed time
  const totalElapsedSec = Math.max(1, Math.floor((Date.now() - snapshot.startTime) / 1000));
  const hours = totalElapsedSec / 3600;
  const finalAvgSpeed = hours > 0 && snapshot.distanceKm > 0
    ? Number((snapshot.distanceKm / hours).toFixed(1))
    : 0;

  return {
    distance_km: snapshot.distanceKm,
    duration_seconds: totalElapsedSec,
    max_speed_kmh: snapshot.maxSpeedKmh,
    avg_speed_kmh: finalAvgSpeed,
  };
}

export async function checkActiveRouteOnStartup(): Promise<RouteTrackingState | null> {
  if (activeRoute) {
    const elapsedSec = Math.max(1, Math.floor((Date.now() - activeRoute.startTime) / 1000));
    const hours = elapsedSec / 3600;
    const avgSpeed = hours > 0 && activeRoute.distanceKm > 0
      ? Number((activeRoute.distanceKm / hours).toFixed(1))
      : 0;
    return {
      isTracking: true,
      startTime: activeRoute.startTime,
      elapsedSeconds: elapsedSec,
      distanceKm: activeRoute.distanceKm,
      currentSpeedKmh: 0,
      maxSpeedKmh: activeRoute.maxSpeedKmh,
      avgSpeedKmh: avgSpeed,
    };
  }

  try {
    const stored = await AsyncStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY);
    if (stored) {
      const parsed: StoredRouteData = JSON.parse(stored);
      activeRoute = {
        ...parsed,
        onUpdateCallback: null,
      };
      const elapsedSec = Math.max(1, Math.floor((Date.now() - parsed.startTime) / 1000));
      const hours = elapsedSec / 3600;
      const avgSpeed = hours > 0 && parsed.distanceKm > 0
        ? Number((parsed.distanceKm / hours).toFixed(1))
        : 0;
      return {
        isTracking: true,
        startTime: parsed.startTime,
        elapsedSeconds: elapsedSec,
        distanceKm: parsed.distanceKm,
        currentSpeedKmh: 0,
        maxSpeedKmh: parsed.maxSpeedKmh,
        avgSpeedKmh: avgSpeed,
      };
    }
  } catch {
    // ignore
  }

  return null;
}
