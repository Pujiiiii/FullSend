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
    fields_config: [
      {
        id: 'subcat',
        label: 'Tipus de cafè',
        type: 'select',
        options: ['Espresso', 'Tallat', 'Amb llet', 'Especialitat'],
      },
    ],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    user_id: 'demo-user',
    name: 'Llibres llegits',
    description: 'Llibres completats amb gènere',
    icon: '📚',
    color: '#6366F1',
    type: 'counter',
    unit: 'llibres',
    target_value: 12,
    target_period: 'yearly',
    aggregation: 'sum',
    fields_config: [
      {
        id: 'subcat',
        label: 'Gènere',
        type: 'select',
        options: ['Ciència-ficció', 'Novel·la negra', 'Història', 'Fantasia', 'Assaig'],
      },
    ],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    user_id: 'demo-user',
    name: 'Dièsel repostant',
    description: 'Litres de combustible i preu pagat',
    icon: '⛽',
    color: '#EF4444',
    type: 'numeric',
    unit: 'L',
    target_value: 600,
    target_period: 'yearly',
    aggregation: 'sum',
    fields_config: [
      {
        id: 'price_per_litre',
        label: 'Preu per litre',
        type: 'number',
        unit: '€/L',
      },
      {
        id: 'total_cost',
        label: 'Cost total',
        type: 'number',
        unit: '€',
      },
    ],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    user_id: 'demo-user',
    name: 'Rutes en vehicle',
    description: 'Trajectes registrats amb GPS',
    icon: '🚗',
    color: '#10B981',
    type: 'route',
    unit: 'km',
    target_value: 5000,
    target_period: 'yearly',
    aggregation: 'sum',
    fields_config: [],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    user_id: 'demo-user',
    name: 'Refrescos',
    description: 'Consum de refrescos per marca',
    icon: '🥤',
    color: '#06B6D4',
    type: 'counter',
    unit: 'llaunes',
    target_value: null,
    target_period: null,
    aggregation: 'sum',
    fields_config: [
      {
        id: 'subcat',
        label: 'Beguda',
        type: 'select',
        options: ['Coca-cola Zero', 'Fanta Taronja', 'Aquarius', 'Nestea'],
      },
    ],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function generateDemoEntries(): StatEntry[] {
  const entries: StatEntry[] = [];
  const currentYear = new Date().getFullYear();

  const bookGenres = ['Ciència-ficció', 'Novel·la negra', 'Història', 'Fantasia', 'Assaig'];
  const cafeTypes = ['Espresso', 'Tallat', 'Amb llet', 'Especialitat'];
  const sodas = ['Coca-cola Zero', 'Fanta Taronja', 'Aquarius', 'Nestea'];

  for (let month = 0; month < 12; month++) {
    // Demo 1: Cafes
    const cafesThisMonth = Math.floor(18 + Math.random() * 10);
    for (let i = 0; i < cafesThisMonth; i++) {
      const day = Math.min(28, Math.floor(1 + Math.random() * 27));
      const type = cafeTypes[Math.floor(Math.random() * cafeTypes.length)];
      entries.push({
        id: `entry-cafe-${month}-${i}`,
        stat_id: 'demo-1',
        user_id: 'demo-user',
        value: 1,
        note: null,
        metadata: { subcat: type },
        recorded_at: new Date(currentYear, month, day, 9, 30).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 2: Books (1 every month or two)
    if (month % 2 === 0) {
      const genre = bookGenres[Math.floor(Math.random() * bookGenres.length)];
      entries.push({
        id: `entry-book-${month}`,
        stat_id: 'demo-2',
        user_id: 'demo-user',
        value: 1,
        note: `Llibre #${month / 2 + 1}`,
        metadata: { subcat: genre },
        recorded_at: new Date(currentYear, month, 25, 21, 0).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 3: Diesel (1-2 fill-ups per month)
    const fillups = Math.floor(1 + Math.random() * 2);
    for (let f = 0; f < fillups; f++) {
      const litres = Math.floor(40 + Math.random() * 15);
      const pricePerLitre = Number((1.42 + Math.random() * 0.16).toFixed(2));
      const totalCost = Number((litres * pricePerLitre).toFixed(2));
      entries.push({
        id: `entry-diesel-${month}-${f}`,
        stat_id: 'demo-3',
        user_id: 'demo-user',
        value: litres,
        note: 'Repostar dipòsit sencer',
        metadata: {
          price_per_litre: pricePerLitre,
          total_cost: totalCost,
        },
        recorded_at: new Date(currentYear, month, 10 + f * 12, 18, 0).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 4: Vehicle Routes (3-5 trips per month)
    const trips = Math.floor(3 + Math.random() * 3);
    for (let t = 0; t < trips; t++) {
      const dist = Number((15 + Math.random() * 45).toFixed(1));
      const durMinutes = Math.round(dist * 1.2);
      const maxSpd = Math.round(100 + Math.random() * 30);
      const avgSpd = Math.round((dist / (durMinutes / 60)));
      entries.push({
        id: `entry-route-${month}-${t}`,
        stat_id: 'demo-4',
        user_id: 'demo-user',
        value: dist,
        note: 'Trajecte feina / cap de setmana',
        metadata: {
          distance_km: dist,
          duration_seconds: durMinutes * 60,
          max_speed_kmh: maxSpd,
          avg_speed_kmh: avgSpd,
        },
        recorded_at: new Date(currentYear, month, 5 + t * 5, 8, 30).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 5: Sodas
    const sodaCount = Math.floor(4 + Math.random() * 5);
    for (let s = 0; s < sodaCount; s++) {
      const soda = sodas[Math.floor(Math.random() * sodas.length)];
      entries.push({
        id: `entry-soda-${month}-${s}`,
        stat_id: 'demo-5',
        user_id: 'demo-user',
        value: 1,
        note: null,
        metadata: { subcat: soda },
        recorded_at: new Date(currentYear, month, 2 + s * 6, 14, 0).toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }

  return entries;
}
