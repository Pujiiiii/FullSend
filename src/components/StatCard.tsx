import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatWithStats } from '../types/database';
import { Colors } from '../utils/theme';
import { CustomFieldsInput } from './CustomFieldsInput';
import { GpsRouteTrackerModal } from './GpsRouteTrackerModal';

interface StatCardProps {
  stat: StatWithStats;
  onQuickLog: (value: number, note?: string, metadata?: Record<string, any>) => void;
}

export const StatCard: React.FC<StatCardProps> = ({ stat, onQuickLog }) => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [gpsModalVisible, setGpsModalVisible] = useState(false);

  const hasCustomFields = stat.fields_config && stat.fields_config.length > 0;

  const handleQuickAdd = () => {
    if (stat.type === 'route') {
      setGpsModalVisible(true);
      return;
    }

    if (hasCustomFields) {
      setIsInputOpen(!isInputOpen);
      return;
    }

    if (stat.type === 'counter') {
      onQuickLog(1);
    } else if (stat.type === 'boolean') {
      onQuickLog(1, 'Completat avui');
    } else {
      setIsInputOpen(!isInputOpen);
    }
  };

  const handleCustomSubmit = () => {
    let val = 1;
    if (stat.type === 'numeric' || stat.type === 'rating') {
      val = parseFloat(inputValue.replace(',', '.'));
      if (isNaN(val)) {
        Alert.alert('Valor invàlid', 'Introdueix un número vàlid');
        return;
      }
    } else if (stat.type === 'counter') {
      val = inputValue ? parseFloat(inputValue.replace(',', '.')) : 1;
      if (isNaN(val)) val = 1;
    }

    onQuickLog(val, inputNote || undefined, Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined);
    setInputValue('');
    setInputNote('');
    setCustomFieldValues({});
    setIsInputOpen(false);
  };

  const progressPercent = stat.target_value
    ? Math.min(100, Math.round((stat.currentYearTotal / stat.target_value) * 100))
    : null;

  return (
    <View style={[styles.card, { borderLeftColor: stat.color, borderLeftWidth: 4 }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/stat/${stat.id}` as any)}
        style={styles.cardHeader}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{stat.icon || '📊'}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {stat.name}
          </Text>
          <Text style={styles.meta}>
            {stat.type === 'counter' && 'Comptador'}
            {stat.type === 'numeric' && `Mesura (${stat.unit || ''})`}
            {stat.type === 'boolean' && 'Hàbit diari'}
            {stat.type === 'rating' && 'Puntuació mitjana'}
            {stat.type === 'route' && 'Ruta amb GPS (km)'}
            {hasCustomFields && ' • Camps extres'}
          </Text>
        </View>

        <View style={styles.valueContainer}>
          <Text style={[styles.currentValue, { color: stat.color }]}>
            {stat.currentYearTotal}
            {stat.unit ? <Text style={styles.unit}> {stat.unit}</Text> : null}
          </Text>
          <Text style={styles.subtext}>any natural</Text>
        </View>
      </TouchableOpacity>

      {/* Target progress */}
      {stat.target_value && progressPercent !== null && (
        <View style={styles.progressSection}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: stat.color },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stat.currentYearTotal} / {stat.target_value} ({progressPercent}%)
          </Text>
        </View>
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        <View style={styles.allTimeInfo}>
          <Text style={styles.allTimeText}>
            Històric: <Text style={{ color: Colors.text, fontWeight: 'bold' }}>{stat.allTimeTotal} {stat.unit || ''}</Text>
          </Text>
        </View>

        <View style={styles.actionsGroup}>
          {stat.type === 'route' ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setGpsModalVisible(true)}
              style={[styles.quickAddBtn, { backgroundColor: stat.color }]}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.quickAddBtnText}>Gravar ruta</Text>
            </TouchableOpacity>
          ) : stat.type === 'numeric' || stat.type === 'rating' || hasCustomFields ? (
            <TouchableOpacity
              onPress={() => setIsInputOpen(!isInputOpen)}
              style={[styles.smallBtn, { borderColor: stat.color }]}
            >
              <Ionicons
                name={isInputOpen ? 'close' : 'add'}
                size={18}
                color={stat.color}
              />
              <Text style={[styles.smallBtnText, { color: stat.color }]}>
                {isInputOpen ? 'Tancar' : 'Afegir'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleQuickAdd}
              style={[
                styles.quickAddBtn,
                { backgroundColor: stat.color },
                stat.todayLogged && stat.type === 'boolean' && styles.alreadyDoneBtn,
              ]}
            >
              <Ionicons
                name={stat.type === 'boolean' ? (stat.todayLogged ? 'checkmark-circle' : 'checkmark') : 'add'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.quickAddBtnText}>
                {stat.type === 'boolean'
                  ? stat.todayLogged
                    ? 'Completat!'
                    : 'Marcar avui'
                  : '+1'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Expanded Custom Input */}
      {isInputOpen && (
        <View style={styles.inputDropdown}>
          {hasCustomFields && (
            <CustomFieldsInput
              fields={stat.fields_config || []}
              values={customFieldValues}
              onChangeValues={setCustomFieldValues}
              accentColor={stat.color}
            />
          )}

          <View style={styles.inputsRow}>
            {(stat.type === 'numeric' || stat.type === 'rating') && (
              <TextInput
                style={styles.numericInput}
                placeholder={stat.type === 'rating' ? 'Puntuació (1-5)' : `Valor (${stat.unit || 'num'})`}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={inputValue}
                onChangeText={setInputValue}
              />
            )}
            <TextInput
              style={styles.noteInput}
              placeholder="Nota opcional..."
              placeholderTextColor={Colors.textMuted}
              value={inputNote}
              onChangeText={setInputNote}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: stat.color }]}
            onPress={handleCustomSubmit}
          >
            <Text style={styles.submitButtonText}>Desar entrada</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* GPS Route Tracker Modal */}
      <GpsRouteTrackerModal
        visible={gpsModalVisible}
        onClose={() => setGpsModalVisible(false)}
        statName={stat.name}
        themeColor={stat.color}
        onFinishRoute={(route) => {
          onQuickLog(
            route.distance_km,
            `Trajecte de ${route.distance_km} km (${Math.round(route.duration_seconds / 60)} min)`,
            route
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  subtext: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginTop: 12,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 3,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  allTimeInfo: {
    flex: 1,
  },
  allTimeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  alreadyDoneBtn: {
    opacity: 0.7,
  },
  quickAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  inputDropdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  numericInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteInput: {
    flex: 2,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
