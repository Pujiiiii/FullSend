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

  // Available years based on existing entries or last 3 years
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

  // Find top stat (most entries logged this year)
  const topStat = useMemo(() => {
    if (summary.stats.length === 0) return null;
    return [...summary.stats].sort((a, b) => b.yearEntriesCount - a.yearEntriesCount)[0];
  }, [summary]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshData}
          tintColor={Colors.primaryLight}
        />
      }
    >
      {/* Year Selector */}
      <View style={styles.yearPickerContainer}>
        <Text style={styles.yearPickerLabel}>Selecciona l'any del Recap:</Text>
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

      {/* Hero Wrapped Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={16} color="#F59E0B" />
          <Text style={styles.heroBadgeText}>ANNUAL RECAP</Text>
        </View>

        <Text style={styles.heroTitle}>El teu any {selectedYear}</Text>
        <Text style={styles.heroSubtitle}>
          Un resum de tot el que has aconseguit i registrat
        </Text>

        <View style={styles.heroStatsGrid}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNumber}>{summary.totalLogs}</Text>
            <Text style={styles.heroStatDesc}>Registres fets</Text>
          </View>

          <View style={styles.heroStatDivider} />

          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatNumber}>{summary.activeStatsCount}</Text>
            <Text style={styles.heroStatDesc}>Mètriques actives</Text>
          </View>
        </View>

        {topStat && topStat.yearEntriesCount > 0 && (
          <View style={styles.topStatBanner}>
            <Text style={styles.topStatIcon}>{topStat.stat.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.topStatHeadline}>Mètrica més freqüent de l'any</Text>
              <Text style={styles.topStatName}>
                {topStat.stat.name} ({topStat.yearEntriesCount} entrades)
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Breakdown Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Totes les teves Stats el {selectedYear}</Text>
        <Text style={styles.sectionSub}>
          Comparativa de l'any natural vs tot el teu històric complet
        </Text>
      </View>

      {/* Individual Recap Cards */}
      {summary.stats.length > 0 ? (
        summary.stats.map((item) => (
          <RecapCard key={item.stat.id} item={item} year={selectedYear} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyTitle}>Sense dades per a l'any {selectedYear}</Text>
          <Text style={styles.emptyText}>
            Comença a afegir registres des de la pestanya 'Avui' per començar a generar el teu Recap!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  yearPickerContainer: {
    marginBottom: 16,
  },
  yearPickerLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: '#1E1B4B', // Deep indigo
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#C7D2FE',
    marginTop: 4,
    marginBottom: 16,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroStatDesc: {
    fontSize: 11,
    color: '#A5B4FC',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topStatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 12,
  },
  topStatIcon: {
    fontSize: 28,
  },
  topStatHeadline: {
    fontSize: 11,
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topStatName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 1,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
