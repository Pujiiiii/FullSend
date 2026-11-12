import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatDefinition } from '../types/database';
import { Colors, MonthNames } from '../utils/theme';

interface RecapCardProps {
  item: {
    stat: StatDefinition;
    yearTotal: number;
    yearEntriesCount: number;
    allTimeTotal: number;
    allTimeEntriesCount: number;
    bestMonth?: { month: number; name: string; total: number };
    monthlyTotals: number[];
  };
  year: number;
}

export const RecapCard: React.FC<RecapCardProps> = ({ item, year }) => {
  const { stat, yearTotal, allTimeTotal, bestMonth, monthlyTotals } = item;

  // Maximum value among the 12 months for chart scale
  const maxMonthValue = Math.max(...monthlyTotals, 1);

  // Percentage of all-time total that occurred in this year
  const percentOfAllTime =
    allTimeTotal > 0 ? Math.round((yearTotal / allTimeTotal) * 100) : 100;

  return (
    <View style={[styles.card, { borderColor: stat.color }]}>
      {/* Top Banner */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={styles.icon}>{stat.icon || '📊'}</Text>
          <View>
            <Text style={styles.statName}>{stat.name}</Text>
            <Text style={styles.statType}>
              {stat.type === 'counter' && 'Total comptabilitzat'}
              {stat.type === 'numeric' && `Acumulat (${stat.unit || ''})`}
              {stat.type === 'boolean' && 'Dies completats'}
              {stat.type === 'rating' && 'Mitjana anual'}
            </Text>
          </View>
        </View>

        <View style={styles.badgeYear}>
          <Text style={[styles.badgeYearText, { color: stat.color }]}>{year}</Text>
        </View>
      </View>

      {/* Big Numbers */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Aquest {year}</Text>
          <Text style={[styles.bigNumber, { color: stat.color }]}>
            {yearTotal}
            {stat.unit ? <Text style={styles.unitText}> {stat.unit}</Text> : null}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Històric total</Text>
          <Text style={styles.allTimeNumber}>
            {allTimeTotal}
            {stat.unit ? <Text style={styles.unitText}> {stat.unit}</Text> : null}
          </Text>
        </View>
      </View>

      {/* Comparison badge */}
      <View style={styles.comparisonBadge}>
        <Ionicons name="sparkles" size={14} color={Colors.accent} />
        <Text style={styles.comparisonText}>
          El <Text style={{ fontWeight: 'bold', color: Colors.text }}>{percentOfAllTime}%</Text> del teu registre històric és de l'any {year}!
        </Text>
      </View>

      {/* Best Month Highlight */}
      {bestMonth && (
        <View style={styles.highlightRow}>
          <Ionicons name="trophy" size={16} color="#F59E0B" />
          <Text style={styles.highlightText}>
            Mes rècord: <Text style={styles.highlightBold}>{bestMonth.name}</Text> ({bestMonth.total} {stat.unit || ''})
          </Text>
        </View>
      )}

      {/* 12-Month Mini Bar Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Distribució mensual ({year}):</Text>
        <View style={styles.barsContainer}>
          {monthlyTotals.map((val, idx) => {
            const heightPercent = maxMonthValue > 0 ? (val / maxMonthValue) * 100 : 0;
            const isBest = bestMonth && bestMonth.month === idx && val > 0;

            return (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(4, heightPercent)}%`,
                        backgroundColor: isBest ? Colors.accent : stat.color,
                        opacity: val > 0 ? 1 : 0.2,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barMonthLabel, isBest && styles.bestMonthLabel]}>
                  {MonthNames[idx].substring(0, 1)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 26,
  },
  statName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  statType: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  badgeYear: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
  },
  badgeYearText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 18,
    paddingVertical: 14,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bigNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  allTimeNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  comparisonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  comparisonText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  highlightText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  highlightBold: {
    fontWeight: '700',
    color: Colors.text,
  },
  chartContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chartTitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 70,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
  },
  barTrack: {
    width: 12,
    height: 52,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barMonthLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  bestMonthLabel: {
    color: Colors.accent,
    fontWeight: 'bold',
  },
});
