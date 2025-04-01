// Import expo-router instead of the old App component
import 'expo-router/entry';

// Ensure Firebase is initialized before the app starts
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// For web, set auth persistence to LOCAL (survives browser restart)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .then(() => console.log('Firebase auth persistence set to LOCAL'))
    .catch((error) => console.error('Firebase persistence error:', error));
}

// The app will now use Expo Router from the app/ directory
// No need to register a root component as expo-router/entry handles this
