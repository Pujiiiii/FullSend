import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStats } from '../../../context/StatsContext';
import { CustomFieldDefinition } from '../../../types/database';
import { IconPicker } from '../../../components/IconPicker';
import { ColorPicker } from '../../../components/ColorPicker';
import { Colors } from '../../../utils/theme';

export default function EditStatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stats, updateStat } = useStats();

  const stat = stats.find((s) => s.id === id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📊');
  const [color, setColor] = useState('#6366F1');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Subcategories
  const [hasSubcategories, setHasSubcategories] = useState(false);
  const [subcategoryLabel, setSubcategoryLabel] = useState('Subcategoria');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubcategoryText, setNewSubcategoryText] = useState('');

  // Secondary numeric fields
  const [secondaryFields, setSecondaryFields] = useState<{ id: string; label: string; unit: string }[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  useEffect(() => {
    if (stat) {
      setName(stat.name);
      setDescription(stat.description || '');
      setIcon(stat.icon || '📊');
      setColor(stat.color || '#6366F1');
      setUnit(stat.unit || '');
      setTargetValue(stat.target_value ? String(stat.target_value) : '');

      const selectField = stat.fields_config?.find((f) => f.type === 'select');
      if (selectField) {
        setHasSubcategories(true);
        setSubcategoryLabel(selectField.label || 'Subcategoria');
        setSubcategories(selectField.options || []);
      } else {
        setHasSubcategories(false);
        setSubcategories([]);
      }

      const numFields = stat.fields_config?.filter((f) => f.type === 'number') || [];
      setSecondaryFields(
        numFields.map((f) => ({
          id: f.id,
          label: f.label,
          unit: f.unit || '',
        }))
      );
    }
  }, [stat]);

  if (!stat) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>No s'ha trobat la mètrica.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Tornar</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  const handleRemoveSecondaryField = (index: number) => {
    setSecondaryFields(secondaryFields.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nom', 'Introdueix un nom per a la mètrica');
      return;
    }

    try {
      setSubmitting(true);
      const parsedTarget = targetValue ? parseFloat(targetValue.replace(',', '.')) : null;

      // Rebuild fields_config
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

      await updateStat(stat.id, {
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
        unit: stat.type === 'route' ? 'km' : unit.trim() || null,
        target_value: !isNaN(parsedTarget as number) ? parsedTarget : null,
        target_period: parsedTarget ? 'yearly' : null,
        fields_config: fieldsConfig,
      });

      Alert.alert('Actualitzat', 'La mètrica s\'ha actualitzat correctament.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error actualitzant', error.message || 'Error desconegut');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Editar mètrica</Text>

      {/* Name */}
      <Text style={styles.label}>Nom de la mètrica *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom de la mètrica..."
        placeholderTextColor={Colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      {/* Description */}
      <Text style={styles.label}>Descripció</Text>
      <TextInput
        style={styles.input}
        placeholder="Descripció opcional..."
        placeholderTextColor={Colors.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      {/* Unit if numeric */}
      {stat.type === 'numeric' && (
        <View>
          <Text style={styles.label}>Unitat de mesura</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: L, km, hores, €..."
            placeholderTextColor={Colors.textMuted}
            value={unit}
            onChangeText={setUnit}
          />
        </View>
      )}

      {/* Target */}
      <Text style={styles.label}>Objectiu anual (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 500"
        placeholderTextColor={Colors.textMuted}
        keyboardType="decimal-pad"
        value={targetValue}
        onChangeText={setTargetValue}
      />

      {/* Subcategories Management */}
      <View style={styles.customSection}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.customSectionTitle}>Subcategories / Opcions</Text>
            <Text style={styles.customSectionSub}>
              Afegeix o elimina opcions que podràs triar en cada registre.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, hasSubcategories && styles.toggleBtnActive]}
            onPress={() => setHasSubcategories(!hasSubcategories)}
          >
            <Text style={[styles.toggleBtnText, hasSubcategories && styles.toggleBtnTextActive]}>
              {hasSubcategories ? 'Activat' : 'Activar'}
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

            <Text style={styles.subcatLabel}>Afegir nova opció:</Text>
            <View style={styles.addSubcatRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Escriu una opció (ex: Fantasia)..."
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

      {/* Secondary Numeric Fields Management */}
      <View style={styles.customSection}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.customSectionTitle}>Camps numèrics addicionals</Text>
            <Text style={styles.customSectionSub}>
              Camps com preu per litre, cost total o calories.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setShowAddField(!showAddField)}
          >
            <Text style={styles.toggleBtnText}>
              {showAddField ? 'Tancar' : '+ Afegir'}
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
              <Text style={styles.confirmFieldBtnText}>Afegir camp</Text>
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
                <TouchableOpacity onPress={() => handleRemoveSecondaryField(i)}>
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
        <Text style={styles.customEmojiLabel}>Emoji personalitzat:</Text>
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
          {submitting ? 'Desant canvis...' : 'Desar canvis'}
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  notFoundText: {
    color: Colors.text,
    fontSize: 16,
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
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

