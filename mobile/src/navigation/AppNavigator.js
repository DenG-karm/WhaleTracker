/**
 * src/navigation/AppNavigator.js
 * Bottom tab + stack yapısı
 * - Giriş yapılmamışsa → Login
 * - Beta dolu → BetaFull
 * - Giriş yapılmışsa → Ana tab'lar
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';

import LoginScreen    from '../screens/LoginScreen';
import BetaFullScreen from '../screens/BetaFullScreen';
import DashboardScreen from '../screens/DashboardScreen';
import JournalScreen   from '../screens/JournalScreen';
import StatsScreen     from '../screens/StatsScreen';
import AIChatScreen    from '../screens/AIChatScreen';
import NewsScreen      from '../screens/NewsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Tab yapısı ────────────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home'          : 'home-outline',
            Journal:   focused ? 'document-text' : 'document-text-outline',
            Stats:     focused ? 'bar-chart'     : 'bar-chart-outline',
            Haberler:  focused ? 'newspaper'     : 'newspaper-outline',
            'AI Coach':focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'help'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"  component={DashboardScreen} />
      <Tab.Screen name="Journal"    component={JournalScreen} />
      <Tab.Screen name="Stats"      component={StatsScreen} />
      <Tab.Screen name="Haberler"   component={NewsScreen} />
      <Tab.Screen name="AI Coach"   component={AIChatScreen} />
    </Tab.Navigator>
  );
}

// ── Auth stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="BetaFull" component={BetaFullScreen} />
    </Stack.Navigator>
  );
}

// ── Kök navigator ─────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.cyan} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
