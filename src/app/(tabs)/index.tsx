import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { Colors } from '../../utils/theme';
import {
  startGpsTracking,
  stopGpsTracking,
  checkActiveRouteOnStartup,
  RouteTrackingState,
} from '../../utils/gpsTracker';

export default function FullSendLiveScreen() {
  const { stats, addEntry } = useStats();
  const webViewRef = useRef<any>(null);

  // Vehicles from Garage (stats with type 'route')
  const vehicles = stats.filter((s) => s.type === 'route' && !s.is_archived);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;

  // Tracking and Telemetry State
  const [isRecording, setIsRecording] = useState(false);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [elevationGainM, setElevationGainM] = useState(0);
  const [currentAltM, setCurrentAltM] = useState<number | null>(null);
  const [mapTheme, setMapTheme] = useState<'dark_road' | 'snow_mountain' | 'satellite'>('dark_road');
  const [is3D, setIs3D] = useState(true);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocationToMap = (
    coords: Location.LocationObjectCoords,
    recording: boolean,
    vehicleIcon?: string
  ) => {
    if (!webViewRef.current) return;
    const msg = JSON.stringify({
      type: 'LOCATION_UPDATE',
      lng: coords.longitude,
      lat: coords.latitude,
      altitude: coords.altitude || 0,
      speed: coords.speed ? Math.max(0, Math.round(coords.speed * 3.6)) : 0,
      heading: coords.heading || 0,
      isRecording: recording,
      vehicleIcon: vehicleIcon || selectedVehicle?.icon || '🏎️',
      color: selectedVehicle?.color || Colors.primary,
    });
    webViewRef.current.postMessage(msg);
  };

  const startTimer = (startMs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
  };

  // Initial Location & Permission
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      sendLocationToMap(loc.coords, false);

      // Watch live location for idle player avatar movement
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (update) => {
          if (!isRecording) {
            sendLocationToMap(update.coords, false);
            if (update.coords.altitude !== null) {
              setCurrentAltM(Math.round(update.coords.altitude));
            }
          }
        }
      );
    })();

    // Check if a background route was already active
    checkActiveRouteOnStartup().then((existing) => {
      if (existing && existing.isTracking) {
        setIsRecording(true);
        setDistanceKm(existing.distanceKm);
        setMaxSpeedKmh(existing.maxSpeedKmh);
        setElevationGainM(existing.elevationGainM);
        startTimer(existing.startTime);
      }
    });

    return () => {
      if (sub) sub.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  const handleStartSendIt = async () => {
    if (!selectedVehicle) {
      Alert.alert(
        'Cap vehicle actiu',
        'Afegeix un vehicle al teu Garatge abans de començar.',
        [{ text: 'D\'acord' }]
      );
      return;
    }

    const themeToUse = /ski|esqu[ií]|snow|muntanya/i.test(selectedVehicle.name)
      ? 'snow_mountain'
      : 'dark_road';

    const res = await startGpsTracking(
      (state: RouteTrackingState) => {
        setDistanceKm(state.distanceKm);
        setSpeedKmh(state.currentSpeedKmh);
        setMaxSpeedKmh(state.maxSpeedKmh);
        setCurrentAltM(state.currentAltitudeM);
        setElevationGainM(state.elevationGainM);

        // Forward to map in real time
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((loc) => {
          sendLocationToMap(loc.coords, true, selectedVehicle.icon);
        });
      },
      themeToUse,
      true
    );

    if (!res.success) {
      Alert.alert('Error GPS', res.error || 'No s\'ha pogut connectar amb el GPS.');
      return;
    }

    const now = Date.now();
    setIsRecording(true);
    setDistanceKm(0);
    setSpeedKmh(0);
    setMaxSpeedKmh(0);
    setElevationGainM(0);
    setElapsedSec(0);
    startTimer(now);

    // Switch avatar to active vehicle on map
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((loc) => {
      sendLocationToMap(loc.coords, true, selectedVehicle.icon);
    });
  };

  const handleStopSendIt = async () => {
    Alert.alert(
      '🏁 Finalitzar sessió?',
      `Has recorregut ${distanceKm} km amb velocitat punta de ${maxSpeedKmh} km/h. Vols desar aquest trajecte?`,
      [
        { text: 'Continuar gravant', style: 'cancel' },
        {
          text: 'Finalitzar i desar',
          style: 'default',
          onPress: async () => {
            if (timerRef.current) clearInterval(timerRef.current);
            const routeResult = await stopGpsTracking();

            setIsRecording(false);
            setSpeedKmh(0);

            if (selectedVehicle) {
              await addEntry(
                selectedVehicle.id,
                routeResult.distance_km,
                `Sessió Full Send amb ${selectedVehicle.name}`,
                routeResult
              );
            }

            Alert.alert(
              '⚡ Full Send Completat!',
              `Trajecte de ${routeResult.distance_km} km desat al teu historial.`
            );

            // Revert avatar to person
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
              sendLocationToMap(loc.coords, false);
            });
          },
        },
      ]
    );
  };

  const cycleTheme = () => {
    const next =
      mapTheme === 'dark_road'
        ? 'snow_mountain'
        : mapTheme === 'snow_mountain'
        ? 'satellite'
        : 'dark_road';
    setMapTheme(next);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'SET_THEME', themeKey: next })
    );
  };

  const toggle3DMode = () => {
    const next3D = !is3D;
    setIs3D(next3D);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'SET_3D', is3D: next3D })
    );
  };

  const recenter = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'RECENTER' })
    );
  };

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Full Send MapLibre 3D Terrain HTML
  const generateLiveMapHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #090D16;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    }
    #map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    /* Avatar Styling: Persona en repòs, Vehicle en moviment */
    .avatar-wrapper {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease-out;
    }
    .avatar-bubble {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0F172A;
      border: 2.5px solid #CCFF00;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.8);
      font-size: 20px;
    }
    .avatar-direction-pointer {
      position: absolute;
      top: -6px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 9px solid #CCFF00;
    }
    .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    var map;
    var playerMarker = null;
    var avatarEl = null;
    var liveTrailCoords = [];
    var currentTheme = 'dark_road';
    var is3D = true;
    var followMode = true;

    var themeLayers = {
      dark_road: ['layer-dark-base', 'layer-dark-ref'],
      snow_mountain: ['layer-snow', 'layer-dark-ref'],
      satellite: ['layer-satellite']
    };

    function initMap() {
      map = new maplibregl.Map({
        container: 'map',
        style: {
          version: 8,
          sources: {
            // Free AWS Terrarium Elevation DEM for true 3D mountains
            'terrainSource': {
              type: 'raster-dem',
              tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
              encoding: 'terrarium',
              tileSize: 256,
              maxzoom: 15
            },
            'source-dark-base': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18
            },
            'source-dark-ref': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18
            },
            'source-snow': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18
            },
            'source-satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 19
            }
          },
          layers: [
            {
              id: 'layer-dark-base',
              type: 'raster',
              source: 'source-dark-base',
              layout: { visibility: 'visible' }
            },
            {
              id: 'layer-snow',
              type: 'raster',
              source: 'source-snow',
              layout: { visibility: 'none' },
              paint: {
                'raster-saturation': -0.7,
                'raster-contrast': 0.25,
                'raster-brightness-max': 1.15
              }
            },
            {
              id: 'layer-satellite',
              type: 'raster',
              source: 'source-satellite',
              layout: { visibility: 'none' }
            },
            {
              id: 'layer-dark-ref',
              type: 'raster',
              source: 'source-dark-ref',
              layout: { visibility: 'visible' }
            }
          ],
          terrain: {
            source: 'terrainSource',
            exaggeration: 1.55
          },
          sky: {
            'sky-color': '#090D16',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#0F172A',
            'fog-color': '#090D16'
          }
        },
        center: [1.5, 42.0],
        zoom: 14,
        pitch: 58,
        bearing: 0,
        maxPitch: 85
      });

      map.touchPitch.enable();
      map.touchZoomRotate.enable();

      map.on('dragstart', function() {
        followMode = false;
      });

      map.on('load', function() {
        // Source for live recorded route trail
        map.addSource('live-trail-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });

        map.addLayer({
          id: 'live-trail-glow',
          type: 'line',
          source: 'live-trail-source',
          paint: {
            'line-color': '#CCFF00',
            'line-width': 9,
            'line-opacity': 0.45,
            'line-blur': 3
          }
        });

        map.addLayer({
          id: 'live-trail-core',
          type: 'line',
          source: 'live-trail-source',
          paint: {
            'line-color': '#E2F952',
            'line-width': 4.5,
            'line-opacity': 1.0
          }
        });

        createAvatarMarker([1.5, 42.0]);
      });
    }

    function createAvatarMarker(lngLat) {
      avatarEl = document.createElement('div');
      avatarEl.className = 'avatar-wrapper';
      avatarEl.innerHTML = '<div class="avatar-direction-pointer"></div><div class="avatar-bubble"><span id="avatarIcon">🧍</span></div>';

      playerMarker = new maplibregl.Marker({ element: avatarEl })
        .setLngLat(lngLat)
        .addTo(map);
    }

    function updatePlayer(data) {
      if (!map) return;
      var lngLat = [data.lng, data.lat];

      if (!playerMarker) {
        createAvatarMarker(lngLat);
      } else {
        playerMarker.setLngLat(lngLat);
      }

      // Rotate avatar icon according to GPS heading
      if (avatarEl && data.heading !== undefined) {
        avatarEl.style.transform = 'rotate(' + data.heading + 'deg)';
      }

      // Change avatar: Person when idle, Vehicle when recording
      var iconEl = document.getElementById('avatarIcon');
      if (iconEl) {
        iconEl.innerText = data.isRecording ? (data.vehicleIcon || '🏎️') : '🧍';
      }

      // If recording, add to live glowing trail
      if (data.isRecording) {
        liveTrailCoords.push(lngLat);
        var src = map.getSource('live-trail-source');
        if (src) {
          src.setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: liveTrailCoords
            }
          });
        }
      } else {
        if (liveTrailCoords.length > 0) {
          liveTrailCoords = [];
          var src = map.getSource('live-trail-source');
          if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
        }
      }

      // Camera follow player in 3D perspective
      if (followMode) {
        map.easeTo({
          center: lngLat,
          pitch: is3D ? 58 : 0,
          bearing: data.heading || map.getBearing(),
          duration: 1000
        });
      }
    }

    function recenterOnPlayer() {
      followMode = true;
      if (playerMarker) {
        map.easeTo({
          center: playerMarker.getLngLat(),
          pitch: is3D ? 58 : 0,
          zoom: 15.5,
          duration: 800
        });
      }
    }

    function applyTheme(themeKey) {
      var all = ['layer-dark-base', 'layer-snow', 'layer-satellite', 'layer-dark-ref'];
      all.forEach(function(l) {
        if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'none');
      });
      var active = themeLayers[themeKey] || themeLayers.dark_road;
      active.forEach(function(l) {
        if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'visible');
      });
    }

    function toggle3D(val) {
      is3D = val;
      if (is3D) {
        map.setTerrain({ source: 'terrainSource', exaggeration: 1.55 });
        map.easeTo({ pitch: 58, duration: 800 });
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      }
    }

    window.addEventListener('message', function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'LOCATION_UPDATE') {
          updatePlayer(data);
        } else if (data.type === 'SET_THEME') {
          applyTheme(data.themeKey);
        } else if (data.type === 'SET_3D') {
          toggle3D(data.is3D);
        } else if (data.type === 'RECENTER') {
          recenterOnPlayer();
        }
      } catch(e) {}
    });

    window.onload = initMap;
  </script>
