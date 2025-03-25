import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { auth } from './src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import other components we'll need later
import TimerScreen from './src/screens/TimerScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

// Create navigation stacks and tabs
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// App theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007BFF',
    accent: '#FF4500',
  },
};

// Main tab navigator for authenticated users
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Timer') {
            iconName = 'timer';
          } else if (route.name === 'Projects') {
            iconName = 'view-dashboard';
          } else if (route.name === 'Analytics') {
            iconName = 'chart-bar';
          } else if (route.name === 'Profile') {
            iconName = 'account';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Timer"
        component={TimerScreen || PlaceholderScreen('Timer')}
        options={{ title: 'Timer' }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen || PlaceholderScreen('Projects')}
        options={{ title: 'Projects' }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen || PlaceholderScreen('Analytics')}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Placeholder component for screens we haven't built yet
const PlaceholderScreen = (screenName) => {
  return () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{screenName} screen coming soon!</Text>
    </View>
  );
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    // Clean up the subscriber on unmount
    return unsubscribe;
  }, [initializing]);

  // Create placeholder screens for screens we haven't implemented yet
  if (!TimerScreen) {
    TimerScreen = PlaceholderScreen('Timer');
  }
  if (!ProjectsScreen) {
    ProjectsScreen = PlaceholderScreen('Projects');
  }
  if (!AnalyticsScreen) {
    AnalyticsScreen = PlaceholderScreen('Analytics');
  }

  // Show a loading screen while checking authentication
  if (initializing) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Loading...</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="auto" />
          {user ? (
            // User is signed in, show the main tab navigator
            <MainTabNavigator />
          ) : (
            // No user is signed in, show only the login screen
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}