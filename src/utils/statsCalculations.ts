import { StatDefinition, StatEntry, YearSummary } from '../types/database';
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

  const statsSummaries = stats.map((stat) => {
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

    return {
      stat,
      yearTotal,
      yearEntriesCount: statEntriesThisYear.length,
      allTimeTotal,
      allTimeEntriesCount: statEntriesAllTime.length,
      bestMonth,
      monthlyTotals,
    };
  });

  return {
    year,
    totalLogs: yearEntries.length,
    activeStatsCount: stats.filter((s) => !s.is_archived).length,
    stats: statsSummaries,
  };
}
