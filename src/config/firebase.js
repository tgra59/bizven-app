import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbvOfgeravcvbnquzIflgvzAPbj7i3vW8",
  authDomain: "bizven-1dfaf.firebaseapp.com",
  projectId: "bizven-1dfaf",
  storageBucket: "bizven-1dfaf.firebasestorage.app",
  messagingSenderId: "117623468338",
  appId: "1:117623468338:web:900d68580d0bf2aa22a72b",
  measurementId: "G-FMZC5JKL21"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
