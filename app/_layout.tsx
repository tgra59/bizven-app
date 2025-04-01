import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme } from 'react-native-paper';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

import { useColorScheme } from '@/hooks/useColorScheme';

// Initialize Firebase from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase early to ensure it's ready before app rendering
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// For web, set auth persistence to LOCAL (survives browser restart)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('Firebase auth persistence set to LOCAL'))
    .catch((error) => console.error('Firebase persistence error:', error));
}

// App theme
const paperTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: '#007BFF',
    accent: '#FF4500',
  },
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(true);

  // Check if the user needs to complete their profile
  const checkProfileStatus = async (user) => {
    if (!user) return false;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) return false;
      
      const isProfileCompleted = userDoc.data().profileCompleted !== false;
      console.log(`Profile completion status for ${user.email}: ${isProfileCompleted ? 'Completed' : 'Not Completed'}`);
      return isProfileCompleted;
    } catch (error) {
      console.error('Error checking profile status:', error);
      return true; // Default to completed to avoid blocking user
    }
  };

  // Handle user state changes
  useEffect(() => {
    console.log('Setting up auth state change listener');

    // Add a short delay to ensure Firebase is initialized
    const timeoutId = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? `${user.displayName || user.email}` : 'No user');
        
        if (user) {
          // Check if profile is completed
          const isProfileCompleted = await checkProfileStatus(user);
          setProfileCompleted(isProfileCompleted);
          
          console.log('User authenticated:', {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            profileCompleted: isProfileCompleted
          });
        }
        
        setUser(user);
        if (initializing) setInitializing(false);
      });
      
      // Return unsubscribe function
      return () => {
        unsubscribe();
      };
    }, 500);
    
    // Clean up both the timeout and subscription
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (loaded && !initializing) {
      SplashScreen.hideAsync();
    }
  }, [loaded, initializing]);

  if (!loaded || initializing) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            {!user ? (
              // No user is signed in, show login screen
              <Stack.Screen name="login" options={{ headerShown: false }} />
            ) : !profileCompleted ? (
              // Profile needs completion
              <Stack.Screen name="profile-completion" options={{ headerShown: false }} />
            ) : (
              // User is signed in and profile is completed
              <>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </>
            )}
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}