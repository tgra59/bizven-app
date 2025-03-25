import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Title, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const AnalyticsScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Analytics</Title>
        <Text style={styles.subtitle}>Track your performance and metrics</Text>
        <Text style={styles.comingSoon}>Coming soon in the next update!</Text>
        
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>
              The Analytics dashboard will allow you to:
            </Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Track metrics for deliverables</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• View analytics for platform plays/views</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Set and monitor goals</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>• Analyze effort vs. results</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007BFF',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 8,
  },
  comingSoon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
    marginTop: 24,
    marginBottom: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 500,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardDescription: {
    fontSize: 16,
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

export default AnalyticsScreen;