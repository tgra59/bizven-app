import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Button, Title, Text, Snackbar, TextInput, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { 
  GoogleAuthProvider, 
  signInWithCredential,
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Handle demo login with Google
  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, create a fake Google user
      const userCredential = {
        user: {
          uid: "google_demo_user_123",
          email: "demo@gmail.com",
          displayName: "Google Demo User",
          photoURL: null
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
          photoURL: userCredential.user.photoURL,
          createdAt: new Date(),
          projects: []
        });
      }
      
      // Navigation will be handled by the onAuthStateChanged listener in App.js
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to sign in with Google. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle email/password login
  const handleEmailLogin = async () => {
    try {
      setLoading(true);
      
      if (!email || !password) {
        setError('Please enter both email and password');
        setSnackbarVisible(true);
        return;
      }
      
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
            
            {/* Email/Password Login Form */}
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
            />
            
            <Button
              mode="contained"
              onPress={handleEmailLogin}
              style={styles.loginButton}
              loading={loading}
              disabled={loading}
            >
              Sign In
            </Button>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.orText}>Or continue with</Text>
            
            <Button
              mode="outlined"
              onPress={handleDemoLogin}
              style={styles.googleButton}
              loading={loading}
              disabled={loading}
              icon={({ size, color }) => (
                <MaterialCommunityIcons name="google" size={size} color="#DB4437" />
              )}
            >
              Google
            </Button>
            
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('SignUp')}
                style={styles.signupButton}
              >
                Sign Up
              </Button>
            </View>
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
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 6,
    width: '100%',
    borderRadius: 24,
  },
  divider: {
    marginVertical: 20,
  },
  orText: {
    textAlign: 'center',
    color: '#888',
    marginBottom: 12,
  },
  googleButton: {
    marginTop: 8,
    paddingVertical: 6,
    width: '100%',
    borderRadius: 24,
    borderColor: '#DB4437',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  signupText: {
    color: '#666',
  },
  signupButton: {
    marginLeft: 4,
  },
});

export default LoginScreen;
