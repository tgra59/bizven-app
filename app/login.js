import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import LoginScreen from '../src/screens/LoginScreen';

export default function Login() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LoginScreen />
    </View>
  );
}
