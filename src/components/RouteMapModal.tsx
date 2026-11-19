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

  // Generate self-contained HTML for MapLibre 3D Terrain + Elevation Profile
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
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
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
    #map {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    /* Floating HUD controls on top right */
    .hud-controls {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hud-btn {
      background: rgba(15, 23, 42, 0.9);
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
      background: rgba(99, 102, 241, 0.5);
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
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 16px;
      padding: 10px 14px;
      z-index: 100;
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
    .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Floating HUD controls -->
  <div class="hud-controls">
    <button id="tiltBtn" class="hud-btn active" onclick="toggle3D()">
      <span id="tiltIcon">🏔️</span> <span id="tiltText">Relleu 3D</span>
    </button>
    <button id="rotateBtn" class="hud-btn" onclick="rotateCamera()">
      <span>🔄</span> <span>Girar 3D</span>
    </button>
    <button id="themeBtn" class="hud-btn" onclick="cycleTheme()">
      <span id="themeIcon">🌙</span> <span id="themeText">Carretera Dark</span>
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

  <script>
    var coords = ${safeCoords};
    var currentTheme = '${safeTheme}';
    var is3D = true;
    var map;
    var cursorMarker = null;

    var defaultCenter = coords.length > 0 ? [coords[0].lng, coords[0].lat] : [1.5, 42.0];
    var defaultZoom = coords.length > 0 ? 13 : 9;

    var themeLayers = {
      dark_road: ['layer-dark-base', 'layer-dark-ref'],
      snow_mountain: ['layer-snow', 'layer-dark-ref'],
      satellite: ['layer-satellite'],
      osm_streets: ['layer-osm']
    };

    function initMap() {
      map = new maplibregl.Map({
        container: 'map',
        style: {
          version: 8,
          sources: {
            // Free AWS Open Data Terrarium 3D Elevation Mesh (Zero API Keys)
            'terrainSource': {
              type: 'raster-dem',
              tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
              encoding: 'terrarium',
              tileSize: 256,
              maxzoom: 15
            },
            // Esri Dark Gray Base (Free & No API Key)
            'source-dark-base': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18,
              attribution: '&copy; Esri &copy; OpenStreetMap'
            },
            // Esri Dark Gray Reference labels
            'source-dark-ref': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18
            },
            // Esri World Topo for Alpine & Snowy mountains
            'source-snow': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18,
              attribution: '&copy; Esri World Topo'
            },
            // Esri World Imagery (Satellite 3D)
            'source-satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 19,
              attribution: '&copy; Esri Earthstar Geographics'
            },
            // OpenStreetMap streets
            'source-osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              maxzoom: 19,
              attribution: '&copy; OpenStreetMap'
            }
          },
          layers: [
            {
              id: 'layer-dark-base',
              type: 'raster',
              source: 'source-dark-base',
              layout: { visibility: currentTheme === 'dark_road' ? 'visible' : 'none' }
            },
            {
              id: 'layer-snow',
              type: 'raster',
              source: 'source-snow',
              layout: { visibility: currentTheme === 'snow_mountain' ? 'visible' : 'none' },
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
              layout: { visibility: currentTheme === 'satellite' ? 'visible' : 'none' }
            },
            {
              id: 'layer-osm',
              type: 'raster',
              source: 'source-osm',
              layout: { visibility: currentTheme === 'osm_streets' ? 'visible' : 'none' }
            },
            {
              id: 'layer-dark-ref',
              type: 'raster',
              source: 'source-dark-ref',
              layout: { visibility: (currentTheme === 'dark_road' || currentTheme === 'snow_mountain') ? 'visible' : 'none' }
            }
          ],
          terrain: {
            source: 'terrainSource',
            exaggeration: 1.55
          },
          sky: {
            'sky-color': '#0B1120',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#1E293B',
            'fog-color': '#0F172A'
          }
        },
        center: defaultCenter,
        zoom: defaultZoom,
        pitch: 58,
        bearing: 25,
        maxPitch: 85
      });

      // Enable touch pitch and rotate
      map.touchPitch.enable();
      map.touchZoomRotate.enable();

      map.on('load', function() {
        updateThemeButton(currentTheme);

        if (coords.length > 1) {
          drawRouteAndMarkers();
          initElevationProfile();
          fitRouteBounds();
        }
      });
    }

    function drawRouteAndMarkers() {
      var lineCoords = coords.map(function(p) { return [p.lng, p.lat]; });

      map.addSource('route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: lineCoords
          }
        }
      });

      var glowColor = currentTheme === 'snow_mountain' ? '#0284C7' : '${safeColor}';
      var coreColor = currentTheme === 'snow_mountain' ? '#38BDF8' : '#60A5FA';

      // Outer glow line
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': glowColor,
          'line-width': 10,
          'line-opacity': 0.45,
          'line-blur': 3
        }
      });

      // Crisp core line
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': coreColor,
          'line-width': 4.5,
          'line-opacity': 1.0
        }
      });

      // Start pin (🟢)
      var startEl = document.createElement('div');
      startEl.className = 'pin-badge pin-start';
      startEl.innerHTML = '🟢';
      new maplibregl.Marker({ element: startEl })
        .setLngLat([coords[0].lng, coords[0].lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<b>🟢 Inici del trajecte</b>'))
        .addTo(map);

      // End pin (🏁)
      var endEl = document.createElement('div');
      endEl.className = 'pin-badge pin-end';
      endEl.innerHTML = '🏁';
      new maplibregl.Marker({ element: endEl })
        .setLngLat([coords[coords.length - 1].lng, coords[coords.length - 1].lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<b>🏁 Final del trajecte</b>'))
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
        var peakEl = document.createElement('div');
        peakEl.className = 'pin-badge pin-peak';
        peakEl.innerHTML = '⛰️';
        new maplibregl.Marker({ element: peakEl })
          .setLngLat([coords[peakIdx].lng, coords[peakIdx].lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<b>⛰️ Cota Màxima:</b> ' + Math.round(maxAlt) + ' m'))
          .addTo(map);
      }
    }

    function fitRouteBounds() {
      if (coords.length > 1) {
        var bounds = new maplibregl.LngLatBounds();
        coords.forEach(function(p) { bounds.extend([p.lng, p.lat]); });
        map.fitBounds(bounds, {
          padding: { top: 70, bottom: 120, left: 40, right: 40 },
          pitch: is3D ? 58 : 0,
          bearing: is3D ? 25 : 0,
          maxZoom: 16,
          duration: 900
        });
      }
    }

    function toggle3D() {
      is3D = !is3D;
      var tiltBtn = document.getElementById('tiltBtn');
      if (is3D) {
        map.setTerrain({ source: 'terrainSource', exaggeration: 1.55 });
        map.easeTo({ pitch: 58, bearing: 25, duration: 800 });
        tiltBtn.classList.add('active');
        document.getElementById('tiltIcon').innerText = '🏔️';
        document.getElementById('tiltText').innerText = 'Relleu 3D';
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
        tiltBtn.classList.remove('active');
        document.getElementById('tiltIcon').innerText = '🗺️';
        document.getElementById('tiltText').innerText = 'Vista 2D';
      }
    }

    function rotateCamera() {
      var curBearing = map.getBearing();
      map.easeTo({ bearing: (curBearing + 60) % 360, duration: 800 });
    }

    function cycleTheme() {
      var order = ['dark_road', 'snow_mountain', 'satellite', 'osm_streets'];
      var nextIdx = (order.indexOf(currentTheme) + 1) % order.length;
      currentTheme = order[nextIdx];
      applyTheme(currentTheme);
    }

    function applyTheme(themeKey) {
      var allLayers = ['layer-dark-base', 'layer-snow', 'layer-satellite', 'layer-osm', 'layer-dark-ref'];
      allLayers.forEach(function(layerId) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      });

      var activeList = themeLayers[themeKey] || themeLayers.dark_road;
      activeList.forEach(function(layerId) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      });

      if (map.getLayer('route-glow') && map.getLayer('route-core')) {
        var glow = themeKey === 'snow_mountain' ? '#0284C7' : '${safeColor}';
        var core = themeKey === 'snow_mountain' ? '#38BDF8' : '#60A5FA';
        map.setPaintProperty('route-glow', 'line-color', glow);
        map.setPaintProperty('route-core', 'line-color', core);
      }

      updateThemeButton(themeKey);
    }

    function updateThemeButton(themeKey) {
      var themeBtn = document.getElementById('themeBtn');
      if (themeKey === 'snow_mountain') {
        themeBtn.innerHTML = '<span>❄️</span> <span>Muntanya Neu</span>';
      } else if (themeKey === 'satellite') {
        themeBtn.innerHTML = '<span>🛰️</span> <span>Satèl·lit 3D</span>';
      } else if (themeKey === 'osm_streets') {
        themeBtn.innerHTML = '<span>🗺️</span> <span>Carrer 3D</span>';
      } else {
        themeBtn.innerHTML = '<span>🌙</span> <span>Carretera Dark</span>';
      }
    }

    // Interactive Elevation Profile Chart
    function initElevationProfile() {
      var altitudes = coords.map(function(c) { return c.alt || 0; });
      var validAlts = altitudes.filter(function(a) { return a > 0; });
      if (validAlts.length < 5) return;

      var chartContainer = document.getElementById('chart-container');
      chartContainer.style.display = 'block';

      var canvas = document.getElementById('elevationCanvas');
      var ctx = canvas.getContext('2d');
      var W = canvas.width;
      var H = canvas.height;

      var minA = Math.min(...validAlts) - 20;
      var maxA = Math.max(...validAlts) + 20;
      var rangeA = Math.max(1, maxA - minA);

      var cursorEl = document.createElement('div');
      cursorEl.innerHTML = '<div style="width:16px;height:16px;border-radius:50%;background:#F43F5E;border:2.5px solid #fff;box-shadow:0 0 12px #F43F5E;"></div>';
      cursorMarker = new maplibregl.Marker({ element: cursorEl });

      function drawProfile(highlightIdx) {
        ctx.clearRect(0, 0, W, H);

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

        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

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

        if (highlightIdx !== undefined && highlightIdx >= 0 && highlightIdx < coords.length) {
          var hx = (highlightIdx / (coords.length - 1)) * W;
          var hAlt = coords[highlightIdx].alt || minA;
          var hy = H - ((hAlt - minA) / rangeA) * (H - 24) - 12;

          ctx.beginPath();
          ctx.moveTo(hx, 0);
          ctx.lineTo(hx, H);
          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 1.5;
          ctx.stroke();

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

      function handleScrub(e) {
        var rect = canvas.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        var idx = Math.round(ratio * (coords.length - 1));
        var targetPoint = coords[idx];

        if (targetPoint) {
          drawProfile(idx);

          var spdText = targetPoint.spd ? ' • ' + Math.round(targetPoint.spd) + ' km/h' : '';
          var altText = targetPoint.alt ? Math.round(targetPoint.alt) + ' m' : '--';
          document.getElementById('curElevationText').innerText = '📍 Alt: ' + altText + spdText;

          cursorMarker.setLngLat([targetPoint.lng, targetPoint.lat]).addTo(map);
          map.easeTo({ center: [targetPoint.lng, targetPoint.lat], duration: 250 });
        }
      }

      canvas.addEventListener('touchstart', handleScrub, { passive: true });
      canvas.addEventListener('touchmove', handleScrub, { passive: true });
      canvas.addEventListener('mousemove', function(e) {
        if (e.buttons === 1) handleScrub(e);
      });
    }

    window.onload = initMap;
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
                    ? 'Relleu 3D Neu i Muntanya'
                    : 'Relleu 3D Carretera Dark'}
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

          {/* Interactive 3D Terrain Map WebView */}
          <View style={styles.mapContainer}>
            {coordinates.length > 0 ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: generateMapHtml() }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mixedContentMode="always"
                scrollEnabled={false}
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
