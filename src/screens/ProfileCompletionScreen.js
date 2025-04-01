import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Title, Text, TextInput, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

const ProfileCompletionScreen = ({ onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      setSnackbarVisible(true);
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update user profile in Firebase Auth
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Update user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        firstName: firstName,
        lastName: lastName,
        displayName: `${firstName} ${lastName}`,
        phoneNumber: phoneNumber || null,
        profileCompleted: true,
        updatedAt: new Date()
      });

      console.log('Profile updated successfully');
      
      // Call the completion callback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
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
          <View style={styles.formContainer}>
            <Title style={styles.formTitle}>Complete Your Profile</Title>
            <Text style={styles.subtitle}>
              Please provide the following information to complete your account setup
            </Text>
            
            <TextInput
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              autoCapitalize="words"
              required
            />
            
            <TextInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              autoCapitalize="words"
              required
            />
            
            <TextInput
              label="Phone Number (optional)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              style={styles.input}
              keyboardType="phone-pad"
            />
            
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Complete Profile
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
  formContainer: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 15,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#007BFF',
  },
});

export default ProfileCompletionScreen;