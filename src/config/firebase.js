import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

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
  console.error('Firebase configuration is incomplete. Please check your environment variables.');
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // If we already have an app instance, use that one
    console.log('Firebase app already exists, reusing...');
    app = initializeApp(firebaseConfig, 'default');
  } else {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics conditionally (it's not supported in all environments)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(e => console.error('Analytics error:', e));
}

export { app, auth, db, analytics };