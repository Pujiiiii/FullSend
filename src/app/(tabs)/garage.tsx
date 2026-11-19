import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { Colors } from '../../utils/theme';
import { CustomAlertModal, CustomAlertOptions } from '../../components/CustomAlertModal';

export default function GarageScreen() {
  const { statsWithCurrentStats, refreshing, refreshData, deleteStat } = useStats();
  const [alertConfig, setAlertConfig] = useState<CustomAlertOptions>({
    visible: false,
    title: '',
    message: '',
  });

  // Filter only vehicles / sports activities (type 'route')
  const vehicles = statsWithCurrentStats.filter((s) => s.type === 'route' && !s.is_archived);

  const handleDeleteVehicle = (vehicle: typeof vehicles[0]) => {
    setAlertConfig({
      visible: true,
      title: 'Eliminar màquina?',
      message: `S'eliminarà "${vehicle.name}" i tot el seu historial de rutes i telemetria. Aquesta acció no es pot desfer.`,
      type: 'destructive',
      primaryText: 'Eliminar',
      secondaryText: 'Cancel·lar',
      onPrimary: () => deleteStat(vehicle.id),
    });
  };

  return (
    <View style={styles.container}>
      {/* Header action banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>La teva Flota</Text>
          <Text style={styles.headerSub}>Cotxes, motos, 4x4 i equipament d'esquí</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/stat/new' as any)}
        >
          <Ionicons name="add" size={20} color="#090D16" />
          <Text style={styles.addBtnText}>Afegir Màquina</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-sport-outline" size={54} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Garatge buit</Text>
            <Text style={styles.emptySub}>
              Afegeix el teu cotxe, moto o taula d'esquí per començar a registrar rutes i telemetria.
            </Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => router.push('/stat/new' as any)}
            >
              <Text style={styles.addFirstBtnText}>+ Afegir el primer vehicle</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const progressPercent = item.target_value
            ? Math.min(100, Math.round((item.currentYearTotal / item.target_value) * 100))
            : null;

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.vehicleCard, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
              onPress={() => router.push(`/stat/${item.id}` as any)}
            >
              <View style={styles.cardTop}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleIcon}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleName}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.vehicleDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push(`/stat/edit/${item.id}` as any)}
                  >
                    <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleDeleteVehicle(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statVal, { color: item.color }]}>
                    {item.currentYearTotal} <Text style={styles.statUnit}>km</Text>
                  </Text>
                  <Text style={styles.statLabel}>Aquest any</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statBox}>
                  <Text style={styles.statVal}>
                    {item.allTimeTotal} <Text style={styles.statUnit}>km</Text>
                  </Text>
                  <Text style={styles.statLabel}>Total acumulat</Text>
                </View>
              </View>

              {/* Target progress if set */}
              {item.target_value ? (
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.progressText}>Objectiu anual: {item.target_value} km</Text>
                    <Text style={styles.progressPercentText}>{progressPercent}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progressPercent}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 18,
  },
  addFirstBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  addFirstBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 14,
  },
  vehicleCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 32,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  vehicleDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  editBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#090D16',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
