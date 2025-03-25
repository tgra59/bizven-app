import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Button, Title, Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { 
  GoogleAuthProvider, 
  signInWithCredential,
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // For demo purposes, let's create a simulated login
  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      
      // For development/testing, we'll use a demo login
      // In production, this would be replaced with actual Google Auth
      const email = "demo@example.com";
      const password = "password123";
      
      try {
        // Try to sign in with email/password first (if the user exists)
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        // If sign in fails, create a fake user in Firebase
        const userCredential = {
          user: {
            uid: "demo_user_123",
            email: email,
            displayName: "Demo User"
          }
        };
        
        // Check if user exists in Firestore
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        // If user doesn't exist, create a new document
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || 'User',
            photoURL: null,
            createdAt: new Date(),
            projects: []
          });
        }
      }
      
      // Navigation will be handled by the onAuthStateChanged listener in App.js
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to sign in. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Title style={styles.appTitle}>BIZVEN</Title>
            <Text style={styles.tagline}>Track, Manage, Succeed</Text>
          </View>

          <View style={styles.formContainer}>
            <Title style={styles.formTitle}>Welcome</Title>
            <Text style={styles.subtitle}>Sign in to access your projects and track your time</Text>
            
            <Button
              mode="contained"
              onPress={handleDemoLogin}
              style={styles.googleButton}
              loading={loading}
              disabled={loading}
              icon={({ size, color }) => (
                <MaterialCommunityIcons name="google" size={size} color={color} />
              )}
            >
              Demo Login (Simulated Google Auth)
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Close',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  tagline: {
    fontSize: 16,
    color: '#555',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  googleButton: {
    marginTop: 8,
    paddingVertical: 6,
    width: '100%',
    borderRadius: 24,
  },
});

export default LoginScreen;
