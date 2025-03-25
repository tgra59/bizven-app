import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Title, Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import authService from '../services/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  
  // Check for redirect results and handle auth state change
  useEffect(() => {
    let unsubscribe;
    
    const setupAuth = async () => {
      // Listen for auth state changes
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          console.log('User is signed in:', user.displayName);
        }
      });
      
      // Check if we have a redirect result from previous sign-in
      if (Platform.OS === 'web') {
        try {
          const result = await authService.handleRedirectResult();
          if (result) {
            console.log('Redirect result handled successfully');
          }
        } catch (error) {
          console.error('Redirect handling error:', error);
          setError('Error during Google sign-in. Please try again.');
          setSnackbarVisible(true);
        }
      }
    };
    
    setupAuth();
    
    // Clean up on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
  
  // Handle Google sign-in using our auth service
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'web') {
        await authService.signInWithGoogle();
        // Auth state changes will be handled by the App.js onAuthStateChanged listener
      } else {
        // Mobile platform handling
        setError('Mobile Google login would be implemented with expo-auth-session');
        setSnackbarVisible(true);
        
        // For testing/demo purposes only
        console.log('Demo login: Mobile platforms would use expo-auth-session in production');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(`Failed to sign in with Google. ${error.message}`);
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle login button press
  const handleLogin = () => {
    handleGoogleSignIn();
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
              onPress={handleLogin}
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