</body>
</html>
    `;
  };

  return (
    <View style={styles.container}>
      {/* 3D Map Viewport */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateLiveMapHtml() }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
      />

      {/* Top Floating Bar: Vehicle Selector & HUD Controls */}
      <View style={styles.topHud}>
        {/* Active Machine Pill */}
        <TouchableOpacity
          style={styles.vehiclePill}
          onPress={() => setVehicleModalVisible(true)}
        >
          <Text style={styles.vehicleIcon}>{selectedVehicle?.icon || '🏎️'}</Text>
          <View>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {selectedVehicle?.name || 'Selecciona Màquina'}
            </Text>
            <Text style={styles.vehicleSub}>
              {isRecording ? 'EN GRAVACIÓ 🔴' : 'Toca per canviar'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Action Controls */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity style={styles.hudCircleBtn} onPress={cycleTheme}>
            <Ionicons
              name={mapTheme === 'snow_mountain' ? 'snow' : mapTheme === 'satellite' ? 'globe' : 'moon'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.hudCircleBtn} onPress={toggle3DMode}>
            <Text style={styles.hudTextIcon}>{is3D ? '3D' : '2D'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hudCircleBtn} onPress={recenter}>
            <Ionicons name="navigate" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Telemetry Speedometer HUD (When moving or recording) */}
      {(isRecording || speedKmh > 5) && (
        <View style={styles.telemetryOverlay}>
          <View style={styles.speedBox}>
            <Text style={styles.speedNumber}>{speedKmh}</Text>
            <Text style={styles.speedLabel}>KM/H</Text>
          </View>

          {isRecording && (
            <View style={styles.statsStrip}>
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{distanceKm} km</Text>
                <Text style={styles.statSub}>Distància</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{formatTime(elapsedSec)}</Text>
                <Text style={styles.statSub}>Temps</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statVal}>{maxSpeedKmh} km/h</Text>
                <Text style={styles.statSub}>Punta</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: '#38BDF8' }]}>
                  {currentAltM !== null ? `${currentAltM}m` : '--'}
                </Text>
                <Text style={styles.statSub}>Cota</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={[styles.statVal, { color: '#10B981' }]}>
                  +{elevationGainM} m
                </Text>
                <Text style={styles.statSub}>+D</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Prominent Floating "SEND IT ⚡" / "STOP" Button */}
      <View style={styles.sendItContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={styles.sendItButton}
            activeOpacity={0.85}
            onPress={handleStartSendIt}
          >
            <Ionicons name="flash" size={24} color="#090D16" />
            <Text style={styles.sendItText}>SEND IT ⚡</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.stopButton}
            activeOpacity={0.85}
            onPress={handleStopSendIt}
          >
            <Ionicons name="stop" size={24} color="#FFFFFF" />
            <Text style={styles.stopText}>FINALITZAR 🏁</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Vehicle Selection Modal */}
      <Modal visible={vehicleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tria la teva Màquina</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.vehicleSelectItem,
                  selectedVehicle?.id === v.id && styles.vehicleSelected,
                ]}
                onPress={() => {
                  setSelectedVehicleId(v.id);
                  setVehicleModalVisible(false);
                }}
              >
                <Text style={styles.vehicleSelectIcon}>{v.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleSelectName}>{v.name}</Text>
                  {v.description ? (
                    <Text style={styles.vehicleSelectDesc}>{v.description}</Text>
                  ) : null}
                </View>
                {selectedVehicle?.id === v.id && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  webView: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  topHud: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    maxWidth: '58%',
  },
  vehicleIcon: {
    fontSize: 22,
  },
  vehicleName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  vehicleSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hudCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  hudTextIcon: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  telemetryOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 112 : 96,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  speedBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  speedNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -1,
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statSub: {
    fontSize: 9,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sendItContainer: {
    position: 'absolute',
    bottom: 96, // Sits comfortably above floating bottom tab bar
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  sendItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 32,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#E2F952',
    minWidth: '70%',
  },
  sendItText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 32,
    gap: 10,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    minWidth: '70%',
  },
  stopText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  vehicleSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vehicleSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
  },
  vehicleSelectIcon: {
    fontSize: 26,
  },
  vehicleSelectName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  vehicleSelectDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
