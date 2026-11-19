import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../context/StatsContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Colors } from '../../utils/theme';
import { CustomAlertModal, CustomAlertOptions } from '../../components/CustomAlertModal';

export default function SettingsScreen() {
  const { user, signIn, signUp, signOut } = useAuth();
  const { resetDemoData, refreshData } = useStats();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<CustomAlertOptions>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (options: Omit<CustomAlertOptions, 'visible'>) => {
    setAlertConfig({ ...options, visible: true });
  };

  const supabaseReady = isSupabaseConfigured();

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert({
        title: 'Camps incomplets',
        message: 'Si us plau, omple tant el teu correu com la contrasenya per continuar.',
        type: 'warning',
      });
      return;
    }
    setAuthLoading(true);
    const result = isRegistering ? await signUp(email, password) : await signIn(email, password);
    setAuthLoading(false);

    if (result.error) {
      showAlert({
        title: "Error d'autenticació",
        message: result.error.message,
        type: 'error',
      });
    } else {
      showAlert({
        title: isRegistering ? 'Compte creat! ⚡' : 'Sessió iniciada! 🏁',
        message: isRegistering
          ? 'El teu compte s\'ha creat amb èxit. Si cal confirmació, revisa la teva bústia de correu.'
          : 'Benvingut de nou a Full Send! Les teves rutes i telemetria es sincronitzaran automàticament.',
        type: 'success',
        onPrimary: () => {
          refreshData();
        },
      });
    }
  };

  const handleResetData = () => {
    showAlert({
      title: 'Restablir dades?',
      message: 'Es recarregaran els vehicles d\'exemple i rutes de demostració de Full Send (cotxe, moto, esquí, 4x4).',
      type: 'destructive',
      primaryText: 'Restablir',
      secondaryText: 'Cancel·lar',
      onPrimary: async () => {
        await resetDemoData();
        showAlert({
          title: 'Dades restablertes',
          message: 'S\'han carregat correctament les dades de demostració.',
          type: 'success',
        });
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Supabase Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons
            name={supabaseReady ? 'cloud-done' : 'cloud-offline'}
            size={24}
            color={supabaseReady ? Colors.success : Colors.warning}
          />
          <Text style={styles.cardTitle}>Estat de Supabase</Text>
        </View>

        <Text style={styles.cardDesc}>
          {supabaseReady
            ? 'Supabase està connectat i configurat amb les claus del teu fitxer .env.'
            : 'Estàs en mode local/demostració. Les dades es desen en la memòria del dispositiu.'}
        </Text>

        {!supabaseReady && (
          <View style={styles.setupInstructions}>
            <Text style={styles.instructionTitle}>Com connectar la teva BD de Supabase:</Text>
            <Text style={styles.instructionStep}>
              1. Crea un projecte a <Text style={{ color: Colors.primaryLight }}>supabase.com</Text>.
            </Text>
            <Text style={styles.instructionStep}>
              2. Obre l'editor SQL de Supabase i enganxa el contingut de{' '}
              <Text style={{ fontFamily: 'monospace', color: Colors.accent }}>
                supabase/schema.sql
              </Text>.
            </Text>
            <Text style={styles.instructionStep}>
              3. Copia l'URL i l'Anon Key al fitxer <Text style={{ fontFamily: 'monospace' }}>.env</Text>{' '}
              del projecte.
            </Text>
          </View>
        )}
      </View>

      {/* Supabase Auth Section if configured */}
      {supabaseReady && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Compte d'usuari</Text>
          </View>

          {user ? (
            <View>
              <Text style={styles.userEmailLabel}>Sessió iniciada com a:</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                <Text style={styles.logoutText}>Tancar sessió</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authForm}>
              <Text style={styles.formTitle}>
                {isRegistering ? 'Crear un compte nou' : 'Inicia la sessió'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="El teu correu..."
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Contrasenya..."
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleAuth}
                disabled={authLoading}
              >
                <Text style={styles.authButtonText}>
                  {authLoading
                    ? 'Carregant...'
                    : isRegistering
                    ? 'Crear compte'
                    : 'Iniciar sessió'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsRegistering(!isRegistering)}
                style={styles.toggleAuth}
              >
                <Text style={styles.toggleAuthText}>
                  {isRegistering
                    ? 'Ja tens compte? Inicia sessió'
                    : 'No tens compte? Registra\'t gratis'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Demo Controls */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="refresh-circle" size={24} color={Colors.accent} />
          <Text style={styles.cardTitle}>Dades de demostració</Text>
        </View>
        <Text style={styles.cardDesc}>
          Pots recarregar en qualsevol moment les mètriques i entrades de prova per veure com funciona l'aplicació i el Recap de final d'any.
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
          <Ionicons name="reload" size={16} color={Colors.accent} />
          <Text style={styles.resetButtonText}>Restablir dades d'exemple</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.appName}>FULL SEND ⚡</Text>
        <Text style={styles.appTagline}>TRACK EVERYTHING. DRIVE. RIDE. SKI. EXPLORE.</Text>
        <Text style={styles.appSub}>Versió 2.0.0 • High Energy Telemetry</Text>
      </View>

      {/* Full Send Glassmorphic Alert Modal */}
      <CustomAlertModal
        config={alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  setupInstructions: {
    marginTop: 14,
    padding: 12,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  instructionStep: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  authForm: {
    marginTop: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 10,
  },
  authButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleAuth: {
    marginTop: 10,
    alignItems: 'center',
  },
  toggleAuthText: {
    color: Colors.primaryLight,
    fontSize: 12,
  },
  userEmailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  resetButtonText: {
    color: Colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  appName: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  appTagline: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  appSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

