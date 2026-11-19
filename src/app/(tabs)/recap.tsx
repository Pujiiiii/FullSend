import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { calculateYearSummary } from '../../utils/statsCalculations';
import { RecapCard } from '../../components/RecapCard';
import { Colors } from '../../utils/theme';

export default function RecapScreen() {
  const { stats, entries, refreshing, refreshData } = useStats();

  const currentCalendarYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentCalendarYear);

  // Available years based on existing entries or last 2 years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentCalendarYear, currentCalendarYear - 1]);
    entries.forEach((e) => {
      const y = new Date(e.recorded_at).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [entries, currentCalendarYear]);

  // Compute summary for selected year
  const summary = useMemo(() => {
    return calculateYearSummary(stats, entries, selectedYear);
  }, [stats, entries, selectedYear]);

  // Aggregate global Full Send metrics for the year
  const seasonStats = useMemo(() => {
    const yearEntries = entries.filter((e) => {
      const y = new Date(e.recorded_at).getFullYear();
      return y === selectedYear;
    });

    let totalKm = 0;
    let totalSeconds = 0;
    let maxSpeed = 0;
    let totalGain = 0;
    let totalLoss = 0;
    let routeCount = 0;

    yearEntries.forEach((e) => {
      const parent = stats.find((s) => s.id === e.stat_id);
      if (parent?.type === 'route') {
        routeCount++;
        totalKm += e.metadata?.distance_km ?? e.value ?? 0;
        totalSeconds += e.metadata?.duration_seconds ?? 0;
        const spd = e.metadata?.max_speed_kmh ?? 0;
        if (spd > maxSpeed) maxSpeed = spd;
        totalGain += e.metadata?.elevation_gain_m ?? 0;
        totalLoss += e.metadata?.elevation_loss_m ?? 0;
      }
    });

    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const avgSpeed = totalHours > 0 ? Math.round(totalKm / totalHours) : 0;

    return {
      totalKm: Math.round(totalKm * 10) / 10,
      totalHours,
      maxSpeed,
      avgSpeed,
      totalGain: Math.round(totalGain),
      totalLoss: Math.round(totalLoss),
      routeCount,
    };
  }, [entries, stats, selectedYear]);

  // Top vehicle / machine of the year
  const topMachine = useMemo(() => {
    if (summary.stats.length === 0) return null;
    return [...summary.stats].sort((a, b) => b.yearTotal - a.yearTotal)[0];
  }, [summary]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshData}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Year Selector */}
      <View style={styles.yearPickerContainer}>
        <Text style={styles.yearPickerLabel}>Temporada:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearsScroll}
        >
          {availableYears.map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[styles.yearChip, selectedYear === yr && styles.selectedYearChip]}
              onPress={() => setSelectedYear(yr)}
            >
              <Text
                style={[
                  styles.yearChipText,
                  selectedYear === yr && styles.selectedYearChipText,
                ]}
              >
                {yr}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Hero Full Send Wrapped Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="flash" size={14} color="#090D16" />
          <Text style={styles.heroBadgeText}>FULL SEND RECAP {selectedYear}</Text>
        </View>

        <Text style={styles.heroTitle}>{seasonStats.totalKm} <Text style={styles.heroKmSub}>KM</Text></Text>
        <Text style={styles.heroSubtitle}>
          Distància total recorreguda en {seasonStats.routeCount} sessions
        </Text>

        {/* Global Telemetry Grid */}
        <View style={styles.heroStatsGrid}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNumber}>{seasonStats.maxSpeed}</Text>
            <Text style={styles.heroStatDesc}>Punta km/h</Text>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNumber}>{seasonStats.totalHours}h</Text>
            <Text style={styles.heroStatDesc}>Temps d'acció</Text>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNumber, { color: Colors.primary }]}>
              +{seasonStats.totalGain}m
            </Text>
            <Text style={styles.heroStatDesc}>Desnivell +D</Text>
          </View>
        </View>

        {/* Top Machine Banner */}
        {topMachine && topMachine.yearTotal > 0 && (
          <View style={styles.topMachineBanner}>
            <Text style={styles.topMachineIcon}>{topMachine.stat.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.topMachineHeadline}>Màquina més activa de la temporada</Text>
              <Text style={styles.topMachineName}>
                {topMachine.stat.name} ({topMachine.yearTotal} km)
              </Text>
            </View>
            <Ionicons name="trophy" size={24} color="#F59E0B" />
          </View>
        )}
      </View>

      {/* Breakdown per Machine / Vehicle */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Desglossament per Màquina</Text>
        <Text style={styles.sectionSub}>
          Telemetria detallada i evolució mensual de cada vehicle o esport
        </Text>
      </View>

      {summary.stats.length > 0 ? (
        summary.stats.map((item) => (
          <RecapCard key={item.stat.id} item={item} year={selectedYear} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚡</Text>
          <Text style={styles.emptyTitle}>Sense sessions el {selectedYear}</Text>
          <Text style={styles.emptyText}>
            Ves al mapa, prem SEND IT ⚡ i grava les teves rutes per generar el teu resum de temporada!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    padding: 16,
    paddingBottom: 110, // Avoid overlapping floating tab bar
  },
  yearPickerContainer: {
    marginBottom: 16,
  },
  yearPickerLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '800',
  },
  yearsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  selectedYearChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  yearChipText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  selectedYearChipText: {
    color: '#090D16',
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.3)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#090D16',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F8FAFC',
    lineHeight: 46,
  },
  heroKmSub: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 18,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#090D16',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  heroStatDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#1E293B',
  },
  topMachineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    gap: 12,
  },
  topMachineIcon: {
    fontSize: 28,
  },
  topMachineHeadline: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  topMachineName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 1,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
