/**
 * BombDropAnimation
 * Full-screen overlay animation for attack effects
 * Uses React Native's built-in Animated API for maximum compatibility
 */

import React, {forwardRef, useImperativeHandle, useState, useRef, useCallback} from 'react';
import {View, Text, StyleSheet, Animated, Easing, Dimensions} from 'react-native';
import {colors, fonts} from '../theme/colors';

export interface BombDropAnimationRef {
  playAttack: (
    targetX: number,
    targetY: number,
    resultType: 'miss' | 'hit' | 'kill',
    onComplete: () => void,
    onShake?: (dx: number) => void,
  ) => void;
}

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

const SCREEN = Dimensions.get('window');

const BombDropAnimation = forwardRef<BombDropAnimationRef>((_, ref) => {
  const [playing, setPlaying] = useState(false);
  const [resultType, setResultType] = useState<'miss' | 'hit' | 'kill'>('miss');
  const [showHeadshot, setShowHeadshot] = useState(false);

  // Bomb position
  const bombY = useRef(new Animated.Value(-80)).current;
  const bombX = useRef(new Animated.Value(SCREEN.width / 2)).current;
  const bombOpacity = useRef(new Animated.Value(1)).current;
  const bombWobble = useRef(new Animated.Value(0)).current;
  const bombScale = useRef(new Animated.Value(1)).current;

  // Shadow
  const shadowScale = useRef(new Animated.Value(0.2)).current;
  const shadowOpacity = useRef(new Animated.Value(0)).current;

  // Flash
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // Headshot text
  const headshotScale = useRef(new Animated.Value(0)).current;
  const headshotOpacity = useRef(new Animated.Value(0)).current;

  // Particles
  const [particles, setParticles] = useState<Particle[]>([]);

  // Target position ref
  const targetRef = useRef({x: 0, y: 0});

  const createParticles = useCallback((count: number, type: 'miss' | 'hit' | 'kill') => {
    const newParticles: Particle[] = [];
    const particleColors = type === 'miss'
      ? ['#4a9eff', '#6bb3ff', '#87ceeb', '#5dade2', '#3498db']
      : type === 'hit'
        ? ['#ff6b35', '#ff8c00', '#ffa500', '#ff4500', '#ffcc00']
        : ['#ff2222', '#ff4444', '#ff0000', '#ff6600', '#ffaa00', '#ffffff'];

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(type === 'kill' ? 1.2 : 0.8),
        color: particleColors[i % particleColors.length],
      });
    }
    return newParticles;
  }, []);

  const playAttack = useCallback((
    targetX: number,
    targetY: number,
    type: 'miss' | 'hit' | 'kill',
    onComplete: () => void,
    onShake?: (dx: number) => void,
  ) => {
    targetRef.current = {x: targetX, y: targetY};
    setResultType(type);
    setShowHeadshot(false);
    setPlaying(true);

    // Reset values
    bombY.setValue(-80);
    bombX.setValue(targetX);
    bombOpacity.setValue(1);
    bombWobble.setValue(0);
    bombScale.setValue(1);
    shadowScale.setValue(0.2);
    shadowOpacity.setValue(0);
    flashOpacity.setValue(0);
    headshotScale.setValue(0);
    headshotOpacity.setValue(0);

    // Create particles
    const particleCount = type === 'kill' ? 25 : type === 'hit' ? 12 : 10;
    const newParticles = createParticles(particleCount, type);
    setParticles(newParticles);

    // Phase 1: Bomb drop (0-600ms)
    const wobbleAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(bombWobble, {toValue: 3, duration: 80, useNativeDriver: true}),
        Animated.timing(bombWobble, {toValue: -3, duration: 80, useNativeDriver: true}),
      ]),
    );

    wobbleAnim.start();

    Animated.parallel([
      Animated.timing(bombY, {
        toValue: targetY - 20,
        duration: 600,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(shadowScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 0.5,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stop wobble
      wobbleAnim.stop();
      bombWobble.setValue(0);

      // Hide bomb
      bombOpacity.setValue(0);
      shadowOpacity.setValue(0);

      // Phase 2: Impact
      const shakeIntensity = type === 'kill' ? 12 : type === 'hit' ? 6 : 2;

      // Flash
      const flashAnims = type === 'kill'
        ? Animated.sequence([
            Animated.timing(flashOpacity, {toValue: 0.6, duration: 50, useNativeDriver: true}),
            Animated.timing(flashOpacity, {toValue: 0, duration: 100, useNativeDriver: true}),
            Animated.timing(flashOpacity, {toValue: 0.4, duration: 50, useNativeDriver: true}),
            Animated.timing(flashOpacity, {toValue: 0, duration: 150, useNativeDriver: true}),
          ])
        : Animated.sequence([
            Animated.timing(flashOpacity, {toValue: type === 'hit' ? 0.4 : 0.15, duration: 50, useNativeDriver: true}),
            Animated.timing(flashOpacity, {toValue: 0, duration: 150, useNativeDriver: true}),
          ]);

      // Shake via callback
      if (onShake) {
        const shakeSteps = type === 'kill' ? 8 : type === 'hit' ? 5 : 3;
        let step = 0;
        const shakeInterval = setInterval(() => {
          if (step >= shakeSteps) {
            clearInterval(shakeInterval);
            onShake(0);
            return;
          }
          const direction = step % 2 === 0 ? 1 : -1;
          const decay = 1 - step / shakeSteps;
          onShake(direction * shakeIntensity * decay);
          step++;
        }, 50);
      }

      // Particle explosions
      const particleAnims = newParticles.map((particle, i) => {
        const angle = (2 * Math.PI * i) / newParticles.length + (Math.random() - 0.5) * 0.5;
        const distance = 40 + Math.random() * 60;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        return Animated.parallel([
          Animated.timing(particle.x, {
            toValue: dx,
            duration: 500 + Math.random() * 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: dy,
            duration: 500 + Math.random() * 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 600 + Math.random() * 200,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 600 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ]);
      });

      // Headshot text for kill
      let headshotAnim: Animated.CompositeAnimation | null = null;
      if (type === 'kill') {
        setShowHeadshot(true);
        headshotAnim = Animated.sequence([
          Animated.parallel([
            Animated.spring(headshotScale, {
              toValue: 1,
              friction: 4,
              tension: 60,
              useNativeDriver: true,
            }),
            Animated.timing(headshotOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(400),
          Animated.timing(headshotOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]);
      }

      const impactAnims = [flashAnims, ...particleAnims];
      if (headshotAnim) {
        impactAnims.push(headshotAnim);
      }

      // Phase 3: Play impact and fade out
      Animated.parallel(impactAnims).start(() => {
        setPlaying(false);
        setParticles([]);
        setShowHeadshot(false);
        onComplete();
      });
    });
  }, [bombY, bombX, bombOpacity, bombWobble, bombScale, shadowScale, shadowOpacity, flashOpacity, headshotScale, headshotOpacity, createParticles]);

  useImperativeHandle(ref, () => ({playAttack}), [playAttack]);

  if (!playing) {
    return null;
  }

  const flashColor = resultType === 'kill'
    ? 'rgba(255, 50, 50, 1)'
    : resultType === 'hit'
      ? 'rgba(255, 140, 0, 1)'
      : 'rgba(100, 180, 255, 1)';

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Flash overlay */}
      <Animated.View
        style={[styles.flash, {backgroundColor: flashColor, opacity: flashOpacity}]}
      />

      {/* Shadow on target */}
      <Animated.View
        style={[
          styles.shadow,
          {
            transform: [
              {translateX: targetRef.current.x - 15},
              {translateY: targetRef.current.y - 5},
              {scaleX: shadowScale},
              {scaleY: Animated.multiply(shadowScale, 0.4)},
            ],
            opacity: shadowOpacity,
          },
        ]}
      />

      {/* Bomb */}
      <Animated.View
        style={[
          styles.bombContainer,
          {
            opacity: bombOpacity,
            transform: [
              {translateX: Animated.add(bombX, bombWobble)},
              {translateY: bombY},
            ],
          },
        ]}>
        {/* Fins */}
        <View style={styles.finLeft} />
        <View style={styles.finRight} />
        {/* Body */}
        <View style={styles.bombBody}>
          <View style={styles.bombStripe} />
        </View>
        {/* Nose */}
        <View style={styles.bombNose} />
      </Animated.View>

      {/* Particles */}
      {particles.map(particle => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              backgroundColor: particle.color,
              width: resultType === 'kill' ? 6 : 4,
              height: resultType === 'kill' ? 6 : 4,
              borderRadius: resultType === 'kill' ? 3 : 2,
              opacity: particle.opacity,
              transform: [
                {translateX: Animated.add(new Animated.Value(targetRef.current.x), particle.x)},
                {translateY: Animated.add(new Animated.Value(targetRef.current.y), particle.y)},
                {scale: particle.scale},
              ],
            },
          ]}
        />
      ))}

      {/* HEADSHOT text */}
      {showHeadshot && (
        <Animated.View
          style={[
            styles.headshotContainer,
            {
              top: targetRef.current.y - 60,
              opacity: headshotOpacity,
              transform: [{scale: headshotScale}],
            },
          ]}>
          <Text style={styles.headshotText}>HEADSHOT!</Text>
        </Animated.View>
      )}
    </View>
  );
});

BombDropAnimation.displayName = 'BombDropAnimation';

export default BombDropAnimation;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
  },
  shadow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  bombContainer: {
    position: 'absolute',
    width: 20,
    height: 40,
    marginLeft: -10,
    alignItems: 'center',
  },
  finLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 8,
    height: 6,
    backgroundColor: '#555',
    borderTopLeftRadius: 2,
    transform: [{skewX: '-15deg'}],
  },
  finRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 6,
    backgroundColor: '#555',
    borderTopRightRadius: 2,
    transform: [{skewX: '15deg'}],
  },
  bombBody: {
    marginTop: 4,
    width: 14,
    height: 28,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
  },
  bombStripe: {
    position: 'absolute',
    top: 6,
    width: 14,
    height: 3,
    backgroundColor: '#ff4444',
  },
  bombNose: {
    width: 8,
    height: 8,
    backgroundColor: '#555',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  particle: {
    position: 'absolute',
  },
  headshotContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headshotText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 28,
    color: '#ff2222',
    textShadowColor: 'rgba(255, 0, 0, 0.8)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 12,
    letterSpacing: 4,
  },
});
