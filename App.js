import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>BIZVEN</Text>
        <Text style={styles.subtitle}>Business Venture Tracking App</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome!</Text>
          <Text style={styles.cardText}>
            Track your time, document your work sessions, and monitor your project progress with BIZVEN.
          </Text>
          
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Key Features:</Text>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Time tracking with start/stop functionality</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Work session documentation</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Project progress tracking</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Performance analytics</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#444',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    width: '100%',
    maxWidth: 500,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#444',
  },
});
