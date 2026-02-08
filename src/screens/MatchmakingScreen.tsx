/**
 * Matchmaking Screen
 * Waiting for match with loading animation
 */

import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import MatchmakingService from '../services/MatchmakingService';
import MultiplayerService from '../services/MultiplayerService';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  OnlineMode: undefined;
  Matchmaking: {mode: string};
  RoomLobby: {gameId: string; roomCode?: string};
  OnlineGame: {gameId: string};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Matchmaking'>;
  route: RouteProp<RootStackParamList, 'Matchmaking'>;
};

export default function MatchmakingScreen({navigation, route}: Props) {
  const {mode} = route.params;
  const [elapsedTime, setElapsedTime] = useState(0);
  const [status, setStatus] = useState('Joining queue...');

  // Animation
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    startSpinAnimation();
    startPulseAnimation();

    // Join matchmaking queue
    joinMatchmaking();

    // Timer
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(timer);
      MatchmakingService.cleanup();
    };
  }, []);

  const startSpinAnimation = () => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const joinMatchmaking = async () => {
    setStatus('Searching for opponent...');

    const result = await MatchmakingService.joinQueue(mode);

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to join matchmaking');
      navigation.goBack();
      return;
    }

    // Listen for match found
    MatchmakingService.onMatchFound(async (gameId: string | null) => {
      // Check if timeout (gameId will be null)
      if (!gameId) {
        console.log('[MatchmakingScreen] Search timeout (60s)');
        Alert.alert(
          'No Match Found',
          'No opponents found after 60 seconds. Please try again later.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      console.log('[MatchmakingScreen] Match found:', gameId);
      setStatus('Match found!');

      // Small delay to show "Match found" message
      setTimeout(() => {
        // Check if we are player1 or player2
        const currentGame = MultiplayerService.getCurrentGame();
        if (currentGame && currentGame.role === 'player1') {
          // Player1 created the game, go to lobby
          navigation.replace('RoomLobby', {gameId});
        } else {
          // Player2 joins, need to join the game first
          joinGameAsPlayer2(gameId);
        }
      }, 1000);
    });
  };

  const joinGameAsPlayer2 = async (gameId: string) => {
    const result = await MultiplayerService.joinGame(gameId);

    if (result.success) {
      navigation.replace('RoomLobby', {gameId});
    } else {
      Alert.alert('Error', 'Failed to join game');
      navigation.goBack();
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Matchmaking',
      'Are you sure you want to cancel?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          onPress: async () => {
            await MatchmakingService.leaveQueue();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Icon */}
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.outerCircle,
              {transform: [{scale: pulseValue}]},
            ]}>
            <Animated.View
              style={[
                styles.innerCircle,
                {transform: [{rotate: spin}]},
              ]}>
              <Text style={styles.icon}>⚔️</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Status */}
        <Text style={styles.status}>{status}</Text>

        {/* Timer */}
        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Looking for an opponent...
          </Text>
          <Text style={styles.infoSubtext}>
            This may take a few moments
          </Text>
        </View>

        {/* Players in queue indicator */}
        <View style={styles.queueInfo}>
          <View style={styles.dot} />
          <Text style={styles.queueText}>Searching worldwide</Text>
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animationContainer: {
    marginBottom: 40,
  },
  outerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  icon: {
    fontSize: 60,
  },
  status: {
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  timer: {
    fontFamily: fonts.orbitronExtraBold,
    fontSize: 42,
    color: colors.accent,
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  infoText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtext: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  queueText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
  },
  cancelButton: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.danger,
    fontSize: 14,
    letterSpacing: 2,
  },
});
