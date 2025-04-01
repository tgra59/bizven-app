import React from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import ProfileCompletionScreen from '../src/screens/ProfileCompletionScreen';

export default function ProfileCompletion() {
  const handleProfileComplete = () => {
    // Navigate to the main app
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileCompletionScreen onComplete={handleProfileComplete} />
    </View>
  );
}
