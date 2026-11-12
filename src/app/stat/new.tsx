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
import { StatType, CustomFieldDefinition } from '../../types/database';
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

  // Subcategories builder
  const [hasSubcategories, setHasSubcategories] = useState(false);
  const [subcategoryLabel, setSubcategoryLabel] = useState('Subcategoria');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubcategoryText, setNewSubcategoryText] = useState('');

  // Secondary numeric fields builder
  const [secondaryFields, setSecondaryFields] = useState<{ id: string; label: string; unit: string }[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const statTypes: { type: StatType; label: string; desc: string; defaultUnit?: string; defaultIcon?: string }[] = [
    {
      type: 'counter',
      label: 'Comptador (+1)',
      desc: 'Ideal per a cafès, llibres, pel·lícules, refrescos...',
      defaultUnit: 'vegades',
      defaultIcon: '☕',
    },
    {
      type: 'numeric',
      label: 'Mesura / Quantitat',
      desc: 'Per a valors numèrics: litres de combustible, diners, hores, km...',
      defaultUnit: 'unitats',
      defaultIcon: '⛽',
    },
    {
      type: 'route',
      label: 'Ruta GPS en vehicle',
      desc: 'Mesura automàtica amb GPS: kms, vel. punta, vel. mitja i temps conduït.',
      defaultUnit: 'km',
      defaultIcon: '🚗',
    },
    {
      type: 'boolean',
      label: 'Hàbit / Check diari',
      desc: 'Seguiment diari de sí/no: fer exercici, meditar, beure 2L d\'aigua...',
      defaultUnit: 'dies',
      defaultIcon: '🧘',
    },
    {
      type: 'rating',
      label: 'Puntuació (1 a 5)',
      desc: 'Valora l\'energia, l\'ànim o la qualitat del dia.',
      defaultUnit: 'estrelles',
      defaultIcon: '⭐',
    },
  ];

  const handleAddSubcategory = () => {
    const trimmed = newSubcategoryText.trim();
    if (!trimmed) return;
    if (subcategories.includes(trimmed)) {
      Alert.alert('Opció duplicada', 'Aquesta subcategoria ja està afegida.');
      return;
    }
    setSubcategories([...subcategories, trimmed]);
    setNewSubcategoryText('');
  };

  const handleRemoveSubcategory = (index: number) => {
    setSubcategories(subcategories.filter((_, i) => i !== index));
  };

  const handleAddSecondaryField = () => {
    const label = newFieldLabel.trim();
    if (!label) {
      Alert.alert('Falta el nom', 'Introdueix el nom del camp extra (ex: Preu per litre)');
      return;
    }
    setSecondaryFields([
      ...secondaryFields,
      {
        id: `field_${Date.now()}`,
        label,
        unit: newFieldUnit.trim(),
      },
    ]);
    setNewFieldLabel('');
    setNewFieldUnit('');
    setShowAddField(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nom', 'Introdueix un nom per a la mètrica');
      return;
    }

    try {
      setSubmitting(true);
      const parsedTarget = targetValue ? parseFloat(targetValue.replace(',', '.')) : null;

      // Build fields_config array
      const fieldsConfig: CustomFieldDefinition[] = [];

      if (hasSubcategories && subcategories.length > 0) {
        fieldsConfig.push({
          id: 'subcat',
          label: subcategoryLabel.trim() || 'Subcategoria',
          type: 'select',
          options: subcategories,
        });
      }

      secondaryFields.forEach((f) => {
        fieldsConfig.push({
          id: f.id,
          label: f.label,
          type: 'number',
          unit: f.unit || undefined,
        });
      });

      await addStat({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
        type,
        unit: type === 'route' ? 'km' : unit.trim() || null,
        target_value: !isNaN(parsedTarget as number) ? parsedTarget : null,
        target_period: parsedTarget ? 'yearly' : null,
        aggregation: type === 'rating' ? 'avg' : 'sum',
        fields_config: fieldsConfig,
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
        placeholder="Ex: Llibres llegits, Dièsel repostant, Rutes en cotxe..."
        placeholderTextColor={Colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      {/* Description Input */}
      <Text style={styles.label}>Descripció (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Detall de gèneres, consums o rutes..."
        placeholderTextColor={Colors.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      {/* Type Selector */}
      <Text style={styles.label}>Tipus de mètrica</Text>
      <View style={styles.typesGrid}>
        {statTypes.map((t) => (
          <TouchableOpacity
            key={t.type}
            style={[styles.typeCard, type === t.type && styles.selectedTypeCard]}
            onPress={() => {
              setType(t.type);
              if (t.defaultUnit && !unit) setUnit(t.defaultUnit);
              if (t.defaultIcon && icon === '📊') setIcon(t.defaultIcon);
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
      {type === 'numeric' && (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.label}>Unitat principal de mesura</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: L (litres), km, hores, €, kg..."
            placeholderTextColor={Colors.textMuted}
            value={unit}
            onChangeText={setUnit}
          />
        </View>
      )}

      {/* Target Input */}
      <View style={{ marginTop: 4 }}>
        <Text style={styles.label}>Objectiu anual (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 500 (per a 500 km) o 15 (per a 15 llibres)"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          value={targetValue}
          onChangeText={setTargetValue}
        />
      </View>

      {/* Subcategories Section */}
      <View style={styles.customSection}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.customSectionTitle}>Subcategories o opcions</Text>
            <Text style={styles.customSectionSub}>
              Ex: Gèneres de llibre (Sci-Fi, Novel·la), marques de refresc, etc.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, hasSubcategories && styles.toggleBtnActive]}
            onPress={() => setHasSubcategories(!hasSubcategories)}
          >
            <Text style={[styles.toggleBtnText, hasSubcategories && styles.toggleBtnTextActive]}>
              {hasSubcategories ? 'Activat' : 'Afegir'}
            </Text>
          </TouchableOpacity>
        </View>

        {hasSubcategories && (
          <View style={styles.subcatContainer}>
            <Text style={styles.subcatLabel}>Títol de la categoria:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Gènere, Marca, Tipus..."
              placeholderTextColor={Colors.textMuted}
              value={subcategoryLabel}
              onChangeText={setSubcategoryLabel}
            />

            <Text style={styles.subcatLabel}>Opcions possibles:</Text>
            <View style={styles.addSubcatRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Ex: Ciència-ficció..."
                placeholderTextColor={Colors.textMuted}
                value={newSubcategoryText}
                onChangeText={setNewSubcategoryText}
              />
              <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddSubcategory}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.tagsCloud}>
              {subcategories.map((cat, idx) => (
                <View key={idx} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{cat}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSubcategory(idx)}>
                    <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Secondary Numeric Fields (e.g. Fuel Price & Cost) */}
      <View style={styles.customSection}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.customSectionTitle}>Camps numèrics addicionals</Text>
            <Text style={styles.customSectionSub}>
              Ex: Preu per litre (€/L), Cost total (€), Pàgines...
            </Text>
          </View>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setShowAddField(!showAddField)}
          >
            <Text style={styles.toggleBtnText}>
              {showAddField ? 'Tancar' : '+ Afegir camp'}
            </Text>
          </TouchableOpacity>
        </View>

        {showAddField && (
          <View style={styles.addFieldBox}>
            <TextInput
              style={styles.input}
              placeholder="Nom del camp (ex: Preu per litre)"
              placeholderTextColor={Colors.textMuted}
              value={newFieldLabel}
              onChangeText={setNewFieldLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="Unitat (ex: €/L, €, minuts)"
              placeholderTextColor={Colors.textMuted}
              value={newFieldUnit}
              onChangeText={setNewFieldUnit}
            />
            <TouchableOpacity style={styles.confirmFieldBtn} onPress={handleAddSecondaryField}>
              <Text style={styles.confirmFieldBtnText}>Afegir a la mètrica</Text>
            </TouchableOpacity>
          </View>
        )}

        {secondaryFields.length > 0 && (
          <View style={styles.fieldsList}>
            {secondaryFields.map((f, i) => (
              <View key={f.id} style={styles.fieldItem}>
                <Ionicons name="calculator-outline" size={16} color={Colors.primaryLight} />
                <Text style={styles.fieldItemText}>
                  {f.label} {f.unit ? `(${f.unit})` : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => setSecondaryFields(secondaryFields.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
          {submitting ? 'Creant mètrica...' : 'Crear Mètrica Personalitzada'}
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
    paddingBottom: 50,
  },
  sectionHeader: {
    fontSize: 22,
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
    fontSize: 14,
    marginBottom: 14,
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
  customSection: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  customSectionSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 220,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  subcatContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  subcatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  addSubcatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  addOptionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addFieldBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmFieldBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmFieldBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  fieldsList: {
    marginTop: 12,
    gap: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: 10,
  },
  fieldItemText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    marginLeft: 8,
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
