import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { StatsProvider } from '../context/StatsContext';
import { Colors } from '../utils/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatsProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: Colors.background,
              },
              headerTintColor: Colors.text,
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              contentStyle: {
                backgroundColor: Colors.background,
              },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="stat/new"
              options={{
                title: 'Nova Mètrica',
                presentation: 'modal',
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="stat/[id]"
              options={{
                title: 'Detall de la Stat',
                presentation: 'card',
                headerShown: true,
              }}
            />
            <Stack.Screen
              name="stat/edit/[id]"
              options={{
                title: 'Editar Mètrica',
                presentation: 'modal',
                headerShown: true,
              }}
            />
          </Stack>
        </StatsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

