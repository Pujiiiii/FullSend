export type StatType = 'counter' | 'numeric' | 'boolean' | 'rating';
export type TargetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AggregationType = 'sum' | 'count' | 'avg' | 'max' | 'min';

export interface StatDefinition {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  type: StatType;
  unit?: string | null;
  target_value?: number | null;
  target_period?: TargetPeriod | null;
  aggregation: AggregationType;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatEntry {
  id: string;
  stat_id: string;
  user_id: string;
  value: number;
  note?: string | null;
  recorded_at: string;
  created_at: string;
}

export interface StatWithStats extends StatDefinition {
  currentYearTotal: number;
  allTimeTotal: number;
  lastEntryDate?: string | null;
  todayLogged?: boolean;
}

export interface YearSummary {
  year: number;
  totalLogs: number;
  activeStatsCount: number;
  stats: {
    stat: StatDefinition;
    yearTotal: number;
    yearEntriesCount: number;
    allTimeTotal: number;
    allTimeEntriesCount: number;
    bestMonth?: { month: number; name: string; total: number };
    monthlyTotals: number[]; // 12 elements
  }[];
}
