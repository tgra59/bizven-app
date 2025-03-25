import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Button,
  Title,
  Text,
  Subheading,
  TextInput,
  HelperText,
  Snackbar,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
// Removed Firebase Storage imports as we're not using Storage

const SignUpScreen = ({ navigation, route }) => {
  // Get user data from route params if available (from social login)
  const initialUserData = route?.params?.userData || {};
  
  // Form state
  const [displayName, setDisplayName] = useState(initialUserData.displayName || '');
  const [email, setEmail] = useState(initialUserData.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState(initialUserData.photoURL || null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  
  // Form validation
  const hasNameError = () => displayName.trim().length === 0;
  const hasEmailError = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(email);
  };
  const hasPasswordError = () => password.length < 6;
  const hasConfirmPasswordError = () => password !== confirmPassword;
  const hasPhoneError = () => {
    if (phoneNumber.trim() === '') return false; // Phone is optional
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return !phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return (
      !hasNameError() &&
      !hasEmailError() &&
      !hasPasswordError() &&
      !hasConfirmPasswordError() &&
      !hasPhoneError()
    );
  };
  
  // Handle image picking
  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload a profile picture.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.cancelled && result.assets && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  
  // Store profile image URL in user profile (not uploading to Firebase Storage)
  const uploadProfileImage = async (uid) => {
    if (!profileImage) return null;
    
    try {
      // For now, we'll just return the local URI
      // In a production app, you might want to implement a different storage solution
      console.log('Profile image would be uploaded for user:', uid);
      
      // Return a placeholder image URL since we're not using Firebase Storage
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=random';
    } catch (error) {
      console.error('Error handling profile image:', error);
      return null;
    }
  };
  
  // Handle sign up
  const handleSignUp = async () => {
    if (!isFormValid()) {
      setError('Please correct the errors in the form.');
      setSnackbarVisible(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Upload profile image if selected
      const photoURL = await uploadProfileImage(user.uid);
      
      // Update user profile in Firebase Auth
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL,
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: displayName,
        email: email,
        phoneNumber: phoneNumber,
        photoURL: photoURL,
        createdAt: new Date(),
        projects: [],
      });
      
      setLoading(false);
      
      // Navigate to the main app or profile page
      // Navigation will typically be handled by the onAuthStateChanged listener in App.js
    } catch (error) {
      console.error('Sign up error:', error);
      setLoading(false);
      
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please use a different email or sign in.';
      }
      
      setError(errorMessage);
      setSnackbarVisible(true);
    }
  };
  
  const navigateToLogin = () => {
    if (navigation) {
      navigation.navigate('Login');
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
            <Text style={styles.tagline}>Create Your Account</Text>
          </View>
          
          <View style={styles.formContainer}>
            {/* Profile Image Picker */}
            <TouchableOpacity onPress={handlePickImage} style={styles.imagePickerContainer}>
              {profileImage ? (
                <Avatar.Image size={100} source={{ uri: profileImage }} />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#999" />
                </View>
              )}
              <Text style={styles.imagePickerText}>
                {profileImage ? 'Change Profile Picture' : 'Add Profile Picture'}
              </Text>
            </TouchableOpacity>
            
            {/* Name Input */}
            <TextInput
              label="Full Name"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
              mode="outlined"
              error={hasNameError()}
            />
            <HelperText type="error" visible={hasNameError()}>
              Name is required
            </HelperText>
            
            {/* Email Input */}
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              error={hasEmailError()}
              disabled={!!initialUserData.email} // Disable if email is provided from social login
            />
            <HelperText type="error" visible={hasEmailError()}>
              Please enter a valid email address
            </HelperText>
            
            {/* Password Input */}
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              error={hasPasswordError()}
            />
            <HelperText type="error" visible={hasPasswordError()}>
              Password must be at least 6 characters
            </HelperText>
            
            {/* Confirm Password Input */}
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              mode="outlined"
              secureTextEntry
              error={hasConfirmPasswordError()}
            />
            <HelperText type="error" visible={hasConfirmPasswordError()}>
              Passwords do not match
            </HelperText>
            
            {/* Phone Number Input */}
            <TextInput
              label="Phone Number (Optional)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
              error={hasPhoneError()}
            />
            <HelperText type="error" visible={hasPhoneError()}>
              Please enter a valid phone number
            </HelperText>
            
            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSignUp}
              style={styles.submitButton}
              loading={loading}
              disabled={loading || !isFormValid()}
            >
              Create Account
            </Button>
            
            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <Button
                mode="text"
                onPress={navigateToLogin}
                style={styles.loginButton}
              >
                Sign In
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
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
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  imagePickerText: {
    color: '#007BFF',
    marginTop: 8,
  },
  input: {
    marginTop: 8,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
    width: '100%',
    borderRadius: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#666',
  },
  loginButton: {
    marginLeft: 4,
  },
});

export default SignUpScreen;