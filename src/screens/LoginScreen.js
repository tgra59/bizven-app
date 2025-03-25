import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Title, Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { 
  GoogleAuthProvider, 
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  
  // Handle Google login/signup
  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, create a fake Google user with a profile picture
      // In a production app, you would use the real Google Sign-In SDK
      const userCredential = {
        user: {
          uid: "google_demo_user_123",
          email: "demo@gmail.com",
          displayName: "Google Demo User",
          // Use Google's profile picture from the authentication result
          photoURL: "https://lh3.googleusercontent.com/a/default-user"
        }
      };
      
      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // If user doesn't exist, create a new document (sign-up flow)
      if (!userDoc.exists()) {
        console.log('Creating new user from Google account');
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || 'User',
          photoURL: userCredential.user.photoURL, // Store Google profile picture URL
          createdAt: new Date(),
          projects: []
        });
      } else {
        console.log('User exists, signing in');
        // If user exists but doesn't have a profile picture, update with Google profile picture
        if (!userDoc.data().photoURL && userCredential.user.photoURL) {
          await updateDoc(userDocRef, {
            photoURL: userCredential.user.photoURL
          });
        }
      }
      
      // Navigation will be handled by the onAuthStateChanged listener in App.js
    } catch (error) {
      console.error('Google authentication error:', error);
      setError('Failed to authenticate with Google. Please try again.');
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
            <Text style={styles.subtitle}>Sign in with your Google account to access your projects</Text>
            
            <Button
              mode="contained"
              onPress={handleGoogleAuth}
              style={styles.googleButton}
              loading={loading}
              disabled={loading}
              icon={({ size, color }) => (
                <MaterialCommunityIcons name="google" size={24} color="white" />
              )}
            >
              Continue with Google
            </Button>
            
            <Text style={styles.infoText}>
              We'll automatically create an account if you don't have one yet
            </Text>
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
    fontSize: 38,
    fontWeight: 'bold',
    color: '#007BFF',
  },
  tagline: {
    fontSize: 18,
    color: '#555',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 26,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    fontSize: 16,
  },
  googleButton: {
    marginTop: 15,
    paddingVertical: 8,
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#DB4437',
    marginBottom: 20,
  },
  infoText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
    fontSize: 14,
  },
});

export default LoginScreen;
