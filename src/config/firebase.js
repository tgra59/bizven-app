import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// For web platforms, check if configuration is available from window
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  // Check if the app is running on the web and not localhost (production)
  try {
    if (Constants.platform?.web?.config?.firebase) {
      console.log('Using web config from Expo Constants');
      Object.assign(firebaseConfig, Constants.platform.web.config.firebase);
    }
  } catch (e) {
    console.warn('Error accessing web config:', e);
  }
}

// For debugging purposes
console.log('Firebase Config:', { 
  apiKey: firebaseConfig.apiKey ? 'set' : 'not set',
  authDomain: firebaseConfig.authDomain ? 'set' : 'not set',
  projectId: firebaseConfig.projectId ? 'set' : 'not set',
  storageBucket: firebaseConfig.storageBucket ? 'set' : 'not set',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'set' : 'not set',
  appId: firebaseConfig.appId ? 'set' : 'not set',
  measurementId: firebaseConfig.measurementId ? 'set' : 'not set'
});

// Ensure we have required config
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is incomplete. Please check your environment variables or app config.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics conditionally (it's not supported in all environments)
let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(e => console.error('Analytics error:', e));

// Use emulators during development if required
if (process.env.NODE_ENV === 'development' && false) { // Set to true to use emulators
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { app, auth, db, analytics };
