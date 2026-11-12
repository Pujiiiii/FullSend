import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { YearSummaryItem } from '../types/database';
import { Colors, MonthNames } from '../utils/theme';

interface RecapCardProps {
  item: YearSummaryItem;
  year: number;
}

export const RecapCard: React.FC<RecapCardProps> = ({ item, year }) => {
  const {
    stat,
    yearTotal,
    allTimeTotal,
    bestMonth,
    monthlyTotals,
    subcategories,
    topSubcategory,
    secondaryFields,
    routeStats,
  } = item;

  const maxMonthValue = Math.max(...monthlyTotals, 1);

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
              {stat.type === 'route' && 'Rutes GPS (km)'}
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

      {/* GPS Route Highlights if applicable */}
      {routeStats && (
        <View style={styles.routeHighlightBox}>
          <View style={styles.routeGrid}>
            <View style={styles.routeCol}>
              <Text style={styles.routeVal}>{routeStats.totalDistanceKm} km</Text>
              <Text style={styles.routeLabel}>Total recorregut</Text>
            </View>
            <View style={styles.routeCol}>
              <Text style={styles.routeVal}>{Math.round(routeStats.totalDurationMinutes / 60)} h</Text>
              <Text style={styles.routeLabel}>Temps al volant</Text>
            </View>
          </View>
          <View style={[styles.routeGrid, { marginTop: 8 }]}>
            <View style={styles.routeCol}>
              <Text style={styles.routeVal}>{routeStats.maxSpeedKmh} km/h</Text>
              <Text style={styles.routeLabel}>Vel. punta màxima</Text>
            </View>
            <View style={styles.routeCol}>
              <Text style={styles.routeVal}>{routeStats.avgSpeedKmh} km/h</Text>
              <Text style={styles.routeLabel}>Vel. mitjana anual</Text>
            </View>
          </View>
        </View>
      )}

      {/* Secondary Numeric Fields (e.g. Fuel price & total cost) */}
      {secondaryFields && secondaryFields.length > 0 && (
        <View style={styles.secondaryFieldsBox}>
          {secondaryFields.map((field) => (
            <View key={field.fieldId} style={styles.secondaryFieldRow}>
              <Ionicons name="pricetag" size={14} color={stat.color} />
              <Text style={styles.secondaryFieldText}>
                {field.label}:{' '}
                <Text style={{ fontWeight: '800', color: Colors.text }}>
                  {field.average} {field.unit || ''} (mitjana)
                </Text>
                {field.total > 0 && field.unit === '€' ? ` • Total: ${field.total} €` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Subcategory Highlight & Breakdown */}
      {subcategories && subcategories.length > 0 && (
        <View style={styles.subcategoriesSection}>
          {topSubcategory && (
            <View style={styles.topSubcatBanner}>
              <Ionicons name="ribbon" size={16} color={stat.color} />
              <Text style={styles.topSubcatText}>
                Preferit: <Text style={{ fontWeight: '800', color: Colors.text }}>{topSubcategory.category}</Text>{' '}
                ({topSubcategory.percentage}% del total)
              </Text>
            </View>
          )}

          <View style={styles.subcatsBarsContainer}>
            {subcategories.slice(0, 4).map((sub) => (
              <View key={sub.category} style={styles.subcatBarRow}>
                <View style={styles.subcatInfoRow}>
                  <Text style={styles.subcatName}>{sub.category}</Text>
                  <Text style={styles.subcatCount}>
                    {sub.count} ({sub.percentage}%)
                  </Text>
                </View>
                <View style={styles.subcatTrack}>
                  <View
                    style={[
                      styles.subcatFill,
                      { width: `${sub.percentage}%`, backgroundColor: stat.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

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
  routeHighlightBox: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeCol: {
    flex: 1,
    alignItems: 'center',
  },
  routeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  routeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  secondaryFieldsBox: {
    marginTop: 12,
    gap: 6,
  },
  secondaryFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.inputBg,
    padding: 10,
    borderRadius: 8,
  },
  secondaryFieldText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subcategoriesSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  topSubcatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  topSubcatText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subcatsBarsContainer: {
    gap: 8,
  },
  subcatBarRow: {
    gap: 4,
  },
  subcatInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subcatName: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  subcatCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  subcatTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  subcatFill: {
    height: '100%',
    borderRadius: 3,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
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
