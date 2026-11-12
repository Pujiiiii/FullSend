import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

export default function StatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stats, entries, addEntry, deleteEntry, deleteStat, updateStat } = useStats();

  const [newValue, setNewValue] = useState('');
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);

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
    const val = parseFloat(newValue.replace(',', '.'));
    if (isNaN(val)) {
      Alert.alert('Valor invàlid', 'Introdueix un número vàlid');
      return;
    }

    try {
      setAdding(true);
      await addEntry(stat.id, val, newNote || undefined);
      setNewValue('');
      setNewNote('');
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

            {/* Quick manual entry form */}
            <View style={styles.manualEntryCard}>
              <Text style={styles.cardSectionTitle}>Afegir nou registre manual</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={styles.valInput}
                  placeholder={`Valor (${stat.unit || 'num'})`}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={newValue}
                  onChangeText={setNewValue}
                />
                <TextInput
                  style={styles.noteInput}
                  placeholder="Nota (opcional)"
                  placeholderTextColor={Colors.textMuted}
                  value={newNote}
                  onChangeText={setNewNote}
                />
              </View>
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
  logNote: {
    fontSize: 12,
    color: Colors.textSecondary,
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
