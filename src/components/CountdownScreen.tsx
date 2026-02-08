/**
 * Countdown Screen Component
 * 3-second countdown before battle starts
 */

import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {colors, fonts} from '../theme/colors';

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
    backgroundColor: colors.bgPrimary,
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 40,
    letterSpacing: 3,
  },
  countdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.accent,
  },
  countdownText: {
    fontFamily: fonts.orbitronExtraBold,
    fontSize: 72,
    color: colors.accent,
  },
  subtitle: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 18,
    color: colors.textMuted,
    marginTop: 40,
  },
});
