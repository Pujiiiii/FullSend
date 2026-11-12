export type StatType = 'counter' | 'numeric' | 'boolean' | 'rating' | 'route';
export type TargetPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AggregationType = 'sum' | 'count' | 'avg' | 'max' | 'min';

export type CustomFieldType = 'select' | 'number' | 'text' | 'rating';

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  unit?: string;
  options?: string[]; // Subcategories or choices
  required?: boolean;
}

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
  fields_config?: CustomFieldDefinition[];
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
  metadata?: Record<string, any>; // e.g. { subcategory: 'Ciència-ficció', price_per_litre: 1.48, distance_km: 42... }
  recorded_at: string;
  created_at: string;
}

export interface StatWithStats extends StatDefinition {
  currentYearTotal: number;
  allTimeTotal: number;
  lastEntryDate?: string | null;
  todayLogged?: boolean;
}

export interface SubcategoryStat {
  category: string;
  count: number;
  percentage: number;
  totalValue: number;
}

export interface SecondaryFieldStat {
  fieldId: string;
  label: string;
  unit?: string;
  total: number;
  average: number;
}

export interface RouteStatsSummary {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
}

export interface YearSummaryItem {
  stat: StatDefinition;
  yearTotal: number;
  yearEntriesCount: number;
  allTimeTotal: number;
  allTimeEntriesCount: number;
  bestMonth?: { month: number; name: string; total: number };
  monthlyTotals: number[];
  subcategories?: SubcategoryStat[];
  topSubcategory?: SubcategoryStat;
  secondaryFields?: SecondaryFieldStat[];
  routeStats?: RouteStatsSummary;
}

export interface YearSummary {
  year: number;
  totalLogs: number;
  activeStatsCount: number;
  stats: YearSummaryItem[];
}
