import { StatDefinition, StatEntry } from '../types/database';

export const INITIAL_DEMO_STATS: StatDefinition[] = [
  {
    id: 'demo-1',
    user_id: 'demo-user',
    name: 'Cafès presos',
    description: 'Nombre de cafès presos durant el dia',
    icon: '☕',
    color: '#F59E0B',
    type: 'counter',
    unit: 'tasses',
    target_value: 365,
    target_period: 'yearly',
    aggregation: 'sum',
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    user_id: 'demo-user',
    name: 'Kms correguts',
    description: 'Distància total en entrenaments de running',
    icon: '🏃',
    color: '#10B981',
    type: 'numeric',
    unit: 'km',
    target_value: 500,
    target_period: 'yearly',
    aggregation: 'sum',
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    user_id: 'demo-user',
    name: 'Llibres llegits',
    description: 'Llibres completats',
    icon: '📚',
    color: '#6366F1',
    type: 'counter',
    unit: 'llibres',
    target_value: 12,
    target_period: 'yearly',
    aggregation: 'sum',
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    user_id: 'demo-user',
    name: 'Hàbit: Meditació',
    description: 'Sessions de 10 min de mindfulness',
    icon: '🧘',
    color: '#EC4899',
    type: 'boolean',
    unit: 'dies',
    target_value: 200,
    target_period: 'yearly',
    aggregation: 'sum',
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    user_id: 'demo-user',
    name: 'Ànim diari',
    description: 'Com m\'he sentit avui (1 a 5)',
    icon: '⭐',
    color: '#8B5CF6',
    type: 'rating',
    unit: 'estrelles',
    target_value: 4,
    target_period: 'daily',
    aggregation: 'avg',
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function generateDemoEntries(): StatEntry[] {
  const entries: StatEntry[] = [];
  const currentYear = new Date().getFullYear();

  // Generate some realistic entries spread across the year
  for (let month = 0; month < 12; month++) {
    // Demo 1: Cafes (approx 20-30 per month)
    const cafesThisMonth = Math.floor(20 + Math.random() * 15);
    for (let i = 0; i < cafesThisMonth; i++) {
      const day = Math.min(28, Math.floor(1 + Math.random() * 27));
      entries.push({
        id: `entry-cafe-${month}-${i}`,
        stat_id: 'demo-1',
        user_id: 'demo-user',
        value: 1,
        note: i % 5 === 0 ? 'Cafè d\'especialitat' : null,
        recorded_at: new Date(currentYear, month, day, 9, 30).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 2: Running (4-8 runs per month, 5-12 km each)
    const runsThisMonth = Math.floor(4 + Math.random() * 5);
    for (let i = 0; i < runsThisMonth; i++) {
      const day = Math.min(28, Math.floor(1 + Math.random() * 27));
      const kms = Number((5 + Math.random() * 7).toFixed(1));
      entries.push({
        id: `entry-run-${month}-${i}`,
        stat_id: 'demo-2',
        user_id: 'demo-user',
        value: kms,
        note: 'Entrenament matinal',
        recorded_at: new Date(currentYear, month, day, 8, 0).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 3: Books (1 every month or two)
    if (month % 2 === 0) {
      entries.push({
        id: `entry-book-${month}`,
        stat_id: 'demo-3',
        user_id: 'demo-user',
        value: 1,
        note: `Llibre #${month / 2 + 1}`,
        recorded_at: new Date(currentYear, month, 25, 21, 0).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 4: Habit meditation (12-20 days per month)
    const medDays = Math.floor(12 + Math.random() * 10);
    for (let i = 0; i < medDays; i++) {
      const day = Math.min(28, Math.floor(1 + Math.random() * 27));
      entries.push({
        id: `entry-med-${month}-${i}`,
        stat_id: 'demo-4',
        user_id: 'demo-user',
        value: 1,
        note: null,
        recorded_at: new Date(currentYear, month, day, 7, 30).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 5: Rating
    const ratingsThisMonth = Math.floor(15 + Math.random() * 10);
    for (let i = 0; i < ratingsThisMonth; i++) {
      const day = Math.min(28, Math.floor(1 + Math.random() * 27));
      const rating = Math.floor(3 + Math.random() * 3); // 3, 4, 5
      entries.push({
        id: `entry-rate-${month}-${i}`,
        stat_id: 'demo-5',
        user_id: 'demo-user',
        value: Math.min(5, rating),
        note: null,
        recorded_at: new Date(currentYear, month, day, 22, 0).toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }

  // Also add some entries for previous year so all-time stats show comparison!
  const prevYear = currentYear - 1;
  for (let month = 0; month < 12; month++) {
    entries.push({
      id: `entry-prev-cafe-${month}`,
      stat_id: 'demo-1',
      user_id: 'demo-user',
      value: 20,
      note: 'Total mes any anterior',
      recorded_at: new Date(prevYear, month, 15).toISOString(),
      created_at: new Date().toISOString(),
    });
    entries.push({
      id: `entry-prev-run-${month}`,
      stat_id: 'demo-2',
      user_id: 'demo-user',
      value: 30,
      note: 'Total kms any anterior',
      recorded_at: new Date(prevYear, month, 15).toISOString(),
      created_at: new Date().toISOString(),
    });
    if (month % 3 === 0) {
      entries.push({
        id: `entry-prev-book-${month}`,
        stat_id: 'demo-3',
        user_id: 'demo-user',
        value: 1,
        note: null,
        recorded_at: new Date(prevYear, month, 20).toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }

  return entries;
}
