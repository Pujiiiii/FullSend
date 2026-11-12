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
import { useStats } from '../../context/StatsContext';
import { StatType } from '../../types/database';
import { IconPicker } from '../../components/IconPicker';
import { ColorPicker } from '../../components/ColorPicker';
import { Colors } from '../../utils/theme';

export default function NewStatScreen() {
  const { addStat } = useStats();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📊');
  const [color, setColor] = useState('#6366F1');
  const [type, setType] = useState<StatType>('counter');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statTypes: { type: StatType; label: string; desc: string; defaultUnit?: string }[] = [
    {
      type: 'counter',
      label: 'Comptador (+1)',
      desc: 'Ideal per a cafès, llibres, pel·lícules, cerveses, etc.',
      defaultUnit: 'vegades',
    },
    {
      type: 'numeric',
      label: 'Mesura numèrica',
      desc: 'Valors decimals o totals: km de running, diners estalviats, hores de son...',
      defaultUnit: 'km',
    },
    {
      type: 'boolean',
      label: 'Hàbit / Check diari',
      desc: 'Per fer seguiment diari de sí/no: meditar, entrenar, beure aigua...',
      defaultUnit: 'dies',
    },
    {
      type: 'rating',
      label: 'Puntuació (1 a 5)',
      desc: 'Valora el teu ànim, productivitat, energia de cada dia...',
      defaultUnit: 'estrelles',
    },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nom', 'Introdueix un nom per a la mètrica');
      return;
    }

    try {
      setSubmitting(true);
      const parsedTarget = targetValue ? parseFloat(targetValue.replace(',', '.')) : null;

      await addStat({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
        type,
        unit: type === 'counter' ? unit.trim() || 'vegades' : unit.trim() || null,
        target_value: !isNaN(parsedTarget as number) ? parsedTarget : null,
        target_period: parsedTarget ? 'yearly' : null,
        aggregation: type === 'rating' ? 'avg' : 'sum',
        is_archived: false,
      });

      router.back();
    } catch (error: any) {
      Alert.alert('Error creant la mètrica', error.message || 'Error desconegut');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Defineix la teva nova Stat</Text>

      {/* Name Input */}
      <Text style={styles.label}>Nom de la mètrica *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Cafès presos, Kms correguts, Llibres llegits..."
        placeholderTextColor={Colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      {/* Description Input */}
      <Text style={styles.label}>Descripció (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Totes les tasses preses durant el dia..."
        placeholderTextColor={Colors.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      {/* Type Selector */}
      <Text style={styles.label}>Com es comptabilitzarà?</Text>
      <View style={styles.typesGrid}>
        {statTypes.map((t) => (
          <TouchableOpacity
            key={t.type}
            style={[styles.typeCard, type === t.type && styles.selectedTypeCard]}
            onPress={() => {
              setType(t.type);
              if (t.defaultUnit && !unit) setUnit(t.defaultUnit);
            }}
          >
            <View style={styles.typeHeader}>
              <Text style={[styles.typeTitle, type === t.type && styles.selectedTypeTitle]}>
                {t.label}
              </Text>
              {type === t.type && <Text style={{ color: Colors.primaryLight }}>✓</Text>}
            </View>
            <Text style={styles.typeDesc}>{t.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Unit Input if relevant */}
      {(type === 'numeric' || type === 'counter') && (
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Unitat de mesura</Text>
          <TextInput
            style={styles.input}
            placeholder={type === 'numeric' ? 'Ex: km, hores, €, pàgines...' : 'Ex: llibres, cafès...'}
            placeholderTextColor={Colors.textMuted}
            value={unit}
            onChangeText={setUnit}
          />
        </View>
      )}

      {/* Target Input */}
      <View style={{ marginTop: 6 }}>
        <Text style={styles.label}>Objectiu anual opcional</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 500 (per a 500 km) o 15 (per a 15 llibres)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          value={targetValue}
          onChangeText={setTargetValue}
        />
      </View>

      {/* Icon Picker */}
      <IconPicker selectedIcon={icon} onSelectIcon={setIcon} />

      {/* Custom Emoji Input */}
      <View style={styles.customEmojiRow}>
        <Text style={styles.customEmojiLabel}>O escriu el teu propi emoji:</Text>
        <TextInput
          style={styles.emojiInput}
          value={icon}
          onChangeText={(val) => {
            if (val) setIcon(val);
          }}
          maxLength={4}
        />
      </View>

      {/* Color Picker */}
      <ColorPicker selectedColor={color} onSelectColor={setColor} />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitButtonText}>
          {submitting ? 'Creant mètrica...' : 'Crear Mètrica'}
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
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    marginBottom: 16,
  },
  typesGrid: {
    gap: 10,
    marginBottom: 10,
  },
  typeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  selectedTypeCard: {
    borderColor: Colors.primaryLight,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  selectedTypeTitle: {
    color: Colors.primaryLight,
  },
  typeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  customEmojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  customEmojiLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emojiInput: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
    fontSize: 20,
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
