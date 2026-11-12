import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/StatCard';
import { Colors } from '../../utils/theme';

export default function HomeScreen() {
  const { statsWithCurrentStats, refreshing, refreshData, addEntry } = useStats();
  const { isDemoMode } = useAuth();

  // Current formatted date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('ca-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const activeStats = statsWithCurrentStats.filter((s) => !s.is_archived);

  return (
    <View style={styles.container}>
      {/* Demo Mode Notice */}
      {isDemoMode && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/settings' as any)}
          style={styles.demoNotice}
        >
          <Ionicons name="information-circle" size={18} color="#F59E0B" />
          <Text style={styles.demoNoticeText} numberOfLines={2}>
            Mode local / demo actiu. Toca aquí per connectar Supabase.
          </Text>
        </TouchableOpacity>
      )}

      {/* Header bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.titleText}>El teu dia a dia</Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/stat/new' as any)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Nova Stat</Text>
        </TouchableOpacity>
      </View>

      {/* Stats List */}
      <FlatList
        data={activeStats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StatCard
            stat={item}
            onQuickLog={(value, note, metadata) => addEntry(item.id, value, note, metadata)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            tintColor={Colors.primaryLight}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>Encara no tens cap mètrica!</Text>
            <Text style={styles.emptySubtitle}>
              Crea el teu primer comptador o mesura (cafès, hores d'estudi, esport, diners...)
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/stat/new' as any)}
            >
              <Text style={styles.emptyButtonText}>Crear la primera mètrica</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
    gap: 8,
  },
  demoNoticeText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

