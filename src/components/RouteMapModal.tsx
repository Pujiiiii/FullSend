import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import { GpsPoint, MapTheme, RouteMetadata } from '../types/database';

interface RouteMapModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  themeColor?: string;
  metadata?: RouteMetadata | Record<string, any>;
  distanceKm?: number;
}

export const RouteMapModal: React.FC<RouteMapModalProps> = ({
  visible,
  onClose,
  title = 'Ruta GPS',
  themeColor = Colors.primary,
  metadata,
  distanceKm,
}) => {
  const [activeTheme] = useState<MapTheme>(
    metadata?.map_theme || 'dark_road'
  );

  const coordinates: GpsPoint[] = metadata?.coordinates || [];
  const totalDist = metadata?.distance_km ?? distanceKm ?? 0;
  const durationSec = metadata?.duration_seconds ?? 0;
  const maxSpeed = metadata?.max_speed_kmh ?? 0;
  const avgSpeed = metadata?.avg_speed_kmh ?? 0;
  const elevationGain = metadata?.elevation_gain_m ?? 0;
  const elevationLoss = metadata?.elevation_loss_m ?? 0;
  const maxAltitude = metadata?.max_altitude_m ?? null;
  const minAltitude = metadata?.min_altitude_m ?? null;

  // Format duration into hh:mm:ss
  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Generate self-contained HTML for Leaflet + Elevation Profile
  // Uses Leaflet 1.9.4 (zero WebGL) with dual CDN fallback for bulletproof Android compat
  const generateMapHtml = () => {
    const safeCoords = JSON.stringify(
      coordinates.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        alt: p.altitude ?? 0,
        spd: p.speed ?? 0,
        ts: p.timestamp,
      }))
    );

    const safeTheme = activeTheme;
    const safeColor = themeColor || '#6366F1';

    return `
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
      background: #0B1120;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    }
    #viewport-container {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      perspective: 900px;
    }
    #map {
      width: 100%;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      transform-origin: center 80%;
    }
    .tilt-3d {
      transform: rotateX(32deg) scale(1.12);
    }
    /* Snow mountain theme tile styling */
    .snow-mountain-layer {
      filter: brightness(1.2) contrast(1.15) saturate(0.2) hue-rotate(185deg);
    }
    /* Dark Road OSM invert */
    .osm-dark-tiles {
      filter: invert(92%) hue-rotate(180deg) brightness(85%) contrast(110%);
    }
    /* Floating HUD controls on top right */
    .hud-controls {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hud-btn {
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #F8FAFC;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    }
    .hud-btn.active {
      border-color: #6366F1;
      background: rgba(99, 102, 241, 0.45);
      color: #FFFFFF;
    }
    /* Custom Pin Badges */
    .pin-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      font-size: 15px;
    }
    .pin-start { background: #10B981; }
    .pin-end { background: #EF4444; }
    .pin-peak { background: #8B5CF6; }
    /* Elevation profile chart container */
    #chart-container {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      padding: 10px 14px;
      z-index: 1000;
      box-shadow: 0 6px 20px rgba(0,0,0,0.6);
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .chart-title {
      font-size: 11px;
      font-weight: 800;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .chart-cur-info {
      font-size: 11px;
      font-weight: 700;
      color: #38BDF8;
    }
    #elevationCanvas {
      width: 100%;
      height: 65px;
      display: block;
      cursor: crosshair;
    }
    .leaflet-control-container {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="viewport-container">
    <div id="map"></div>

    <!-- Floating HUD controls -->
    <div class="hud-controls">
      <button id="tiltBtn" class="hud-btn" onclick="toggle3D()">
        <span id="tiltIcon">🏔️</span> <span id="tiltText">Perspectiva 3D</span>
      </button>
      <button id="themeBtn" class="hud-btn" onclick="cycleTheme()">
        <span id="themeIcon">🎨</span> <span id="themeText">Canviar estil</span>
      </button>
      <button class="hud-btn" onclick="fitRouteBounds()">
        <span>🎯</span> <span>Centrar</span>
      </button>
    </div>

    <!-- Elevation Profile Canvas -->
    <div id="chart-container" style="display: none;">
      <div class="chart-header">
        <span class="chart-title">📈 Perfil Altimètric (Altitud vs Distància)</span>
        <span id="curElevationText" class="chart-cur-info">Toca el gràfic per explorar</span>
      </div>
      <canvas id="elevationCanvas" width="600" height="130"></canvas>
    </div>
  </div>

  <script>
    // Dual CDN fallback for Leaflet
    function loadLeaflet(cb) {
      if (window.L) { cb(); return; }
      var s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s1.onload = function() { cb(); };
      s1.onerror = function() {
        var s2 = document.createElement('script');
        s2.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s2.onload = function() { cb(); };
        s2.onerror = function() {};
        document.head.appendChild(s2);
      };
      document.head.appendChild(s1);
    }

    var coords = ${safeCoords};
    var currentTheme = '${safeTheme}';
    var is3D = false;
    var map;
    var currentTileLayer;
    var cursorMarker = null;

    // Tile Layer URL Providers (100% Free, Zero API Keys)
    var tileProviders = {
      dark_road: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 19 },
        className: 'osm-dark-tiles'
      },
      snow_mountain: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        options: { maxZoom: 18 },
        className: 'snow-mountain-layer'
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: { maxZoom: 19 },
        className: ''
      },
      streets: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 19 },
        className: ''
      }
    };

    function initMap() {
      var defaultCenter = coords.length > 0 ? [coords[0].lat, coords[0].lng] : [42.0, 1.5];
      var defaultZoom = coords.length > 0 ? 14 : 9;

      map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView(defaultCenter, defaultZoom);

      applyTileLayer(currentTheme);

      // Force recalculate after init
      setTimeout(function() {
        map.invalidateSize({ animate: false });
      }, 100);

      if (coords.length > 1) {
        drawRoute();
        initElevationProfile();
      }
    }

    function applyTileLayer(themeKey) {
      if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
      }
      var provider = tileProviders[themeKey] || tileProviders.dark_road;
      currentTileLayer = L.tileLayer(provider.url, {
        ...provider.options,
        className: provider.className
      }).addTo(map);

      // Update button visual
      var themeBtn = document.getElementById('themeBtn');
      if (themeKey === 'snow_mountain') {
        themeBtn.innerHTML = '<span>❄️</span> <span>Muntanya Neu</span>';
      } else if (themeKey === 'satellite') {
        themeBtn.innerHTML = '<span>🛰️</span> <span>Satèl·lit</span>';
      } else {
        themeBtn.innerHTML = '<span>🌙</span> <span>Carretera Dark</span>';
      }
    }

    function drawRoute() {
      var latLngs = coords.map(function(p) { return [p.lat, p.lng]; });

      // Glowing outer shadow polyline
      var glowColor = currentTheme === 'snow_mountain' ? '#0284C7' : '${safeColor}';
      L.polyline(latLngs, {
        color: glowColor,
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Core crisp polyline
      var coreColor = currentTheme === 'snow_mountain' ? '#38BDF8' : '#60A5FA';
      var routeLine = L.polyline(latLngs, {
        color: coreColor,
        weight: 4,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map bounds
      map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

      // Start pin (🟢)
      var startIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div class="pin-badge pin-start">🏁</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker(latLngs[0], { icon: startIcon })
        .bindPopup('<b>🟢 Inici del trajecte</b>')
        .addTo(map);

      // End pin (🏁)
      var endIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div class="pin-badge pin-end">🏁</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      L.marker(latLngs[latLngs.length - 1], { icon: endIcon })
        .bindPopup('<b>🏁 Final del trajecte</b>')
        .addTo(map);

      // Peak altitude pin (⛰️)
      var maxAlt = -Infinity;
      var peakIdx = -1;
      coords.forEach(function(p, i) {
        if (p.alt && p.alt > maxAlt) {
          maxAlt = p.alt;
          peakIdx = i;
        }
      });

      if (peakIdx > 0 && maxAlt > 0) {
        var peakIcon = L.divIcon({
          className: 'custom-pin',
          html: '<div class="pin-badge pin-peak">⛰️</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });
        L.marker([coords[peakIdx].lat, coords[peakIdx].lng], { icon: peakIcon })
          .bindPopup('<b>⛰️ Cota Màxima:</b> ' + Math.round(maxAlt) + ' m')
          .addTo(map);
      }
    }

    function fitRouteBounds() {
      if (coords.length > 1) {
        var latLngs = coords.map(function(p) { return [p.lat, p.lng]; });
        var bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    }

    function toggle3D() {
      is3D = !is3D;
      var mapEl = document.getElementById('map');
      var tiltBtn = document.getElementById('tiltBtn');
      if (is3D) {
        mapEl.classList.add('tilt-3d');
        tiltBtn.classList.add('active');
        document.getElementById('tiltIcon').innerText = '🗺️';
        document.getElementById('tiltText').innerText = 'Vista 2D';
      } else {
        mapEl.classList.remove('tilt-3d');
        tiltBtn.classList.remove('active');
        document.getElementById('tiltIcon').innerText = '🏔️';
        document.getElementById('tiltText').innerText = 'Perspectiva 3D';
      }
      setTimeout(function() { map.invalidateSize(); }, 350);
    }

    function cycleTheme() {
      if (currentTheme === 'dark_road') {
        currentTheme = 'snow_mountain';
      } else if (currentTheme === 'snow_mountain') {
        currentTheme = 'satellite';
      } else {
        currentTheme = 'dark_road';
      }
      applyTileLayer(currentTheme);
    }

    // Interactive Elevation Profile Chart
    function initElevationProfile() {
      var altitudes = coords.map(function(c) { return c.alt || 0; });
      var validAlts = altitudes.filter(function(a) { return a > 0; });
      if (validAlts.length < 5) return; // not enough altitude data

      var chartContainer = document.getElementById('chart-container');
      chartContainer.style.display = 'block';

      var canvas = document.getElementById('elevationCanvas');
      var ctx = canvas.getContext('2d');
      var W = canvas.width;
      var H = canvas.height;

      var minA = Math.min(...validAlts) - 20;
      var maxA = Math.max(...validAlts) + 20;
      var rangeA = Math.max(1, maxA - minA);

      function drawProfile(highlightIdx) {
        ctx.clearRect(0, 0, W, H);

        // Gradient under altitude curve
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        if (currentTheme === 'snow_mountain') {
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
          grad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
        } else {
          grad.addColorStop(0, 'rgba(99, 102, 241, 0.6)');
          grad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
        }

        ctx.beginPath();
        coords.forEach(function(p, i) {
          var x = (i / (coords.length - 1)) * W;
          var alt = p.alt || minA;
          var y = H - ((alt - minA) / rangeA) * (H - 24) - 12;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        // Close path for area gradient fill
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        coords.forEach(function(p, i) {
          var x = (i / (coords.length - 1)) * W;
          var alt = p.alt || minA;
          var y = H - ((alt - minA) / rangeA) * (H - 24) - 12;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = currentTheme === 'snow_mountain' ? '#38BDF8' : '#818CF8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Highlight active point if tapped/hovered
        if (highlightIdx !== undefined && highlightIdx >= 0 && highlightIdx < coords.length) {
          var hx = (highlightIdx / (coords.length - 1)) * W;
          var hAlt = coords[highlightIdx].alt || minA;
          var hy = H - ((hAlt - minA) / rangeA) * (H - 24) - 12;

          // Vertical guideline
          ctx.beginPath();
          ctx.moveTo(hx, 0);
          ctx.lineTo(hx, H);
          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Dot
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      drawProfile();

      // Touch / mouse scrub interaction on elevation canvas
      function handleScrub(e) {
        var rect = canvas.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        var idx = Math.round(ratio * (coords.length - 1));
        var targetPoint = coords[idx];

        if (targetPoint) {
          drawProfile(idx);

          // Update label
          var spdText = targetPoint.spd ? ' • ' + Math.round(targetPoint.spd) + ' km/h' : '';
          var altText = targetPoint.alt ? Math.round(targetPoint.alt) + ' m' : '--';
          document.getElementById('curElevationText').innerText = '📍 Alt: ' + altText + spdText;

          // Move cursor marker on map
          if (!cursorMarker) {
            var pulseIcon = L.divIcon({
              className: 'pulse-icon',
              html: '<div style="width:16px;height:16px;border-radius:50%;background:#F43F5E;border:2px solid #fff;box-shadow:0 0 10px #F43F5E;"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            cursorMarker = L.marker([targetPoint.lat, targetPoint.lng], { icon: pulseIcon }).addTo(map);
          } else {
            cursorMarker.setLatLng([targetPoint.lat, targetPoint.lng]);
          }
        }
      }

      canvas.addEventListener('touchstart', handleScrub, { passive: true });
      canvas.addEventListener('touchmove', handleScrub, { passive: true });
      canvas.addEventListener('mousemove', function(e) {
        if (e.buttons === 1) handleScrub(e);
      });
    }

    // Boot: run as soon as Leaflet script loads
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
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          {/* Top Bar with Title & Close button */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.themeIconCircle,
                  {
                    backgroundColor:
                      activeTheme === 'snow_mountain' ? '#0284C7' : themeColor,
                  },
                ]}
              >
                <Ionicons
                  name={activeTheme === 'snow_mountain' ? 'snow' : 'car-sport'}
                  size={18}
                  color="#FFFFFF"
                />
              </View>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {activeTheme === 'snow_mountain'
                    ? 'Estil Neu i Relleu Alpí'
                    : 'Estil Carretera Dark'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsBar}>
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>{totalDist} km</Text>
              <Text style={styles.metricSub}>Distància</Text>
            </View>

            {durationSec > 0 && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={styles.metricVal}>{formatDuration(durationSec)}</Text>
                  <Text style={styles.metricSub}>Temps</Text>
                </View>
              </>
            )}

            {maxSpeed > 0 && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={styles.metricVal}>{maxSpeed} km/h</Text>
                  <Text style={styles.metricSub}>Vel. punta</Text>
                </View>
              </>
            )}

            {elevationGain > 0 && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={[styles.metricVal, { color: '#10B981' }]}>
                    +{elevationGain} m
                  </Text>
                  <Text style={styles.metricSub}>+D Acumulat</Text>
                </View>
              </>
            )}

            {elevationLoss > 0 && (
              <>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={[styles.metricVal, { color: '#F43F5E' }]}>
                    -{elevationLoss} m
                  </Text>
                  <Text style={styles.metricSub}>-D Baixada</Text>
                </View>
              </>
            )}
          </View>

          {/* Interactive Map WebView */}
          <View style={styles.mapContainer}>
            {coordinates.length > 0 ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: generateMapHtml(), baseUrl: 'https://cdnjs.cloudflare.com' }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mixedContentMode="always"
                scrollEnabled={false}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
              />
            ) : (
              <View style={styles.noRouteContainer}>
                <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.noRouteTitle}>No hi ha coordenades GPS</Text>
                <Text style={styles.noRouteSub}>
                  Aquest registre es va introduir manualment o el dispositiu no tenia senyal GPS.
                </Text>
              </View>
            )}
          </View>

          {/* Footer Info if elevation or coordinates exist */}
          {coordinates.length > 0 && (maxAltitude !== null || minAltitude !== null) && (
            <View style={styles.footerAltitudeRow}>
              {maxAltitude !== null && (
                <Text style={styles.footerAltText}>
                  🏔️ Cota màx: <Text style={styles.footerAltBold}>{maxAltitude} m</Text>
                </Text>
              )}
              {minAltitude !== null && (
                <Text style={styles.footerAltText}>
                  📉 Cota mín: <Text style={styles.footerAltBold}>{minAltitude} m</Text>
                </Text>
              )}
              {avgSpeed > 0 && (
                <Text style={styles.footerAltText}>
                  🚗 Mitjana: <Text style={styles.footerAltBold}>{avgSpeed} km/h</Text>
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  themeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  metricCol: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  metricSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#334155',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  noRouteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  noRouteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  noRouteSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerAltitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  footerAltText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footerAltBold: {
    fontWeight: '800',
    color: '#F8FAFC',
  },
});
