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
  const [activeTheme] = useState<'day' | 'night'>(
    metadata?.map_theme === 'dark_road' ? 'night' : 'day'
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
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.js" onerror="this.onerror=null;this.src='https://cdn.jsdelivr.net/npm/maplibre-gl@5.3.0/dist/maplibre-gl.js';"></script>
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
      <span>${activeTheme === 'night' ? '🌙' : '☀️'}</span> <span>${activeTheme === 'night' ? 'Mode Nit' : 'Mode Dia'}</span>
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

    function initMap() {
      var defaultCenter = coords.length > 0 ? [coords[0].lng, coords[0].lat] : [2.1734, 41.3851];
      var defaultZoom = coords.length > 0 ? 14 : 10;

      map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
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
        // 1. Add AWS Terrarium 3D Elevation Mesh (Real Mountain & Valley Volume)
        try {
          map.addSource('terrainSource', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15
          });
          map.setTerrain({ source: 'terrainSource', exaggeration: 1.55 });

          // Real 3D Hillshade for mountain and valley volume
          map.addLayer({
            id: 'terrain-shading',
            type: 'hillshade',
            source: 'terrainSource',
            paint: {
              'hillshade-shadow-color': currentTheme === 'night' ? '#020617' : '#3B7A49',
              'hillshade-highlight-color': '#FFFFFF',
              'hillshade-accent-color': '#5CA96A',
              'hillshade-exaggeration': 0.85
            }
          }, 'water');

          // Paint mountains above 1500m in light grey / snow white
          map.addLayer({
            id: 'snow-peaks',
            type: 'color-relief',
            source: 'terrainSource',
            paint: {
              'color-relief-color': [
                'interpolate',
                ['linear'],
                ['elevation'],
                0, 'rgba(0, 0, 0, 0)',
                1480, 'rgba(226, 232, 240, 0)',
                1550, 'rgba(203, 213, 225, 0.6)',
                1950, 'rgba(241, 245, 249, 0.86)',
                2450, 'rgba(255, 255, 255, 0.96)'
              ]
            }
          }, 'water');
        } catch(e) {}

        // 2. Apply Pokémon GO Minimalist Aesthetic
        applyPokemonGoTheme();

        if (coords.length > 1) {
          drawRouteAndMarkers();
          initElevationProfile();
          fitRouteBounds();
        }
      });
    }

    // Transform OpenFreeMap to Pokémon GO Minimalist Aesthetic (Day / Night)
    function applyPokemonGoTheme() {
      if (!map) return;
      try {
        var isDark = currentTheme === 'night';

        var bgColor = isDark ? '#0F172A' : '#8DD484';
        var resColor = isDark ? '#162235' : '#96DC8E';
        var parkColor = isDark ? '#172536' : '#7EC874';
        var forestColor = isDark ? '#13202E' : '#5EAF55';
        var waterColor = isDark ? '#0284C7' : '#48CAE4';
        var roadMajor = isDark ? '#475569' : '#FFFFFF';
        var roadMinor = isDark ? '#334155' : '#FFFFFF';
        var roadCasing = isDark ? '#0B1120' : '#B4CBB4';

        // Hide buildings (2D & 3D extrusions), patterns & clutter
        var hideLayers = [
          'building', 'building-3d', 'road_area_pattern', 'landcover_wetland',
          'park_outline', 'road_one_way_arrow', 'road_one_way_arrow_opposite',
          'poi_r20', 'poi_r7', 'poi_r1', 'poi_transit', 'airport', 'label_other'
        ];
        hideLayers.forEach(function(l) {
          if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'none');
        });

        // Set natural terrain & landuse colors (no bright patches in night mode!)
        if (map.getLayer('background')) map.setPaintProperty('background', 'background-color', bgColor);
        if (map.getLayer('landcover_grass')) map.setPaintProperty('landcover_grass', 'fill-color', parkColor);
        if (map.getLayer('landcover_wood')) map.setPaintProperty('landcover_wood', 'fill-color', forestColor);
        if (map.getLayer('park')) {
          map.setPaintProperty('park', 'fill-color', parkColor);
          map.setPaintProperty('park', 'fill-outline-color', parkColor);
        }
        if (map.getLayer('landuse_residential')) map.setPaintProperty('landuse_residential', 'fill-color', resColor);
        if (map.getLayer('landuse_pitch')) map.setPaintProperty('landuse_pitch', 'fill-color', parkColor);
        if (map.getLayer('landuse_track')) map.setPaintProperty('landuse_track', 'fill-color', parkColor);
        if (map.getLayer('landuse_cemetery')) map.setPaintProperty('landuse_cemetery', 'fill-color', forestColor);
        if (map.getLayer('landuse_hospital')) map.setPaintProperty('landuse_hospital', 'fill-color', resColor);
        if (map.getLayer('landuse_school')) map.setPaintProperty('landuse_school', 'fill-color', resColor);
        if (map.getLayer('landcover_sand')) map.setPaintProperty('landcover_sand', 'fill-color', isDark ? '#1E293B' : '#E9D8A6');
        if (map.getLayer('landcover_ice')) map.setPaintProperty('landcover_ice', 'fill-color', isDark ? '#334155' : '#E2E8F0');
        if (map.getLayer('aeroway_fill')) map.setPaintProperty('aeroway_fill', 'fill-color', resColor);
        if (map.getLayer('aeroway_runway')) map.setPaintProperty('aeroway_runway', 'line-color', roadCasing);
        if (map.getLayer('aeroway_taxiway')) map.setPaintProperty('aeroway_taxiway', 'line-color', roadCasing);

        // Set vibrant water colors
        if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', waterColor);
        if (map.getLayer('waterway_river')) map.setPaintProperty('waterway_river', 'line-color', waterColor);
        if (map.getLayer('waterway_other')) map.setPaintProperty('waterway_other', 'line-color', waterColor);

        // Set clean road colors and subtle casings
        var majorRoads = ['road_motorway', 'road_trunk_primary', 'bridge_motorway', 'bridge_trunk_primary', 'tunnel_motorway', 'tunnel_trunk_primary'];
        majorRoads.forEach(function(r) {
          if (map.getLayer(r)) map.setPaintProperty(r, 'line-color', roadMajor);
        });

        var minorRoads = ['road_secondary_tertiary', 'road_minor', 'bridge_secondary_tertiary', 'bridge_street', 'tunnel_secondary_tertiary', 'tunnel_minor'];
        minorRoads.forEach(function(r) {
          if (map.getLayer(r)) map.setPaintProperty(r, 'line-color', roadMinor);
        });

        var casingRoads = ['road_motorway_casing', 'road_trunk_primary_casing', 'road_secondary_tertiary_casing', 'road_minor_casing', 'road_service_track_casing', 'road_service_track', 'road_path_pedestrian'];
        casingRoads.forEach(function(r) {
          if (map.getLayer(r)) map.setPaintProperty(r, 'line-color', roadCasing);
        });

        // Hillshade color update
        if (map.getLayer('terrain-shading')) {
          map.setPaintProperty('terrain-shading', 'hillshade-shadow-color', isDark ? '#020617' : '#3B7A49');
        }

        // Sky atmosphere
        if (map.setSky) {
          map.setSky({
            'sky-color': isDark ? '#090D16' : '#7EC8E3',
            'sky-horizon-blend': 0.6,
            'horizon-color': isDark ? '#1E293B' : '#EBF7F5',
            'fog-color': isDark ? '#0F172A' : '#D0EAE4'
          });
        }
      } catch(e) {}
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
      currentTheme = currentTheme === 'day' ? 'night' : 'day';
      applyPokemonGoTheme();

      var themeBtn = document.getElementById('themeBtn');
      if (currentTheme === 'night') {
        themeBtn.innerHTML = '<span>🌙</span> <span>Mode Nit</span>';
      } else {
        themeBtn.innerHTML = '<span>☀️</span> <span>Mode Dia</span>';
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
                  {activeTheme === 'night'
                    ? 'Relleu 3D Minimalista • Nit'
                    : 'Relleu 3D Minimalista • Dia'}
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
                source={{ html: generatePokemonGo3DHtml(), baseUrl: 'https://unpkg.com' }}
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
