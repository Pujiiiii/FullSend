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
import { GpsPoint, RouteMetadata } from '../types/database';

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
  const [activeTheme, setActiveTheme] = useState<'pokemon_go' | 'snow_mountain' | 'dark_road'>('pokemon_go');

  const coordinates: GpsPoint[] = metadata?.coordinates || [];
  const totalDist = metadata?.distance_km ?? distanceKm ?? 0;
  const durationSec = metadata?.duration_seconds ?? 0;
  const maxSpeed = metadata?.max_speed_kmh ?? 0;
  const avgSpeed = metadata?.avg_speed_kmh ?? 0;
  const elevationGain = metadata?.elevation_gain_m ?? 0;
  const elevationLoss = metadata?.elevation_loss_m ?? 0;
  const maxAltitude = metadata?.max_altitude_m ?? null;
  const minAltitude = metadata?.min_altitude_m ?? null;

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Generate self-contained Pokémon GO Style 3D Terrain Map HTML (MapLibre GL 3.6.2 + AWS Terrarium DEM)
  // 100% Free, zero tokens, zero credit cards, real 3D mountain volume, minimalist aesthetics
  const generatePokemonGo3DHtml = () => {
    const safeCoords = JSON.stringify(
      coordinates.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        alt: p.altitude ?? 0,
        spd: p.speed ?? 0,
        ts: p.timestamp,
      }))
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.css" />
  <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #96D48F;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      -webkit-user-select: none;
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
      border-color: #00E5FF;
      background: rgba(0, 229, 255, 0.25);
      color: #00E5FF;
    }
    /* Custom Pin Badges */
    .pin-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      font-size: 16px;
    }
    .pin-start { background: #10B981; }
    .pin-end { background: #EF4444; }
    .pin-peak { background: #8B5CF6; }
    /* Elevation profile chart container at bottom */
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
      color: #00E5FF;
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
      <span>🌿</span> <span>Pokémon GO</span>
    </button>
    <button class="hud-btn" onclick="fitRouteBounds()">
      <span>🎯</span> <span>Centrar</span>
    </button>
  </div>

  <!-- Elevation Profile Canvas at bottom -->
  <div id="chart-container" style="display: none;">
    <div class="chart-header">
      <span class="chart-title">📈 Perfil Altimètric (Altitud vs Distància)</span>
      <span id="curElevationText" class="chart-cur-info">Toca el gràfic per explorar el relleu</span>
    </div>
    <canvas id="elevationCanvas" width="600" height="130"></canvas>
  </div>

  <script>
    var rawCoords = ${safeCoords};
    var coords = rawCoords.filter(function(p) {
      return p && typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng);
    });

    var map = null;
    var is3D = true;
    var currentTheme = '${activeTheme}';
    var cursorMarker = null;

    // Pokémon GO Minimalist Style Specification (Zero POIs, soft green, clean roads, 3D DEM)
    function getPokemonGoStyle(theme) {
      var isSnow = theme === 'snow_mountain';
      var isDark = theme === 'dark_road';

      var bgColor = isSnow ? '#EEF4F8' : isDark ? '#0F172A' : '#96D48F';
      var parkColor = isSnow ? '#E2ECF2' : isDark ? '#1E293B' : '#82C87A';
      var forestColor = isSnow ? '#D8E5ED' : isDark ? '#162235' : '#63B35C';
      var waterColor = isSnow ? '#38BDF8' : isDark ? '#0284C7' : '#48CAE4';
      var roadMajor = isSnow ? '#FFFFFF' : isDark ? '#334155' : '#FFFFFF';
      var roadMinor = isSnow ? '#E2E8F0' : isDark ? '#1E293B' : '#F1F5F9';
      var roadCasing = isSnow ? '#CBD5E1' : isDark ? '#090D16' : '#D1D5DB';
      var skyColor = isSnow ? '#B8D8F0' : isDark ? '#090D16' : '#7EC8E3';
      var fogColor = isSnow ? '#DCECF7' : isDark ? '#0F172A' : '#D0EAE4';

      return {
        version: 8,
        sources: {
          'openfreemap': {
            type: 'vector',
            tiles: ['https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf'],
            maxzoom: 14
          },
          'terrainSource': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15
          }
        },
        terrain: {
          source: 'terrainSource',
          exaggeration: 1.55
        },
        sky: {
          'sky-color': skyColor,
          'sky-horizon-blend': 0.6,
          'horizon-color': '#EBF7F5',
          'fog-color': fogColor
        },
        layers: [
          // 1. Natural Ground Terrain
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': bgColor }
          },
          // 2. Parks & Grass
          {
            id: 'layer-park',
            type: 'fill',
            source: 'openfreemap',
            'source-layer': 'park',
            paint: { 'fill-color': parkColor, 'fill-opacity': 0.85 }
          },
          // 3. Forests & Woods
          {
            id: 'layer-forest',
            type: 'fill',
            source: 'openfreemap',
            'source-layer': 'landcover',
            filter: ['==', 'subclass', 'wood'],
            paint: { 'fill-color': forestColor, 'fill-opacity': 0.8 }
          },
          // 4. Water Bodies
          {
            id: 'layer-water',
            type: 'fill',
            source: 'openfreemap',
            'source-layer': 'water',
            paint: { 'fill-color': waterColor }
          },
          // 5. Waterways
          {
            id: 'layer-waterway',
            type: 'line',
            source: 'openfreemap',
            'source-layer': 'waterway',
            paint: { 'line-color': waterColor, 'line-width': 2.5 }
          },
          // 6. Major Roads Casing
          {
            id: 'layer-road-major-casing',
            type: 'line',
            source: 'openfreemap',
            'source-layer': 'transportation',
            filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
            paint: {
              'line-color': roadCasing,
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 16, 7.5]
            }
          },
          // 7. Major Roads Core
          {
            id: 'layer-road-major',
            type: 'line',
            source: 'openfreemap',
            'source-layer': 'transportation',
            filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
            paint: {
              'line-color': roadMajor,
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.8, 16, 6.0]
            }
          },
          // 8. Secondary & Residential Streets
          {
            id: 'layer-road-street',
            type: 'line',
            source: 'openfreemap',
            'source-layer': 'transportation',
            filter: ['in', 'class', 'secondary', 'tertiary', 'minor', 'residential'],
            paint: {
              'line-color': roadMinor,
              'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 4.0]
            }
          },
          // 9. Paths, Tracks, Footways & Trails
          {
            id: 'layer-road-path',
            type: 'line',
            source: 'openfreemap',
            'source-layer': 'transportation',
            filter: ['in', 'class', 'path', 'track', 'service', 'footway', 'cycleway'],
            paint: {
              'line-color': roadCasing,
              'line-dasharray': [2, 1],
              'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.0, 16, 2.2]
            }
          },
          // 10. Subtle Street Names (Only when zoomed in, POIs and businesses 100% removed!)
          {
            id: 'layer-road-name',
            type: 'symbol',
            source: 'openfreemap',
            'source-layer': 'transportation_name',
            minzoom: 14,
            layout: {
              'symbol-placement': 'line',
              'text-field': '{name}',
              'text-size': 11
            },
            paint: {
              'text-color': isDark ? '#94A3B8' : '#334155',
              'text-halo-color': isDark ? '#090D16' : '#FFFFFF',
              'text-halo-width': 1.5
            }
          }
        ]
      };
    }

    function initMap() {
      var defaultCenter = coords.length > 0 ? [coords[0].lng, coords[0].lat] : [2.1734, 41.3851];
      var defaultZoom = coords.length > 0 ? 14 : 10;

      map = new maplibregl.Map({
        container: 'map',
        style: getPokemonGoStyle(currentTheme),
        center: defaultCenter,
        zoom: defaultZoom,
        pitch: 58,
        bearing: 25,
        maxPitch: 75,
        attributionControl: false
      });

      map.touchPitch.enable();
      map.touchZoomRotate.enable();

      map.on('load', function() {
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

      // 1. Electric Blue Outer Glow
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00B4D8',
          'line-width': 10,
          'line-opacity': 0.5,
          'line-blur': 3
        }
      });

      // 2. Electric Blue Crisp Core
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00E5FF',
          'line-width': 4.5,
          'line-opacity': 1.0
        }
      });

      // Start Pin 🟢
      var startEl = document.createElement('div');
      startEl.className = 'pin-badge pin-start';
      startEl.innerHTML = '🟢';
      new maplibregl.Marker({ element: startEl })
        .setLngLat([coords[0].lng, coords[0].lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<b>🟢 Inici del trajecte</b>'))
        .addTo(map);

      // End Pin 🏁
      var endEl = document.createElement('div');
      endEl.className = 'pin-badge pin-end';
      endEl.innerHTML = '🏁';
      new maplibregl.Marker({ element: endEl })
        .setLngLat([coords[coords.length - 1].lng, coords[coords.length - 1].lat])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<b>🏁 Final del trajecte</b>'))
        .addTo(map);

      // Peak Altitude Pin ⛰️
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
        try {
          map.setTerrain({ source: 'terrainSource', exaggeration: 1.55 });
        } catch(e) {}
        map.easeTo({ pitch: 58, bearing: 25, duration: 800 });
        tiltBtn.classList.add('active');
        document.getElementById('tiltIcon').innerText = '🏔️';
        document.getElementById('tiltText').innerText = 'Relleu 3D';
      } else {
        try {
          map.setTerrain(null);
        } catch(e) {}
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
      var themes = ['pokemon_go', 'snow_mountain', 'dark_road'];
      var nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
      currentTheme = themes[nextIdx];
      map.setStyle(getPokemonGoStyle(currentTheme));

      map.once('style.load', function() {
        drawRouteAndMarkers();
      });

      var themeBtn = document.getElementById('themeBtn');
      if (currentTheme === 'snow_mountain') {
        themeBtn.innerHTML = '<span>❄️</span> <span>Muntanya Neu</span>';
      } else if (currentTheme === 'dark_road') {
        themeBtn.innerHTML = '<span>🌙</span> <span>Carretera Dark</span>';
      } else {
        themeBtn.innerHTML = '<span>🌿</span> <span>Pokémon GO</span>';
      }
    }

    // Interactive Elevation Profile Chart Canvas
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
      cursorEl.innerHTML = '<div style="width:16px;height:16px;border-radius:50%;background:#00E5FF;border:2.5px solid #fff;box-shadow:0 0 12px #00E5FF;"></div>';
      cursorMarker = new maplibregl.Marker({ element: cursorEl });

      function drawProfile(highlightIdx) {
        ctx.clearRect(0, 0, W, H);

        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0, 229, 255, 0.6)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');

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
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (highlightIdx !== undefined && highlightIdx >= 0 && highlightIdx < coords.length) {
          var hx = (highlightIdx / (coords.length - 1)) * W;
          var hAlt = coords[highlightIdx].alt || minA;
          var hy = H - ((hAlt - minA) / rangeA) * (H - 24) - 12;

          ctx.beginPath();
          ctx.moveTo(hx, 0);
          ctx.lineTo(hx, H);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#00E5FF';
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

    // Infallible polling starter
    function boot() {
      if (typeof maplibregl !== 'undefined' && document.getElementById('map')) {
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
              <View style={[styles.themeIconCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="map" size={18} color="#090D16" />
              </View>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {activeTheme === 'snow_mountain'
                    ? 'Relleu 3D Neu i Muntanya'
                    : activeTheme === 'dark_road'
                    ? 'Relleu 3D Carretera Dark'
                    : 'Relleu 3D Estil Pokémon GO'}
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

          {/* Interactive Pokémon GO 3D Terrain Map WebView */}
          <View style={styles.mapContainer}>
            {coordinates.length > 0 ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: generatePokemonGo3DHtml(), baseUrl: 'https://tiles.openfreemap.org' }}
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
                  Aquest registre no té punts GPS suficients per mostrar el mapa 3D.
                </Text>
              </View>
            )}
          </View>

          {/* Footer Info if elevation exists */}
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
                  🏎️ Mitjana: <Text style={styles.footerAltBold}>{avgSpeed} km/h</Text>
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
    backgroundColor: '#0F172A',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#00E5FF',
  },
});
