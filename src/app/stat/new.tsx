import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../context/StatsContext';
import { CustomFieldDefinition } from '../../types/database';
import { ColorPicker } from '../../components/ColorPicker';
import { Colors } from '../../utils/theme';

const VEHICLE_PRESETS = [
  {
    type: 'car',
    name: 'Cotxe',
    icon: '🚗',
    color: '#CCFF00', // Electric Lime
    desc: 'Ideal per a rutes de carretera, viatges i consum de benzina.',
    fuelTracking: true,
  },
  {
    type: 'moto',
    name: 'Moto',
    icon: '🏍️',
    color: '#F97316', // Orange
    desc: 'Rutes de corbes, caps de setmana i velocitats punta.',
    fuelTracking: true,
  },
  {
    type: 'offroad',
    name: '4x4 / Offroad',
    icon: '🚙',
    color: '#10B981', // Emerald
    desc: 'Pistes de terra, fang, rutes de muntanya i desnivells.',
    fuelTracking: true,
  },
  {
    type: 'ski',
    name: 'Esquí / Snowboard',
    icon: '⛷️',
    color: '#38BDF8', // Ice Cyan
    desc: 'Dies d\'esquí, pistes, velocitat màxima i descens acumulat (-D).',
    fuelTracking: false,
  },
  {
    type: 'quad',
    name: 'Quad / Buggy',
    icon: '🚜',
    color: '#EAB308', // Yellow
    desc: 'Vehicles lleugers de camp i circuits.',
    fuelTracking: true,
  },
  {
    type: 'other',
    name: 'Altra Màquina',
    icon: '⚡',
    color: '#8B5CF6', // Purple
    desc: 'Karts, motos d\'aigua, bicis o qualsevol altra màquina.',
    fuelTracking: false,
  },
];

export default function NewVehicleScreen() {
  const { addStat } = useStats();

  const [selectedPreset, setSelectedPreset] = useState(VEHICLE_PRESETS[0]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🚗');
  const [color, setColor] = useState('#CCFF00');
  const [targetKm, setTargetKm] = useState('');
  const [trackFuel, setTrackFuel] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectPreset = (preset: typeof VEHICLE_PRESETS[0]) => {
    setSelectedPreset(preset);
    setName(preset.name);
    setIcon(preset.icon);
    setColor(preset.color);
    setTrackFuel(preset.fuelTracking);
  };

  const handleSubmit = async () => {
    const finalName = name.trim() || selectedPreset.name;
    if (!finalName) {
      Alert.alert('Falta el nom', 'Introdueix un nom per al vehicle o esport.');
      return;
    }

    try {
      setSubmitting(true);
      const parsedTarget = targetKm ? parseFloat(targetKm.replace(',', '.')) : null;

      // Build fields_config for fuel if enabled
      const fieldsConfig: CustomFieldDefinition[] = [];
      if (trackFuel) {
        fieldsConfig.push({
          id: 'price_per_litre',
          label: 'Preu per litre',
          type: 'number',
          unit: '€/L',
        });
        fieldsConfig.push({
          id: 'total_cost',
          label: 'Cost total del dipòsit',
          type: 'number',
          unit: '€',
        });
      }

      await addStat({
        name: finalName,
        description: description.trim() || null,
        icon,
        color,
        type: 'route',
        unit: 'km',
        target_value: !isNaN(parsedTarget as number) ? parsedTarget : null,
        target_period: parsedTarget ? 'yearly' : null,
        aggregation: 'sum',
        fields_config: fieldsConfig,
        is_archived: false,
      });

      router.back();
    } catch (error: any) {
      Alert.alert('Error creant el vehicle', error.message || 'Error desconegut');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Tria el tipus de màquina</Text>
      <View style={styles.presetGrid}>
        {VEHICLE_PRESETS.map((preset) => {
          const isSelected = selectedPreset.type === preset.type;
          return (
            <TouchableOpacity
              key={preset.type}
              style={[
                styles.presetCard,
                isSelected && { borderColor: preset.color, backgroundColor: 'rgba(255,255,255,0.06)' },
              ]}
              onPress={() => handleSelectPreset(preset)}
            >
              <Text style={styles.presetIcon}>{preset.icon}</Text>
              <Text style={[styles.presetName, isSelected && { color: preset.color, fontWeight: '800' }]}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Details */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Nom del vehicle o activitat *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: BMW M3, Yamaha MT-07, Esquí Grandvalira..."
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.inputLabel}>Descripció o model (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 2024, dièsel, taula all-mountain..."
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.inputLabel}>Objectiu de quilòmetres anuals (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 15000 (km aquest any)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          value={targetKm}
          onChangeText={setTargetKm}
        />

        {/* Fuel tracking toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setTrackFuel(!trackFuel)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>⛽ Registrar despeses de combustible</Text>
            <Text style={styles.toggleSub}>
              Permet apuntar el preu per litre (€/L) i cost en cada repostatge.
            </Text>
          </View>
          <Ionicons
            name={trackFuel ? 'checkbox' : 'square-outline'}
            size={24}
            color={trackFuel ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {/* Color Accent Picker */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Color d'accent Full Send</Text>
        <ColorPicker selectedColor={color} onSelectColor={setColor} />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: color || Colors.primary }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Creant...' : 'Afegir al Garatge 🏎️'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  presetCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  presetIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  toggleSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
