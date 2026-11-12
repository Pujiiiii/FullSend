import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PopularIcons, Colors } from '../utils/theme';

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelectIcon }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tria una icona o emoji:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {PopularIcons.map((icon) => (
          <TouchableOpacity
            key={icon}
            style={[styles.iconButton, selectedIcon === icon && styles.selectedIconButton]}
            onPress={() => onSelectIcon(icon)}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  scroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  selectedIconButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
    transform: [{ scale: 1.08 }],
  },
  iconText: {
    fontSize: 22,
  },
});
