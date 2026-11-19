import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#090D16',
          borderBottomColor: '#1E293B',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontWeight: '900',
          color: '#F8FAFC',
          fontSize: 18,
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 24,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
        },
      }}
    >
      {/* Tab 1: Live 3D Map (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Send',
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'flash' : 'flash-outline'}
              size={size + 2}
              color={focused ? Colors.primary : (color as string)}
            />
          ),
        }}
      />

      {/* Tab 2: Sessions / Trips Feed */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Sessions',
          headerTitle: 'Historial de Trajectes',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'trail-sign' : 'trail-sign-outline'}
              size={size}
              color={color as string}
            />
          ),
        }}
      />

      {/* Tab 3: Garage / Vehicles */}
      <Tabs.Screen
        name="garage"
        options={{
          title: 'Garatge',
          headerTitle: 'El teu Garatge',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'car-sport' : 'car-sport-outline'}
              size={size + 1}
              color={color as string}
            />
          ),
        }}
      />

      {/* Tab 4: Season Recap / Wrapped */}
      <Tabs.Screen
        name="recap"
        options={{
          title: 'Temporada',
          headerTitle: 'Resum de Temporada',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'trophy' : 'trophy-outline'}
              size={size}
              color={color as string}
            />
          ),
        }}
      />

      {/* Tab 5: Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustos',
          headerTitle: 'Ajustos i Compte',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={size - 1}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
