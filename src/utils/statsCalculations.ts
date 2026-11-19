import {
  StatDefinition,
  StatEntry,
  YearSummary,
  YearSummaryItem,
  SubcategoryStat,
  SecondaryFieldStat,
  RouteStatsSummary,
} from '../types/database';
import { MonthNames } from './theme';

export function aggregateEntries(
  entries: StatEntry[],
  aggregation: StatDefinition['aggregation'] = 'sum'
): number {
  if (entries.length === 0) return 0;

  switch (aggregation) {
    case 'count':
      return entries.length;
    case 'avg': {
      const sum = entries.reduce((acc, curr) => acc + curr.value, 0);
      return Number((sum / entries.length).toFixed(1));
    }
    case 'max':
      return Math.max(...entries.map((e) => e.value));
    case 'min':
      return Math.min(...entries.map((e) => e.value));
    case 'sum':
    default:
      return Number(entries.reduce((acc, curr) => acc + curr.value, 0).toFixed(2));
  }
}

export function filterEntriesByYear(entries: StatEntry[], year: number): StatEntry[] {
  return entries.filter((entry) => {
    const entryYear = new Date(entry.recorded_at).getFullYear();
    return entryYear === year;
  });
}

export function calculateYearSummary(
  stats: StatDefinition[],
  allEntries: StatEntry[],
  year: number
): YearSummary {
  const yearEntries = filterEntriesByYear(allEntries, year);

  const statsSummaries: YearSummaryItem[] = stats.map((stat) => {
    const statEntriesAllTime = allEntries.filter((e) => e.stat_id === stat.id);
    const statEntriesThisYear = yearEntries.filter((e) => e.stat_id === stat.id);

    const yearTotal = aggregateEntries(statEntriesThisYear, stat.aggregation);
    const allTimeTotal = aggregateEntries(statEntriesAllTime, stat.aggregation);

    // Monthly breakdown (0 = Jan, 11 = Dec)
    const monthlyTotals = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);

    statEntriesThisYear.forEach((entry) => {
      const month = new Date(entry.recorded_at).getMonth();
      monthlyCounts[month] += 1;
      monthlyTotals[month] += entry.value;
    });

    if (stat.aggregation === 'avg') {
      for (let m = 0; m < 12; m++) {
        if (monthlyCounts[m] > 0) {
          monthlyTotals[m] = Number((monthlyTotals[m] / monthlyCounts[m]).toFixed(1));
        }
      }
    } else if (stat.aggregation === 'count') {
      for (let m = 0; m < 12; m++) {
        monthlyTotals[m] = monthlyCounts[m];
      }
    }

    let bestMonthIndex = -1;
    let bestMonthVal = -Infinity;
    for (let m = 0; m < 12; m++) {
      if (monthlyCounts[m] > 0 && monthlyTotals[m] > bestMonthVal) {
        bestMonthVal = monthlyTotals[m];
        bestMonthIndex = m;
      }
    }

    const bestMonth =
      bestMonthIndex >= 0
        ? {
            month: bestMonthIndex,
            name: MonthNames[bestMonthIndex],
            total: bestMonthVal,
          }
        : undefined;

    // Subcategories breakdown (from custom 'select' fields)
    let subcategories: SubcategoryStat[] | undefined = undefined;
    let topSubcategory: SubcategoryStat | undefined = undefined;

    const selectField = stat.fields_config?.find((f) => f.type === 'select');
    if (selectField) {
      const catCounts: { [cat: string]: { count: number; totalValue: number } } = {};
      let totalAssigned = 0;

      statEntriesThisYear.forEach((entry) => {
        const catVal = entry.metadata?.[selectField.id];
        if (catVal) {
          if (!catCounts[catVal]) {
            catCounts[catVal] = { count: 0, totalValue: 0 };
          }
          catCounts[catVal].count += 1;
          catCounts[catVal].totalValue += entry.value;
          totalAssigned += 1;
        }
      });

      if (totalAssigned > 0) {
        subcategories = Object.entries(catCounts).map(([category, data]) => ({
          category,
          count: data.count,
          percentage: Math.round((data.count / totalAssigned) * 100),
          totalValue: Number(data.totalValue.toFixed(1)),
        })).sort((a, b) => b.count - a.count);

        topSubcategory = subcategories[0];
      }
    }

    // Secondary Numeric Fields Analysis (e.g. price per litre, total € cost)
    let secondaryFields: SecondaryFieldStat[] | undefined = undefined;
    const numericFields = stat.fields_config?.filter((f) => f.type === 'number');
    if (numericFields && numericFields.length > 0) {
      secondaryFields = numericFields.map((field) => {
        let sum = 0;
        let count = 0;
        statEntriesThisYear.forEach((entry) => {
          const val = entry.metadata?.[field.id];
          if (typeof val === 'number') {
            sum += val;
            count += 1;
          }
        });
        const average = count > 0 ? Number((sum / count).toFixed(2)) : 0;
        return {
          fieldId: field.id,
          label: field.label,
          unit: field.unit,
          total: Number(sum.toFixed(2)),
          average,
        };
      }).filter((f) => f.total > 0 || f.average > 0);
    }

    // Route Stats Summary (for route stats)
    let routeStats: RouteStatsSummary | undefined = undefined;
    if (stat.type === 'route') {
      let totalDist = 0;
      let totalDurationSec = 0;
      let maxSpeed = 0;
      let totalElevationGain = 0;
      let totalElevationLoss = 0;

      statEntriesThisYear.forEach((entry) => {
        const dist = entry.metadata?.distance_km ?? entry.value;
        const dur = entry.metadata?.duration_seconds ?? 0;
        const spd = entry.metadata?.max_speed_kmh ?? 0;
        const gain = entry.metadata?.elevation_gain_m ?? 0;
        const loss = entry.metadata?.elevation_loss_m ?? 0;

        totalDist += dist;
        totalDurationSec += dur;
        if (spd > maxSpeed) maxSpeed = spd;
        totalElevationGain += gain;
        totalElevationLoss += loss;
      });

      const totalHours = totalDurationSec / 3600;
      const overallAvgSpeed = totalHours > 0 ? Number((totalDist / totalHours).toFixed(1)) : 0;

      routeStats = {
        totalDistanceKm: Number(totalDist.toFixed(1)),
        totalDurationMinutes: Math.round(totalDurationSec / 60),
        maxSpeedKmh: maxSpeed,
        avgSpeedKmh: overallAvgSpeed,
        totalElevationGainM: Math.round(totalElevationGain),
        totalElevationLossM: Math.round(totalElevationLoss),
      };
    }

    return {
      stat,
      yearTotal,
      yearEntriesCount: statEntriesThisYear.length,
      allTimeTotal,
      allTimeEntriesCount: statEntriesAllTime.length,
      bestMonth,
      monthlyTotals,
      subcategories,
      topSubcategory,
      secondaryFields,
      routeStats,
    };
  });

  return {
    year,
    totalLogs: yearEntries.length,
    activeStatsCount: stats.filter((s) => !s.is_archived).length,
    stats: statsSummaries,
  };
}
