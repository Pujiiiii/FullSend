import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

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

// Distance calculation between two GPS coordinates (Haversine formula in km)
function calculateDistanceKm(
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

  const prevLocationRef = useRef<Location.LocationObjectCoords | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop tracking on unmount or close
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permís denegat',
        'Necessitem accés al GPS per poder mesurar la distància i velocitat de la ruta.'
      );
      return;
    }

    // Reset stats
    setDistanceKm(0);
    setCurrentSpeedKmh(0);
    setMaxSpeedKmh(0);
    setElapsedSeconds(0);
    prevLocationRef.current = null;
    setIsTracking(true);

    // Timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Start GPS watch
    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 3, // Update every 3 meters
        },
        (loc) => {
          const coords = loc.coords;
          // Speed: m/s -> km/h
          const speedKmh = Math.max(0, Math.round((coords.speed || 0) * 3.6));
          setCurrentSpeedKmh(speedKmh);
          setMaxSpeedKmh((prev) => Math.max(prev, speedKmh));

          if (prevLocationRef.current) {
            const dist = calculateDistanceKm(
              prevLocationRef.current.latitude,
              prevLocationRef.current.longitude,
              coords.latitude,
              coords.longitude
            );
            // Ignore GPS jitter when stationary
            if (dist > 0.003) {
              setDistanceKm((prev) => Number((prev + dist).toFixed(2)));
            }
          }
          prevLocationRef.current = coords;
        }
      );
      locationSubscriptionRef.current = sub;
    } catch (err: any) {
      Alert.alert('Error GPS', err.message || 'No s\'ha pogut iniciar el GPS');
      stopTracking();
    }
  };

  const stopTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTracking(false);
  };

  const handleFinish = () => {
    stopTracking();

    const hours = elapsedSeconds / 3600;
    const avgSpeed = hours > 0 && distanceKm > 0 ? Number((distanceKm / hours).toFixed(1)) : 0;

    onFinishRoute({
      distance_km: distanceKm,
      duration_seconds: elapsedSeconds,
      max_speed_kmh: maxSpeedKmh,
      avg_speed_kmh: avgSpeed,
    });
    onClose();
  };

  // Format MM:SS or HH:MM:SS
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
              <Ionicons name="navigate-circle" size={24} color={themeColor} />
              <Text style={styles.headerTitle}>{statName}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isTracking) {
                  Alert.alert('Cancel·lar ruta?', 'La ruta en curs es descartarà.', [
                    { text: 'Continuar', style: 'cancel' },
                    {
                      text: 'Descartar',
                      style: 'destructive',
                      onPress: () => {
                        stopTracking();
                        onClose();
                      },
                    },
                  ]);
                } else {
                  onClose();
                }
              }}
            >
              <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Speedometer display */}
          <View style={styles.speedometerContainer}>
            <Text style={[styles.speedNumber, { color: themeColor }]}>
              {currentSpeedKmh}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
            <Text style={styles.speedLabel}>Velocitat actual</Text>
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
              <Text style={styles.metricLabel}>Temps</Text>
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

          {/* Controls */}
          <View style={styles.actionsContainer}>
            {!isTracking ? (
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: themeColor }]}
                onPress={startTracking}
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
  actionsContainer: {
    marginTop: 20,
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

