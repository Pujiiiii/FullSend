import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { StatDefinition, StatEntry, StatWithStats } from '../types/database';
import { INITIAL_DEMO_STATS, generateDemoEntries } from '../lib/demoData';
import { aggregateEntries } from '../utils/statsCalculations';

interface StatsContextType {
  stats: StatDefinition[];
  entries: StatEntry[];
  statsWithCurrentStats: StatWithStats[];
  loading: boolean;
  refreshing: boolean;
  refreshData: () => Promise<void>;
  addStat: (newStat: Omit<StatDefinition, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<StatDefinition>;
  updateStat: (id: string, updates: Partial<StatDefinition>) => Promise<void>;
  deleteStat: (id: string) => Promise<void>;
  addEntry: (
    statId: string,
    value: number,
    note?: string,
    metadata?: Record<string, any>,
    customDate?: Date
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const LOCAL_STATS_KEY = '@statstracker_stats_v2';
const LOCAL_ENTRIES_KEY = '@statstracker_entries_v2';

const StatsContext = createContext<StatsContextType>({} as StatsContextType);

export const useStats = () => useContext(StatsContext);

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDemoMode } = useAuth();
  const [stats, setStats] = useState<StatDefinition[]>([]);
  const [entries, setEntries] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load from local storage or initialize demo
  const loadLocalData = useCallback(async () => {
    try {
      const storedStats = await AsyncStorage.getItem(LOCAL_STATS_KEY);
      const storedEntries = await AsyncStorage.getItem(LOCAL_ENTRIES_KEY);

      if (storedStats && storedEntries) {
        setStats(JSON.parse(storedStats));
        setEntries(JSON.parse(storedEntries));
      } else {
        const demoStats = INITIAL_DEMO_STATS;
        const demoEntries = generateDemoEntries();
        await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(demoStats));
        await AsyncStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(demoEntries));
        setStats(demoStats);
        setEntries(demoEntries);
      }
    } catch (e) {
      console.error('Error loading local stats data:', e);
    }
  }, []);

  // Load from Supabase
  const loadSupabaseData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('stat_definitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statsError) throw statsError;

      const { data: entriesData, error: entriesError } = await supabase
        .from('stat_entries')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (entriesError) throw entriesError;

      setStats(statsData || []);
      setEntries(entriesData || []);
    } catch (e) {
      console.error('Error loading Supabase stats:', e);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    if (isDemoMode || !isSupabaseConfigured() || !user) {
      await loadLocalData();
    } else {
      await loadSupabaseData();
    }
    setRefreshing(false);
  }, [isDemoMode, user, loadLocalData, loadSupabaseData]);

  useEffect(() => {
    setLoading(true);
    refreshData().finally(() => setLoading(false));
  }, [refreshData]);

  // Add a new Stat
  const addStat = async (
    newStatData: Omit<StatDefinition, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<StatDefinition> => {
    const timestamp = new Date().toISOString();

    if (isDemoMode || !isSupabaseConfigured() || !user) {
      const createdStat: StatDefinition = {
        ...newStatData,
        id: `stat-${Date.now()}`,
        user_id: 'local-user',
        created_at: timestamp,
        updated_at: timestamp,
      };
      const updated = [createdStat, ...stats];
      setStats(updated);
      await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(updated));
      return createdStat;
    } else {
      const { data, error } = await supabase
        .from('stat_definitions')
        .insert({
          ...newStatData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setStats((prev) => [data, ...prev]);
      return data;
    }
  };

  // Update Stat
  const updateStat = async (id: string, updates: Partial<StatDefinition>) => {
    const timestamp = new Date().toISOString();

    if (isDemoMode || !isSupabaseConfigured() || !user) {
      const updated = stats.map((s) => (s.id === id ? { ...s, ...updates, updated_at: timestamp } : s));
      setStats(updated);
      await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(updated));
    } else {
      const { error } = await supabase
        .from('stat_definitions')
        .update({ ...updates, updated_at: timestamp })
        .eq('id', id);

      if (error) throw error;
      setStats((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, updated_at: timestamp } : s)));
    }
  };

  // Delete Stat
  const deleteStat = async (id: string) => {
    if (isDemoMode || !isSupabaseConfigured() || !user) {
      const updatedStats = stats.filter((s) => s.id !== id);
      const updatedEntries = entries.filter((e) => e.stat_id !== id);
      setStats(updatedStats);
      setEntries(updatedEntries);
      await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(updatedStats));
      await AsyncStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(updatedEntries));
    } else {
      const { error } = await supabase.from('stat_definitions').delete().eq('id', id);
      if (error) throw error;
      setStats((prev) => prev.filter((s) => s.id !== id));
      setEntries((prev) => prev.filter((e) => e.stat_id !== id));
    }
  };

  // Add an entry (Quick log / custom input / route)
  const addEntry = async (
    statId: string,
    value: number,
    note?: string,
    metadata?: Record<string, any>,
    customDate?: Date
  ) => {
    const recordedAt = customDate ? customDate.toISOString() : new Date().toISOString();
    const createdAt = new Date().toISOString();

    if (isDemoMode || !isSupabaseConfigured() || !user) {
      const newEntry: StatEntry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        stat_id: statId,
        user_id: 'local-user',
        value,
        note: note || null,
        metadata: metadata || {},
        recorded_at: recordedAt,
        created_at: createdAt,
      };
      const updated = [newEntry, ...entries];
      setEntries(updated);
      await AsyncStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(updated));
    } else {
      const { data, error } = await supabase
        .from('stat_entries')
        .insert({
          stat_id: statId,
          user_id: user.id,
          value,
          note: note || null,
          metadata: metadata || {},
          recorded_at: recordedAt,
        })
        .select()
        .single();

      if (error) throw error;
      setEntries((prev) => [data, ...prev]);
    }
  };

  // Delete Entry
  const deleteEntry = async (id: string) => {
    if (isDemoMode || !isSupabaseConfigured() || !user) {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      await AsyncStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(updated));
    } else {
      const { error } = await supabase.from('stat_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const resetDemoData = async () => {
    const demoStats = INITIAL_DEMO_STATS;
    const demoEntries = generateDemoEntries();
    await AsyncStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(demoStats));
    await AsyncStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(demoEntries));
    setStats(demoStats);
    setEntries(demoEntries);
  };

  const currentYear = new Date().getFullYear();
  const todayDateString = new Date().toISOString().split('T')[0];

  const statsWithCurrentStats: StatWithStats[] = stats.map((stat) => {
    const statEntries = entries.filter((e) => e.stat_id === stat.id);
    const thisYearEntries = statEntries.filter(
      (e) => new Date(e.recorded_at).getFullYear() === currentYear
    );

    const currentYearTotal = aggregateEntries(thisYearEntries, stat.aggregation);
    const allTimeTotal = aggregateEntries(statEntries, stat.aggregation);

    const todayLogged = statEntries.some(
      (e) => e.recorded_at.split('T')[0] === todayDateString
    );

    const sortedEntries = [...statEntries].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );

    return {
      ...stat,
      currentYearTotal,
      allTimeTotal,
      lastEntryDate: sortedEntries.length > 0 ? sortedEntries[0].recorded_at : null,
      todayLogged,
    };
  });

  return (
    <StatsContext.Provider
      value={{
        stats,
        entries,
        statsWithCurrentStats,
        loading,
        refreshing,
        refreshData,
        addStat,
        updateStat,
        deleteStat,
        addEntry,
        deleteEntry,
        resetDemoData,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
};
