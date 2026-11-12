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

export default function StatsManagementScreen() {
  const { statsWithCurrentStats, refreshing, refreshData } = useStats();
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');

  const filteredStats = statsWithCurrentStats.filter((s) => {
    if (filter === 'active') return !s.is_archived;
    if (filter === 'archived') return s.is_archived;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'active' && styles.activeFilterChip]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterChipText, filter === 'active' && styles.activeFilterChipText]}>
            Actives ({statsWithCurrentStats.filter((s) => !s.is_archived).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'archived' && styles.activeFilterChip]}
          onPress={() => setFilter('archived')}
        >
          <Text style={[styles.filterChipText, filter === 'archived' && styles.activeFilterChipText]}>
            Arxivades ({statsWithCurrentStats.filter((s) => s.is_archived).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.activeFilterChip]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.activeFilterChipText]}>
            Totes ({statsWithCurrentStats.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filteredStats}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            tintColor={Colors.primaryLight}
          />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.statRow, { borderLeftColor: item.color, borderLeftWidth: 4 }]}
            onPress={() => router.push(`/stat/${item.id}` as any)}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>{item.icon || '📊'}</Text>
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.statName}>{item.name}</Text>
              <Text style={styles.statDescription} numberOfLines={1}>
                {item.description || 'Sense descripció'}
              </Text>
              <Text style={styles.statTypeLabel}>
                Tipus: {item.type} {item.unit ? `(${item.unit})` : ''}
              </Text>
            </View>

            <View style={styles.statsSummaryCol}>
              <Text style={[styles.yearTotalText, { color: item.color }]}>
                {item.currentYearTotal} {item.unit || ''}
              </Text>
              <Text style={styles.yearTotalSub}>Aquest any</Text>
              <Text style={styles.allTimeText}>
                Històric: {item.allTimeTotal} {item.unit || ''}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hi ha cap mètrica en aquest filtre.</Text>
          </View>
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/stat/new' as any)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
  },
  statName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  statDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statTypeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsSummaryCol: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  yearTotalText: {
    fontSize: 15,
    fontWeight: '800',
  },
  yearTotalSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  allTimeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});

