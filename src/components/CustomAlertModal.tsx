import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

export interface CustomAlertOptions {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'destructive';
  primaryText?: string;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
}

interface CustomAlertModalProps {
  config: CustomAlertOptions;
  onClose: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({ config, onClose }) => {
  const {
    visible,
    title,
    message,
    type = 'info',
    primaryText = "D'acord",
    onPrimary,
    secondaryText,
    onSecondary,
  } = config;

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'error':
        return { name: 'close-circle' as const, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'warning':
        return { name: 'warning' as const, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'destructive':
        return { name: 'trash' as const, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'info':
      default:
        return { name: 'flash' as const, color: Colors.primary, bg: 'rgba(204, 255, 0, 0.15)' };
    }
  };

  const iconInfo = getIcon();

  const handlePrimary = () => {
    if (onPrimary) onPrimary();
    onClose();
  };

  const handleSecondary = () => {
    if (onSecondary) onSecondary();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={secondaryText ? undefined : onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Top Accent Icon */}
              <View style={[styles.iconCircle, { backgroundColor: iconInfo.bg }]}>
                <Ionicons name={iconInfo.name} size={30} color={iconInfo.color} />
              </View>

              {/* Title & Body */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Buttons */}
              <View style={styles.actions}>
                {secondaryText ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleSecondary}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryText}>{secondaryText}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    type === 'destructive' && styles.destructiveButton,
                  ]}
                  onPress={handlePrimary}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.primaryText,
                      type === 'destructive' && styles.destructiveText,
                    ]}
                  >
                    {primaryText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#090D16',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  destructiveText: {
    color: '#FFFFFF',
  },
});
