/**
 * Countdown Screen Component
 * 3-second countdown before battle starts
 */

import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';

interface CountdownScreenProps {
  onComplete: () => void;
}

export default function CountdownScreen({onComplete}: CountdownScreenProps) {
  const [count, setCount] = useState(3);
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (count > 0) {
      // Animate scale
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 3,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Countdown timer
      const timer = setTimeout(() => {
        if (count === 1) {
          onComplete();
        } else {
          setCount(count - 1);
          scaleAnim.setValue(0);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [count, onComplete, scaleAnim]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get Ready!</Text>
      <Animated.View
        style={[
          styles.countdownCircle,
          {
            transform: [{scale: scaleAnim}],
          },
        ]}>
        <Text style={styles.countdownText}>{count}</Text>
      </Animated.View>
      <Text style={styles.subtitle}>Battle starts in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  countdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#4CAF50',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 20,
    color: '#aaa',
    marginTop: 40,
  },
});
