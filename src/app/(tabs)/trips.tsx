import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { Colors } from '../../utils/theme';
import { RouteMapModal } from '../../components/RouteMapModal';
import { StatEntry } from '../../types/database';

export default function TripsFeedScreen() {
  const { stats, entries, deleteEntry, refreshing, refreshData } = useStats();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedRouteModalEntry, setSelectedRouteModalEntry] = useState<StatEntry | null>(null);

  // All vehicles with route type
  const vehicles = stats.filter((s) => s.type === 'route');

  // Filter entries to only route trips
  const routeEntries = entries
    .filter((e) => {
      const parentStat = stats.find((s) => s.id === e.stat_id);
      if (!parentStat || parentStat.type !== 'route') return false;
      if (selectedVehicleId && e.stat_id !== selectedVehicleId) return false;
      return true;
    })
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

  const handleDeleteTrip = (entry: StatEntry) => {
    Alert.alert(
      'Eliminar trajecte?',
      `Esborraràs aquesta sessió de ${entry.value} km. No es podrà recuperar.`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteEntry(entry.id),
        },
      ]
    );
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return null;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const getVehicleForEntry = (statId: string) => {
    return stats.find((s) => s.id === statId);
  };

  return (
    <View style={styles.container}>
      {/* Vehicle Filter Tabs */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, selectedVehicleId === null && styles.filterChipActive]}
          onPress={() => setSelectedVehicleId(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedVehicleId === null && styles.filterChipTextActive,
            ]}
          >
            Totes ({routeEntries.length})
          </Text>
        </TouchableOpacity>

        {vehicles.map((v) => {
          const isSelected = selectedVehicleId === v.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setSelectedVehicleId(isSelected ? null : v.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {v.icon} {v.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Trips List */}
      <FlatList
        data={routeEntries}
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
            <Ionicons name="map-outline" size={54} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Encara no hi ha cap sessió</Text>
            <Text style={styles.emptySub}>
              Ves a la pestanya de Mapa i prem SEND IT ⚡ per gravar la teva primera ruta!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const vehicle = getVehicleForEntry(item.stat_id);
          const meta = item.metadata;
          const dateObj = new Date(item.recorded_at);
          const dateStr = dateObj.toLocaleDateString('ca-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const timeStr = dateObj.toLocaleTimeString('ca-ES', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const maxSpeed = meta?.max_speed_kmh;
          const avgSpeed = meta?.avg_speed_kmh;
          const durationStr = formatDuration(meta?.duration_seconds);
          const elevationGain = meta?.elevation_gain_m;
          const elevationLoss = meta?.elevation_loss_m;
          const hasCoordinates = Boolean(meta?.coordinates?.length);

          return (
            <View style={[styles.tripCard, { borderLeftColor: vehicle?.color || Colors.primary, borderLeftWidth: 4 }]}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.vehicleGroup}>
                  <Text style={styles.cardIcon}>{vehicle?.icon || '🏎️'}</Text>
                  <View>
                    <Text style={styles.vehicleTitle}>{vehicle?.name || 'Sessió'}</Text>
                    <Text style={styles.dateText}>{dateStr} • {timeStr}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteTrip(item)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Big Distance & Duration */}
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricBig, { color: vehicle?.color || Colors.primary }]}>
                    {item.value} <Text style={styles.metricUnit}>km</Text>
                  </Text>
                  <Text style={styles.metricSub}>Distància</Text>
                </View>

                {durationStr && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricBig}>{durationStr}</Text>
                      <Text style={styles.metricSub}>Temps</Text>
                    </View>
                  </>
                )}

                {maxSpeed ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricBig}>{maxSpeed}</Text>
                      <Text style={styles.metricSub}>Punta km/h</Text>
                    </View>
                  </>
                ) : null}
              </View>

              {/* Secondary Details: Elevation, Fuel, Avg Speed */}
              <View style={styles.badgesRow}>
                {Boolean(elevationGain) && (
                  <View style={styles.badge}>
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>
                      🔺 +{elevationGain}m
                    </Text>
                  </View>
                )}
                {Boolean(elevationLoss) && (
                  <View style={styles.badge}>
                    <Text style={[styles.badgeText, { color: '#EF4444' }]}>
                      🔻 -{elevationLoss}m
                    </Text>
                  </View>
                )}
                {Boolean(avgSpeed) && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      Mitjana: {avgSpeed} km/h
                    </Text>
                  </View>
                )}
                {meta?.price_per_litre ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      ⛽ {meta.price_per_litre} €/L
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Note if any */}
              {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}

              {/* 3D Map Review Button */}
              {hasCoordinates && (
                <TouchableOpacity
                  style={[styles.mapBtn, { backgroundColor: vehicle?.color || Colors.primary }]}
                  onPress={() => setSelectedRouteModalEntry(item)}
                >
                  <Ionicons name="map" size={16} color="#090D16" />
                  <Text style={styles.mapBtnText}>Veure mapa 3D i perfil altimètric</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* 3D Route Map Modal */}
      {selectedRouteModalEntry && (
        <RouteMapModal
          visible={selectedRouteModalEntry !== null}
          onClose={() => setSelectedRouteModalEntry(null)}
          title={`${getVehicleForEntry(selectedRouteModalEntry.stat_id)?.name || 'Ruta'} • ${selectedRouteModalEntry.value} km`}
          themeColor={getVehicleForEntry(selectedRouteModalEntry.stat_id)?.color || Colors.primary}
          metadata={selectedRouteModalEntry.metadata}
          distanceKm={selectedRouteModalEntry.value}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#090D16',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110, // Space for floating bottom bar
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
  tripCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  vehicleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIcon: {
    fontSize: 26,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#090D16',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricBig: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  metricSub: {
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
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  noteText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 14,
  },
  mapBtnText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 13,
  },
});
