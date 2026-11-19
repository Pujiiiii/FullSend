import { StatDefinition, StatEntry } from '../types/database';

export const INITIAL_DEMO_STATS: StatDefinition[] = [
  {
    id: 'demo-1',
    user_id: 'demo-user',
    name: 'Cotxe Diari',
    description: 'Vehicle principal de carretera',
    icon: '🏎️',
    color: '#CCFF00',
    type: 'route',
    unit: 'km',
    target_value: 12000,
    target_period: 'yearly',
    aggregation: 'sum',
    fields_config: [
      {
        id: 'price_per_litre',
        label: 'Preu combustible',
        type: 'number',
        unit: '€/L',
      },
    ],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    user_id: 'demo-user',
    name: 'Moto de Portes',
    description: 'Rutes de cap de setmana i revolts',
    icon: '🏍️',
    color: '#38BDF8',
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
    id: 'demo-3',
    user_id: 'demo-user',
    name: 'Esquí Alpí & Freeride',
    description: 'Pistes d\'esquí i descensos',
    icon: '⛷️',
    color: '#EF4444',
    type: 'route',
    unit: 'km',
    target_value: 800,
    target_period: 'yearly',
    aggregation: 'sum',
    fields_config: [],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    user_id: 'demo-user',
    name: '4x4 Offroad',
    description: 'Pistes de terra i expedicions de muntanya',
    icon: '🚙',
    color: '#F59E0B',
    type: 'route',
    unit: 'km',
    target_value: 3000,
    target_period: 'yearly',
    aggregation: 'sum',
    fields_config: [],
    is_archived: false,
    created_at: new Date(2025, 0, 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function generateDemoEntries(): StatEntry[] {
  const entries: StatEntry[] = [];
  const currentYear = new Date().getFullYear();

  for (let month = 0; month < 12; month++) {
    // Demo 1: Cotxe (3-5 sessions/month)
    const carTrips = Math.floor(3 + Math.random() * 3);
    for (let t = 0; t < carTrips; t++) {
      const dist = Number((25 + Math.random() * 60).toFixed(1));
      const durMinutes = Math.round(dist * 1.1);
      const maxSpd = Math.round(110 + Math.random() * 35);
      const avgSpd = Math.round(dist / (durMinutes / 60));
      const elevGain = Math.round(120 + Math.random() * 350);
      const elevLoss = Math.round(110 + Math.random() * 340);

      entries.push({
        id: `entry-car-${month}-${t}`,
        stat_id: 'demo-1',
        user_id: 'demo-user',
        value: dist,
        note: 'Ruta interurbana / autopista',
        metadata: {
          distance_km: dist,
          duration_seconds: durMinutes * 60,
          max_speed_kmh: maxSpd,
          avg_speed_kmh: avgSpd,
          elevation_gain_m: elevGain,
          elevation_loss_m: elevLoss,
          price_per_litre: 1.52,
        },
        recorded_at: new Date(currentYear, month, 3 + t * 6, 9, 30).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Demo 2: Moto (Spring/Summer/Autumn heavier)
    if (month >= 2 && month <= 10) {
      const motoTrips = Math.floor(2 + Math.random() * 3);
      for (let m = 0; m < motoTrips; m++) {
        const dist = Number((40 + Math.random() * 90).toFixed(1));
        const durMinutes = Math.round(dist * 1.3);
        const maxSpd = Math.round(105 + Math.random() * 40);
        const avgSpd = Math.round(dist / (durMinutes / 60));
        const elevGain = Math.round(450 + Math.random() * 800);
        const elevLoss = Math.round(440 + Math.random() * 790);

        entries.push({
          id: `entry-moto-${month}-${m}`,
          stat_id: 'demo-2',
          user_id: 'demo-user',
          value: dist,
          note: 'Sortida de ports de muntanya',
          metadata: {
            distance_km: dist,
            duration_seconds: durMinutes * 60,
            max_speed_kmh: maxSpd,
            avg_speed_kmh: avgSpd,
            elevation_gain_m: elevGain,
            elevation_loss_m: elevLoss,
          },
          recorded_at: new Date(currentYear, month, 6 + m * 8, 10, 15).toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }

    // Demo 3: Ski (Winter months: Dec, Jan, Feb, Mar, Apr)
    if (month === 0 || month === 1 || month === 2 || month === 3 || month === 11) {
      const skiDays = Math.floor(2 + Math.random() * 3);
      for (let s = 0; s < skiDays; s++) {
        const dist = Number((18 + Math.random() * 35).toFixed(1));
        const durMinutes = Math.round(210 + Math.random() * 90);
        const maxSpd = Math.round(62 + Math.random() * 28);
        const avgSpd = Math.round(dist / (durMinutes / 60));
        const elevLoss = Math.round(2400 + Math.random() * 3000);

        entries.push({
          id: `entry-ski-${month}-${s}`,
          stat_id: 'demo-3',
          user_id: 'demo-user',
          value: dist,
          note: 'Jornada d\'esquí a pistes',
          metadata: {
            distance_km: dist,
            duration_seconds: durMinutes * 60,
            max_speed_kmh: maxSpd,
            avg_speed_kmh: avgSpd,
            elevation_gain_m: 80,
            elevation_loss_m: elevLoss,
          },
          recorded_at: new Date(currentYear, month, 8 + s * 7, 11, 0).toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return entries;
}
