import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { CustomFieldDefinition } from '../types/database';
import { Colors } from '../utils/theme';

interface CustomFieldsInputProps {
  fields: CustomFieldDefinition[];
  values: Record<string, any>;
  onChangeValues: (newValues: Record<string, any>) => void;
  accentColor?: string;
}

export const CustomFieldsInput: React.FC<CustomFieldsInputProps> = ({
  fields,
  values,
  onChangeValues,
  accentColor = Colors.primary,
}) => {
  if (!fields || fields.length === 0) return null;

  const handleUpdate = (fieldId: string, val: any) => {
    onChangeValues({
      ...values,
      [fieldId]: val,
    });
  };

  return (
    <View style={styles.container}>
      {fields.map((field) => {
        if (field.type === 'select' && field.options && field.options.length > 0) {
          const selectedOption = values[field.id];
          return (
            <View key={field.id} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{field.label}:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {field.options.map((opt) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.chip,
                        isSelected && {
                          backgroundColor: accentColor,
                          borderColor: accentColor,
                        },
                      ]}
                      onPress={() => handleUpdate(field.id, isSelected ? null : opt)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.selectedChipText,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        }

        if (field.type === 'number') {
          const rawValue =
            values[field.id] !== undefined && values[field.id] !== null
              ? String(values[field.id])
              : '';

          return (
            <View key={field.id} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                {field.label} {field.unit ? `(${field.unit})` : ''}:
              </Text>
              <TextInput
                style={styles.numericInput}
                placeholder={`Introdueix ${field.label.toLowerCase()}... (ex: 1.48)`}
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={rawValue}
                onChangeText={(val) => {
                  // Allow digits and decimal separator (. or ,) without stripping them during typing
                  const sanitized = val.replace(/[^0-9.,-]/g, '');
                  handleUpdate(field.id, sanitized);
                }}
              />
            </View>
          );
        }

        if (field.type === 'text') {
          return (
            <View key={field.id} style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>{field.label}:</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`Introdueix ${field.label.toLowerCase()}...`}
                placeholderTextColor={Colors.textMuted}
                value={values[field.id] || ''}
                onChangeText={(val) => handleUpdate(field.id, val)}
              />
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    gap: 8,
  },
  fieldBlock: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  numericInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 13,
  },
  textInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 13,
  },
});

