import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { aggregateEntries } from '../../utils/statsCalculations';
import { Colors } from '../../utils/theme';
import { CustomFieldsInput } from '../../components/CustomFieldsInput';
import { GpsRouteTrackerModal } from '../../components/GpsRouteTrackerModal';
import { RouteMapModal } from '../../components/RouteMapModal';
import { StatEntry } from '../../types/database';

export default function StatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stats, entries, addEntry, deleteEntry, deleteStat, updateStat } = useStats();

  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');
  const [routeDurationMin, setRouteDurationMin] = useState('');
  const [routeMaxSpeed, setRouteMaxSpeed] = useState('');
  const [routeElevationGain, setRouteElevationGain] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [adding, setAdding] = useState(false);
  const [gpsModalVisible, setGpsModalVisible] = useState(false);
  const [selectedRouteModalEntry, setSelectedRouteModalEntry] = useState<StatEntry | null>(null);

  const stat = stats.find((s) => s.id === id);

  if (!stat) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>No s'ha trobat aquesta mètrica.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Tornar enrere</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statEntries = entries
    .filter((e) => e.stat_id === stat.id)
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

  const currentYear = new Date().getFullYear();
  const thisYearEntries = statEntries.filter(
    (e) => new Date(e.recorded_at).getFullYear() === currentYear
  );

  const yearTotal = aggregateEntries(thisYearEntries, stat.aggregation);
  const allTimeTotal = aggregateEntries(statEntries, stat.aggregation);

  const handleAddLog = async () => {
    let val = 1;
    if (stat.type === 'numeric' || stat.type === 'rating' || stat.type === 'route') {
      val = parseFloat(newValue.replace(',', '.'));
      if (isNaN(val)) {
        Alert.alert('Valor invàlid', 'Introdueix un número vàlid');
        return;
      }
    } else if (stat.type === 'counter') {
      val = newValue ? parseFloat(newValue.replace(',', '.')) : 1;
      if (isNaN(val)) val = 1;
    }

    try {
      setAdding(true);
      let finalMetadata: Record<string, any> = {};
      if (stat.fields_config) {
        stat.fields_config.forEach((f) => {
          const raw = customFieldValues[f.id];
          if (raw !== undefined && raw !== null && raw !== '') {
            if (f.type === 'number') {
              const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
              if (!isNaN(num)) finalMetadata[f.id] = num;
            } else {
              finalMetadata[f.id] = raw;
            }
          }
        });
      } else {
        Object.assign(finalMetadata, customFieldValues);
      }

      if (stat.type === 'route') {
        const durMin = parseFloat(routeDurationMin.replace(',', '.'));
        const maxSpd = parseFloat(routeMaxSpeed.replace(',', '.'));
        const elevGain = parseFloat(routeElevationGain.replace(',', '.'));
        const hours = !isNaN(durMin) && durMin > 0 ? durMin / 60 : 0;
        const avgSpd = hours > 0 && val > 0 ? Number((val / hours).toFixed(1)) : 0;

        finalMetadata = {
          ...finalMetadata,
          distance_km: val,
          duration_seconds: !isNaN(durMin) && durMin > 0 ? Math.round(durMin * 60) : 0,
          max_speed_kmh: !isNaN(maxSpd) && maxSpd > 0 ? Math.round(maxSpd) : 0,
          avg_speed_kmh: avgSpd,
          elevation_gain_m: !isNaN(elevGain) && elevGain > 0 ? Math.round(elevGain) : undefined,
        };
      }

      await addEntry(
        stat.id,
        val,
        newNote || undefined,
        Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined
      );
      setNewValue('');
      setNewNote('');
      setRouteDurationMin('');
      setRouteMaxSpeed('');
      setRouteElevationGain('');
      setCustomFieldValues({});
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No s\'ha pogut desar');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteStat = () => {
    Alert.alert(
      'Eliminar mètrica?',
      `S'eliminaran "${stat.name}" i tots els seus ${statEntries.length} registres històrics. Aquesta acció no es pot desfer.`,
      [
        { text: 'Cancel·lar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteStat(stat.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleToggleArchive = async () => {
    await updateStat(stat.id, { is_archived: !stat.is_archived });
    Alert.alert(
      stat.is_archived ? 'Reactivada' : 'Arxivada',
      stat.is_archived
        ? 'La mètrica torna a estar activa a la pantalla principal.'
        : 'La mètrica s\'ha mogut a l\'arxiu.'
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={statEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Header Card */}
            <View style={[styles.headerCard, { borderTopColor: stat.color, borderTopWidth: 4 }]}>
              <View style={styles.headerTop}>
                <View style={styles.iconCircle}>
                  <Text style={styles.icon}>{stat.icon || '📊'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statName}>{stat.name}</Text>
                  {stat.description ? (
                    <Text style={styles.statDesc}>{stat.description}</Text>
                  ) : null}
                  <Text style={styles.typeBadge}>
                    Tipus: {stat.type} {stat.unit ? `• Unitat: ${stat.unit}` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.editHeaderBtn}
                  onPress={() => router.push(`/stat/edit/${stat.id}` as any)}
                >
                  <Ionicons name="pencil" size={15} color="#FFFFFF" />
                  <Text style={styles.editHeaderBtnText}>Editar</Text>
                </TouchableOpacity>
              </View>

              {/* Totals Grid */}
              <View style={styles.totalsGrid}>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Any {currentYear}</Text>
                  <Text style={[styles.totalValue, { color: stat.color }]}>
                    {yearTotal} {stat.unit || ''}
                  </Text>
                  <Text style={styles.totalEntriesCount}>
                    {thisYearEntries.length} registres
                  </Text>
                </View>

                <View style={styles.totalDivider} />

                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Històric total</Text>
                  <Text style={styles.totalValueSecondary}>
                    {allTimeTotal} {stat.unit || ''}
                  </Text>
                  <Text style={styles.totalEntriesCount}>
                    {statEntries.length} registres
                  </Text>
                </View>
              </View>

              {/* Target info if present */}
              {stat.target_value && (
                <View style={styles.targetSection}>
                  <Text style={styles.targetText}>
                    Objectiu: {stat.target_value} {stat.unit || ''} (any natural)
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.round((yearTotal / stat.target_value) * 100))}%`,
                          backgroundColor: stat.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* GPS Route button if route type */}
            {stat.type === 'route' && (
              <TouchableOpacity
                style={[styles.recordGpsBanner, { backgroundColor: stat.color }]}
                onPress={() => setGpsModalVisible(true)}
              >
                <Ionicons name="navigate-circle" size={24} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordGpsTitle}>Gravar nova ruta amb GPS</Text>
                  <Text style={styles.recordGpsSub}>Mesura kms, velocitat punta, mitjana i temps</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Manual entry card */}
            <View style={styles.manualEntryCard}>
              <Text style={styles.cardSectionTitle}>Afegir nou registre</Text>

              {/* Dynamic custom fields inputs (subcategories, secondary numbers) */}
              {stat.fields_config && stat.fields_config.length > 0 && (
                <CustomFieldsInput
                  fields={stat.fields_config}
                  values={customFieldValues}
                  onChangeValues={setCustomFieldValues}
                  accentColor={stat.color}
                />
              )}

              <View style={styles.formRow}>
                {(stat.type === 'numeric' || stat.type === 'rating' || stat.type === 'route') && (
                  <TextInput
                    style={styles.valInput}
                    placeholder={stat.type === 'route' ? 'Distància (km)' : `Valor (${stat.unit || 'num'})`}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    value={newValue}
                    onChangeText={setNewValue}
                  />
                )}
                <TextInput
                  style={[styles.noteInput, stat.type === 'counter' && { flex: 1 }]}
                  placeholder="Nota (opcional)"
                  placeholderTextColor={Colors.textMuted}
                  value={newNote}
                  onChangeText={setNewNote}
                />
              </View>

              {stat.type === 'route' && (
                <>
                  <View style={[styles.formRow, { marginTop: 0 }]}>
                    <TextInput
                      style={styles.valInput}
                      placeholder="Temps (minuts, ex: 50)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="decimal-pad"
                      value={routeDurationMin}
                      onChangeText={setRouteDurationMin}
                    />
                    <TextInput
                      style={styles.valInput}
                      placeholder="Vel. punta (ex: 160)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="decimal-pad"
                      value={routeMaxSpeed}
                      onChangeText={setRouteMaxSpeed}
                    />
                  </View>
                  <View style={[styles.formRow, { marginTop: 0 }]}>
                    <TextInput
                      style={styles.valInput}
                      placeholder="Desnivell +D en metres (opcional)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="decimal-pad"
                      value={routeElevationGain}
                      onChangeText={setRouteElevationGain}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: stat.color }]}
                onPress={handleAddLog}
                disabled={adding}
              >
                <Text style={styles.addBtnText}>
                  {adding ? 'Desant...' : 'Afegir al registre'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Entry history header */}
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>
                Historial complet ({statEntries.length})
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
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

          // Metadata badges / info
          const subcategory = item.metadata?.subcat;
          const pricePerLitre = item.metadata?.price_per_litre;
          const totalCost = item.metadata?.total_cost;
          const maxSpeed = item.metadata?.max_speed_kmh;
          const avgSpeed = item.metadata?.avg_speed_kmh;
          const durationSec = item.metadata?.duration_seconds;

          return (
            <View style={styles.logRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.logMainRow}>
                  <Text style={[styles.logValue, { color: stat.color }]}>
                    +{item.value} {stat.unit || ''}
                  </Text>
                  <Text style={styles.logDate}>
                    {dateStr} • {timeStr}
                  </Text>
                </View>

                {/* Subcategory badge */}
                {subcategory && (
                  <View style={styles.subcatBadge}>
                    <Text style={styles.subcatBadgeText}>🏷️ {subcategory}</Text>
                  </View>
                )}

                {/* Dynamic secondary fields from fields_config */}
                {stat.fields_config &&
                  stat.fields_config
                    .filter((f) => f.type === 'number')
                    .map((f) => {
                      const val = item.metadata?.[f.id];
                      if (val === undefined || val === null || val === '') return null;
                      return (
                        <Text key={f.id} style={styles.extraMetadataText}>
                          📌 {f.label}: {val} {f.unit || ''}
                        </Text>
                      );
                    })}

                {/* Legacy fuel secondary data fallback */}
                {(pricePerLitre !== undefined || totalCost !== undefined) &&
                  !stat.fields_config?.some(
                    (f) => f.id === 'price_per_litre' || f.id === 'total_cost'
                  ) && (
                    <Text style={styles.extraMetadataText}>
                      ⛽ {pricePerLitre ? `${pricePerLitre} €/L` : ''}
                      {pricePerLitre && totalCost ? ' • ' : ''}
                      {totalCost ? `Cost: ${totalCost} €` : ''}
                    </Text>
                  )}

                {/* Route GPS secondary data */}
                {(maxSpeed !== undefined || item.metadata?.elevation_gain_m !== undefined) && (
                  <Text style={styles.extraMetadataText}>
                    {maxSpeed !== undefined ? `🚗 Vel. punta: ${maxSpeed} km/h • Mitja: ${avgSpeed} km/h` : ''}
                    {durationSec ? ` • Temps: ${Math.round(durationSec / 60)} min` : ''}
                    {item.metadata?.elevation_gain_m ? ` • 🔺 +${item.metadata.elevation_gain_m}m` : ''}
                    {item.metadata?.elevation_loss_m ? ` • 🔻 -${item.metadata.elevation_loss_m}m` : ''}
                  </Text>
                )}

                {/* View 3D Map & Elevation Profile Button */}
                {(Boolean(item.metadata?.coordinates?.length) || stat.type === 'route') && (
                  <TouchableOpacity
                    style={[
                      styles.viewMapBtn,
                      {
                        backgroundColor:
                          item.metadata?.map_theme === 'snow_mountain'
                            ? '#0284C7'
                            : Colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedRouteModalEntry(item)}
                  >
                    <Ionicons
                      name={item.metadata?.map_theme === 'snow_mountain' ? 'snow' : 'map'}
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={styles.viewMapBtnText}>
                      {item.metadata?.coordinates?.length
                        ? 'Veure mapa 3D i perfil'
                        : 'Veure resum del trajecte'}
                    </Text>
                  </TouchableOpacity>
                )}

                {item.note ? <Text style={styles.logNote}>{item.note}</Text> : null}
              </View>

              <TouchableOpacity
                onPress={() => deleteEntry(item.id)}
                style={styles.deleteEntryBtn}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footerSection}>
            <TouchableOpacity
              style={styles.archiveBtn}
              onPress={handleToggleArchive}
            >
              <Ionicons
                name={stat.is_archived ? 'arrow-up-circle-outline' : 'archive-outline'}
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.archiveBtnText}>
                {stat.is_archived ? 'Reactivar mètrica' : 'Arxivar mètrica'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteStatBtn}
              onPress={handleDeleteStat}
            >
              <Ionicons name="trash" size={18} color={Colors.danger} />
              <Text style={styles.deleteStatBtnText}>Eliminar mètrica</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.contentList}
      />

      {/* GPS Route Tracker Modal */}
      <GpsRouteTrackerModal
        visible={gpsModalVisible}
        onClose={() => setGpsModalVisible(false)}
        statName={stat.name}
        themeColor={stat.color}
        onFinishRoute={(route) => {
          addEntry(
            stat.id,
            route.distance_km,
            `Trajecte de ${route.distance_km} km`,
            route
          );
        }}
      />

      {/* 3D Interactive Route Map & Profile Modal */}
      <RouteMapModal
        visible={selectedRouteModalEntry !== null}
        onClose={() => setSelectedRouteModalEntry(null)}
        title={`${stat.name} • ${selectedRouteModalEntry?.value || 0} km`}
        themeColor={stat.color}
        metadata={selectedRouteModalEntry?.metadata}
        distanceKm={selectedRouteModalEntry?.value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentList: {
    padding: 16,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  notFoundText: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 12,
  },
  backBtn: {
    padding: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  editHeaderBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 26,
  },
  statName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  statDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  totalsGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  totalBox: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  totalValueSecondary: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  totalEntriesCount: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  totalDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  targetSection: {
    marginTop: 14,
  },
  targetText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  recordGpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 16,
  },
  recordGpsTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  recordGpsSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  manualEntryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  valInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  noteInput: {
    flex: 2,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
  },
  addBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  historyHeader: {
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  logDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  subcatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  subcatBadgeText: {
    fontSize: 11,
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  extraMetadataText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  viewMapBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logNote: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  deleteEntryBtn: {
    padding: 8,
  },
  footerSection: {
    marginTop: 20,
    gap: 12,
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  archiveBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteStatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteStatBtnText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});
