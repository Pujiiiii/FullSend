import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import {
  startGpsTracking,
  stopGpsTracking,
  checkActiveRouteOnStartup,
  RouteTrackingState,
} from '../utils/gpsTracker';
import { MapTheme, RouteMetadata } from '../types/database';

interface GpsRouteTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onFinishRoute: (routeData: RouteMetadata) => void;
  statName?: string;
  themeColor?: string;
}

export const GpsRouteTrackerModal: React.FC<GpsRouteTrackerModalProps> = ({
  visible,
  onClose,
  onFinishRoute,
  statName = 'Trajecte en vehicle',
  themeColor = Colors.primary,
}) => {
  const isSkiStat = /ski|esqu[ií]|snow|muntanya|neu/i.test(statName);

  const [isTracking, setIsTracking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentAltitudeM, setCurrentAltitudeM] = useState<number | null>(null);
  const [elevationGainM, setElevationGainM] = useState(0);
  const [elevationLossM, setElevationLossM] = useState(0);
  const [coordinatesCount, setCoordinatesCount] = useState(0);
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);
  const [mapTheme, setMapTheme] = useState<MapTheme>(
    isSkiStat ? 'snow_mountain' : 'dark_road'
  );

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startUiTimer = (startMs: number | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!startMs) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const realElapsed = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSeconds(realElapsed);
    }, 1000);
  };

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      checkActiveRouteOnStartup().then((existing) => {
        if (existing && existing.isTracking) {
          setIsTracking(true);
          setDistanceKm(existing.distanceKm);
          setMaxSpeedKmh(existing.maxSpeedKmh);
          setCurrentAltitudeM(existing.currentAltitudeM);
          setElevationGainM(existing.elevationGainM);
          setElevationLossM(existing.elevationLossM);
          setCoordinatesCount(existing.coordinatesCount);
          startTimeRef.current = existing.startTime;
          startUiTimer(existing.startTime);
        }
      });
    }
  }, [visible]);

  const handleStart = async () => {
    const res = await startGpsTracking(
      (state: RouteTrackingState) => {
        setDistanceKm(state.distanceKm);
        setCurrentSpeedKmh(state.currentSpeedKmh);
        setMaxSpeedKmh(state.maxSpeedKmh);
        setCurrentAltitudeM(state.currentAltitudeM);
        setElevationGainM(state.elevationGainM);
        setElevationLossM(state.elevationLossM);
        setCoordinatesCount(state.coordinatesCount);
      },
      mapTheme,
      keepScreenAwake
    );

    if (!res.success) {
      Alert.alert('Error GPS', res.error || 'No s\'ha pogut activar el GPS.');
      return;
    }

    const now = Date.now();
    startTimeRef.current = now;
    setIsTracking(true);
    setDistanceKm(0);
    setCurrentSpeedKmh(0);
    setMaxSpeedKmh(0);
    setElevationGainM(0);
    setElevationLossM(0);
    setCoordinatesCount(0);
    setElapsedSeconds(0);
    startUiTimer(now);
  };

  const handleFinish = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const result = await stopGpsTracking();
    setIsTracking(false);
    startTimeRef.current = null;

    onFinishRoute(result);
    onClose();
  };

  const handleCancel = async () => {
    Alert.alert('Cancel·lar ruta?', 'La ruta en curs es descartarà i no es desarà.', [
      { text: 'Continuar gravant', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          await stopGpsTracking();
          setIsTracking(false);
          startTimeRef.current = null;
          onClose();
        },
      },
    ]);
  };

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hours = elapsedSeconds / 3600;
  const currentAvgSpeed = hours > 0 && distanceKm > 0 ? (distanceKm / hours).toFixed(1) : '0';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons
                name={mapTheme === 'snow_mountain' ? 'snow' : 'navigate-circle'}
                size={24}
                color={mapTheme === 'snow_mountain' ? '#38BDF8' : themeColor}
              />
              <Text style={styles.headerTitle}>{statName}</Text>
            </View>
            <TouchableOpacity onPress={isTracking ? handleCancel : onClose}>
              <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Activity / Theme Selector (before starting) */}
          {!isTracking && (
            <View style={styles.themeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.themeTab,
                  mapTheme === 'dark_road' && styles.themeTabActive,
                  mapTheme === 'dark_road' && { borderColor: themeColor },
                ]}
                onPress={() => setMapTheme('dark_road')}
              >
                <Text style={styles.themeTabEmoji}>🚗</Text>
                <View>
                  <Text
                    style={[
                      styles.themeTabText,
                      mapTheme === 'dark_road' && { color: '#FFFFFF', fontWeight: '800' },
                    ]}
                  >
                    Carretera / Offroad
                  </Text>
                  <Text style={styles.themeTabSub}>Estètica Dark</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeTab,
                  mapTheme === 'snow_mountain' && styles.themeTabActive,
                  mapTheme === 'snow_mountain' && { borderColor: '#38BDF8' },
                ]}
                onPress={() => setMapTheme('snow_mountain')}
              >
                <Text style={styles.themeTabEmoji}>⛷️</Text>
                <View>
                  <Text
                    style={[
                      styles.themeTabText,
                      mapTheme === 'snow_mountain' && { color: '#38BDF8', fontWeight: '800' },
                    ]}
                  >
                    Esquí / Muntanya
                  </Text>
                  <Text style={styles.themeTabSub}>Relleu de Neu</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Speedometer display */}
          <View style={styles.speedometerContainer}>
            <Text
              style={[
                styles.speedNumber,
                { color: mapTheme === 'snow_mountain' ? '#38BDF8' : themeColor },
              ]}
            >
              {currentSpeedKmh}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
            <Text style={styles.speedLabel}>
              {isTracking ? 'Velocitat actual' : 'A punt per començar'}
            </Text>
          </View>

          {/* Primary Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{distanceKm} km</Text>
              <Text style={styles.metricLabel}>Distància</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{formatTime(elapsedSeconds)}</Text>
              <Text style={styles.metricLabel}>Temps real</Text>
            </View>
          </View>

          {/* Secondary Speed & Elevation Metrics Grid */}
          <View style={[styles.metricsGrid, { marginTop: 10 }]}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{maxSpeedKmh} km/h</Text>
              <Text style={styles.metricLabel}>Vel. punta</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{currentAvgSpeed} km/h</Text>
              <Text style={styles.metricLabel}>Vel. mitjana</Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#10B981' }]}>
                +{elevationGainM} m
              </Text>
              <Text style={styles.metricLabel}>+D Acumulat</Text>
            </View>
          </View>

          {/* Altitude & GPS signal bar if tracking */}
          {isTracking && (
            <View style={styles.altitudeLiveRow}>
              <View style={styles.altitudeTag}>
                <Ionicons name="trending-up" size={14} color="#38BDF8" />
                <Text style={styles.altitudeTagText}>
                  Alt: {currentAltitudeM !== null ? `${currentAltitudeM}m` : '--'} • 🔻 -{elevationLossM}m
                </Text>
              </View>

              <View style={styles.altitudeTag}>
                <Ionicons name="map" size={14} color="#10B981" />
                <Text style={styles.altitudeTagText}>
                  Punts ruta: {coordinatesCount}
                </Text>
              </View>
            </View>
          )}

          {/* Keep screen awake toggle */}
          <View style={styles.awakeRow}>
            <Ionicons name="sunny-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.awakeText}>Mantenir pantalla encesa</Text>
            <Switch
              value={keepScreenAwake}
              onValueChange={setKeepScreenAwake}
              trackColor={{
                false: Colors.surfaceLight,
                true: mapTheme === 'snow_mountain' ? '#38BDF8' : themeColor,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Controls */}
          <View style={styles.actionsContainer}>
            {!isTracking ? (
              <TouchableOpacity
                style={[
                  styles.startBtn,
                  {
                    backgroundColor:
                      mapTheme === 'snow_mountain' ? '#0284C7' : themeColor,
                  },
                ]}
                onPress={handleStart}
              >
                <Ionicons name="play" size={22} color="#FFFFFF" />
                <Text style={styles.startBtnText}>Començar trajecte</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.finishBtn}
                onPress={handleFinish}
              >
                <Ionicons name="stop" size={22} color="#FFFFFF" />
                <Text style={styles.finishBtnText}>Finalitzar i desar amb mapa</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  themeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  themeTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  themeTabEmoji: {
    fontSize: 20,
  },
  themeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  themeTabSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  speedometerContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: Colors.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  speedNumber: {
    fontSize: 60,
    fontWeight: '900',
    letterSpacing: -1,
  },
  speedUnit: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  speedLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: Colors.border,
  },
  altitudeLiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  altitudeTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBg,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  altitudeTagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  awakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  awakeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
