import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { CustomAlertModal, CustomAlertOptions } from '../../components/CustomAlertModal';

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
  const [mapTheme, setMapTheme] = useState<'dark_road' | 'snow_mountain' | 'satellite' | 'streets'>('dark_road');
  const [is3D, setIs3D] = useState(true);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState<CustomAlertOptions>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (options: Omit<CustomAlertOptions, 'visible'>) => {
    setAlertConfig({ ...options, visible: true });
  };

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapReadyRef = useRef<boolean>(false);
  const lastCoordsRef = useRef<Location.LocationObjectCoords | null>(null);

  const sendLocationToMap = (
    coords: Location.LocationObjectCoords,
    recording: boolean,
    vehicleIcon?: string
  ) => {
    lastCoordsRef.current = coords;
    if (!webViewRef.current || !mapReadyRef.current) return;

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
      if (status !== 'granted') {
        showAlert({
          title: 'Permís de localització necessari',
          message: 'Full Send necessita el permís de GPS per mostrar el mapa i registrar la teva telemetria.',
          type: 'warning',
        });
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lastCoordsRef.current = loc.coords;
        if (loc.coords.altitude !== null) {
          setCurrentAltM(Math.round(loc.coords.altitude));
        }
        sendLocationToMap(loc.coords, false);
      } catch (e) {
        console.warn('Initial location error:', e);
      }

      // Watch live location for idle player avatar movement
      try {
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 2,
          },
          (update) => {
            lastCoordsRef.current = update.coords;
            if (update.coords.altitude !== null) {
              setCurrentAltM(Math.round(update.coords.altitude));
            }
            if (!isRecording) {
              sendLocationToMap(update.coords, false);
            }
          }
        );
      } catch (e) {
        console.warn('Watch location error:', e);
      }
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
      showAlert({
        title: 'Cap vehicle actiu',
        message: 'Afegeix o selecciona una màquina al teu Garatge abans de prémer SEND IT ⚡.',
        type: 'warning',
      });
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

        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((loc) => {
          sendLocationToMap(loc.coords, true, selectedVehicle.icon);
        }).catch(() => {});
      },
      themeToUse,
      true
    );

    if (!res.success) {
      showAlert({
        title: 'Error GPS',
        message: res.error || 'No s\'ha pogut connectar amb el GPS.',
        type: 'error',
      });
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
    }).catch(() => {});
  };

  const handleStopSendIt = async () => {
    showAlert({
      title: 'Finalitzar sessió? 🏁',
      message: `Has recorregut ${distanceKm} km amb una velocitat punta de ${maxSpeedKmh} km/h. Vols desar aquest trajecte?`,
      type: 'info',
      primaryText: 'Desar trajecte',
      secondaryText: 'Continuar gravant',
      onPrimary: async () => {
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

        showAlert({
          title: 'Full Send Completat! ⚡',
          message: `Trajecte de ${routeResult.distance_km} km desat correctament al teu historial.`,
          type: 'success',
        });

        // Revert avatar to person
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
          sendLocationToMap(loc.coords, false);
        }).catch(() => {});
      },
    });
  };

  const cycleTheme = () => {
    const next =
      mapTheme === 'dark_road'
        ? 'snow_mountain'
        : mapTheme === 'snow_mountain'
        ? 'satellite'
        : mapTheme === 'satellite'
        ? 'streets'
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
    if (lastCoordsRef.current) {
      sendLocationToMap(lastCoordsRef.current, isRecording);
    }
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'RECENTER' })
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_LOADED') {
        mapReadyRef.current = true;
        if (lastCoordsRef.current) {
          sendLocationToMap(lastCoordsRef.current, isRecording);
        }
      }
    } catch {}
  };

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pokémon GO Style 3D Perspective Map HTML (Leaflet 1.9.4, 100% Android WebView compatible)
  const mapHtmlSource = useMemo(() => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #090D16;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }
    #viewport-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      overflow: hidden;
      perspective: 750px;
      perspective-origin: 50% 65%;
      background: #090D16;
    }
    #map {
      width: 100%;
      height: 125%;
      position: absolute;
      top: -12%;
      left: 0;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: 50% 65%;
      transform: rotateX(40deg) scale(1.15);
      background: #090D16;
    }
    #viewport-container.mode-2d #map {
      transform: rotateX(0deg) scale(1);
      height: 100%;
      top: 0;
    }
    /* Dark Road Theme (OSM tiles inverted to sleek Midnight Dark) */
    .osm-dark-tiles {
      filter: invert(92%) hue-rotate(180deg) brightness(85%) contrast(110%);
    }
    /* Alpine Snow Theme */
    .snow-topo-tiles {
      filter: brightness(1.1) contrast(1.1) saturate(0.25) hue-rotate(180deg);
    }
    /* Avatar: Clean circle standing upright in 3D (Sense cap anell brillant) */
    .avatar-container {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
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
      box-shadow: 0 4px 14px rgba(0,0,0,0.85);
      font-size: 22px;
      z-index: 2;
      transform: rotateX(-40deg); /* Counter-rotate so avatar stands upright */
    }
    #viewport-container.mode-2d .avatar-bubble {
      transform: rotateX(0deg);
    }
    .avatar-pointer {
      position: absolute;
      top: -7px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 9px solid #CCFF00;
      z-index: 3;
      transform-origin: 50% 28px;
    }
    /* Hide Leaflet default attribution and controls for clean cockpit */
    .leaflet-control-container {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="viewport-container">
    <div id="map"></div>
  </div>

  <script>
    var map = null;
    var playerMarker = null;
    var trailGlow = null;
    var trailCore = null;
    var currentTheme = 'dark_road';
    var is3D = true;
    var followMode = true;
    var pendingLocation = null;

    // Tile Layer Definitions (100% Free, Zero API Keys, Reliable Worldwide)
    var layers = {
      dark_road: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'osm-dark-tiles'
      }),
      snow_mountain: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        className: 'snow-topo-tiles'
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }),
      streets: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      })
    };

    function initMap() {
      if (map) return;
      try {
        map = L.map('map', {
          center: [41.3851, 2.1734],
          zoom: 16,
          zoomControl: false,
          attributionControl: false
        });

        // Add active tile theme
        layers[currentTheme].addTo(map);

        // Glowing live route trail
        trailGlow = L.polyline([], {
          color: '#CCFF00',
          weight: 8,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        trailCore = L.polyline([], {
          color: '#E2F952',
          weight: 4,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        createAvatarMarker([41.3851, 2.1734]);

        map.on('dragstart', function() {
          followMode = false;
        });

        // Invalidate size to guarantee tile rendering
        setTimeout(function() {
          if (map) map.invalidateSize();
        }, 150);
        setTimeout(function() {
          if (map) map.invalidateSize();
        }, 600);

        // If pending location was received before map ready, apply now
        if (pendingLocation) {
          updatePlayer(pendingLocation);
          pendingLocation = null;
        }

        // Notify React Native that map is ready
        sendToNative({ type: 'MAP_LOADED' });
      } catch(e) {
        sendToNative({ type: 'MAP_ERROR', error: String(e) });
      }
    }

    function sendToNative(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function createAvatarMarker(latLng) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="avatar-container"><div class="avatar-pointer"></div><div class="avatar-bubble"><span id="avatarIcon">🧍</span></div></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      playerMarker = L.marker(latLng, { icon: icon }).addTo(map);
    }

    function updatePlayer(data) {
      if (!map) {
        pendingLocation = data;
        return;
      }
      var latLng = [data.lat, data.lng];

      if (!playerMarker) {
        createAvatarMarker(latLng);
      } else {
        playerMarker.setLatLng(latLng);
      }

      // Rotate directional arrow pointer
      var pointerEl = document.querySelector('.avatar-pointer');
      if (pointerEl && data.heading !== undefined) {
        pointerEl.style.transform = 'rotate(' + data.heading + 'deg)';
      }

      // Transform avatar: Person when idle, Machine when recording
      var iconEl = document.getElementById('avatarIcon');
      if (iconEl) {
        iconEl.innerText = data.isRecording ? (data.vehicleIcon || '🏎️') : '🧍';
      }

      // Live glowing trail
      if (data.isRecording) {
        trailGlow.addLatLng(latLng);
        trailCore.addLatLng(latLng);
      } else {
        if (trailGlow.getLatLngs().length > 0) {
          trailGlow.setLatLngs([]);
          trailCore.setLatLngs([]);
        }
      }

      // Follow mode camera
      if (followMode) {
        map.panTo(latLng, { animate: true, duration: 0.8 });
      }
    }

    function recenterOnPlayer() {
      followMode = true;
      if (playerMarker && map) {
        map.setView(playerMarker.getLatLng(), 16.5, { animate: true });
      }
    }

    function applyTheme(themeKey) {
      if (!map || !layers[themeKey]) return;
      map.eachLayer(function(l) {
        if (l === layers.dark_road || l === layers.snow_mountain || l === layers.satellite || l === layers.streets) {
          map.removeLayer(l);
        }
      });
      layers[themeKey].addTo(map);
      currentTheme = themeKey;
    }

    function toggle3D(val) {
      is3D = val;
      var vp = document.getElementById('viewport-container');
      if (vp) {
        vp.className = is3D ? '' : 'mode-2d';
      }
      setTimeout(function() {
        if (map) map.invalidateSize();
      }, 300);
    }

    function handleIncomingMessage(event) {
      var raw = event.data;
      if (!raw) return;
      try {
        var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
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
    }

    window.addEventListener('message', handleIncomingMessage);
    document.addEventListener('message', handleIncomingMessage);

    // Infallible polling boot: runs the instant Leaflet script loads
    function boot() {
      if (typeof L !== 'undefined' && document.getElementById('map')) {
        initMap();
      } else {
        setTimeout(boot, 40);
      }
    }
    boot();
  </script>
</body>
</html>
    `;
    return { html };
  }, []);

  return (
    <View style={styles.container}>
      {/* 3D Map Viewport */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtmlSource.html, baseUrl: 'https://cdnjs.cloudflare.com' }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        androidHardwareAccelerationDisabled={false}
        scrollEnabled={false}
        onMessage={handleWebViewMessage}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        onError={() => {}}
        onHttpError={() => {}}
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
              name={
                mapTheme === 'snow_mountain'
                  ? 'snow'
                  : mapTheme === 'satellite'
                  ? 'globe'
                  : mapTheme === 'streets'
                  ? 'map'
                  : 'moon'
              }
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.hudCircleBtn, is3D && styles.hudBtnActive]}
            onPress={toggle3DMode}
          >
            <Text style={[styles.hudTextIcon, is3D && { color: '#090D16' }]}>3D</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hudCircleBtn} onPress={recenter}>
            <Ionicons name="locate" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Telemetry Cockpit Overlay */}
      <View style={styles.telemetryOverlay}>
        {/* Live Speedometer */}
        <View style={styles.speedBox}>
          <Text style={styles.speedNumber}>{speedKmh}</Text>
          <Text style={styles.speedLabel}>KM/H</Text>
        </View>

        {/* Live Stats Bar while recording */}
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
            <Ionicons name="stop-circle" size={24} color="#FFFFFF" />
            <Text style={styles.stopText}>FINALITZAR 🏁</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Vehicle / Machine Picker Modal */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVehicleModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tria la teva Màquina</Text>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
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
        </TouchableOpacity>
      </Modal>

      {/* Full Send Glassmorphic Alert Modal */}
      <CustomAlertModal
        config={alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
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
  hudBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
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
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  sendItContainer: {
    position: 'absolute',
    bottom: 96, // Positioned right above the floating bottom dock
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
    borderRadius: 28,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    width: '80%',
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
    borderRadius: 28,
    gap: 10,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    width: '80%',
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
