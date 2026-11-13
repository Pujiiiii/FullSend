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

interface GpsRouteTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onFinishRoute: (routeData: {
    distance_km: number;
    duration_seconds: number;
    max_speed_kmh: number;
    avg_speed_kmh: number;
  }) => void;
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
  const [isTracking, setIsTracking] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [keepScreenAwake, setKeepScreenAwake] = useState(true);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync state when modal becomes visible
  useEffect(() => {
    if (visible) {
      checkActiveRouteOnStartup().then((existing) => {
        if (existing && existing.isTracking) {
          setIsTracking(true);
          setDistanceKm(existing.distanceKm);
          setMaxSpeedKmh(existing.maxSpeedKmh);
          startTimeRef.current = existing.startTime;
          startUiTimer(existing.startTime);
        }
      });
    }
  }, [visible]);

  const startUiTimer = (startMs: number | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!startMs) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const realElapsed = Math.max(0, Math.floor((now - startMs) / 1000));
      setElapsedSeconds(realElapsed);
    }, 1000);
  };

  const handleStart = async () => {
    const res = await startGpsTracking((state: RouteTrackingState) => {
      setDistanceKm(state.distanceKm);
      setCurrentSpeedKmh(state.currentSpeedKmh);
      setMaxSpeedKmh(state.maxSpeedKmh);
    }, keepScreenAwake);

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

  // Real-world average speed calculation
  const hours = elapsedSeconds / 3600;
  const currentAvgSpeed = hours > 0 && distanceKm > 0 ? (distanceKm / hours).toFixed(1) : '0';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="navigate-circle" size={24} color={themeColor} />
              <Text style={styles.headerTitle}>{statName}</Text>
            </View>
            <TouchableOpacity onPress={isTracking ? handleCancel : onClose}>
              <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Speedometer display */}
          <View style={styles.speedometerContainer}>
            <Text style={[styles.speedNumber, { color: themeColor }]}>
              {currentSpeedKmh}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
            <Text style={styles.speedLabel}>
              {isTracking ? 'Velocitat actual' : 'A punt per començar'}
            </Text>
          </View>

          {/* Metrics Grid */}
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
          </View>

          {/* Keep screen awake toggle */}
          <View style={styles.awakeRow}>
            <Ionicons name="sunny-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.awakeText}>Mantenir pantalla encesa</Text>
            <Switch
              value={keepScreenAwake}
              onValueChange={setKeepScreenAwake}
              trackColor={{ false: Colors.surfaceLight, true: themeColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Controls */}
          <View style={styles.actionsContainer}>
            {!isTracking ? (
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: themeColor }]}
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
                <Text style={styles.finishBtnText}>Finalitzar i desar</Text>
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
    marginBottom: 20,
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
  speedometerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.inputBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  speedNumber: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -1,
  },
  speedUnit: {
    fontSize: 16,
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
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
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
    height: 30,
    backgroundColor: Colors.border,
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
