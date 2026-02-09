/**
 * Room Lobby Screen
 * Waiting room for both players to be ready
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import MultiplayerService, {GameState} from '../services/MultiplayerService';
import database from '@react-native-firebase/database';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  OnlineMode: undefined;
  RoomLobby: {gameId: string; roomCode?: string};
  OnlineGame: {gameId: string};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomLobby'>;
  route: RouteProp<RootStackParamList, 'RoomLobby'>;
};

export default function RoomLobbyScreen({navigation, route}: Props) {
  const {gameId, roomCode} = route.params;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get initial game state
    const currentGame = MultiplayerService.getCurrentGame();
    if (currentGame) {
      setGameState(currentGame);
    }

    // Listen for game state changes
    MultiplayerService.onStateChange(handleStateChange);

    // Cleanup
    return () => {
      MultiplayerService.offStateChange(handleStateChange);
    };
  }, []);

  const hasNavigatedRef = React.useRef(false);

  // Polling fallback: check every 3 seconds in case real-time listener misses an update
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasNavigatedRef.current) return;

      const currentGame = MultiplayerService.getCurrentGame();
      if (!currentGame) return;

      try {
        const snapshot = await database().ref(`activeGames/${gameId}`).once('value');
        if (!snapshot.exists()) return;

        const data = snapshot.val();
        const p1Ready = data?.player1?.ready || data?.player1?.playerReady;
        const p2Ready = data?.player2?.ready || data?.player2?.playerReady;
        const status = data?.status;

        console.log('[RoomLobby] Poll check:', { p1Ready, p2Ready, status, hasNavigated: hasNavigatedRef.current });

        if (p1Ready && p2Ready && !hasNavigatedRef.current) {
          if (status === 'waiting') {
            console.log('[RoomLobby] Poll: Both ready but status=waiting, setting deploying');
            await database().ref(`activeGames/${gameId}/status`).set('deploying');
          }
          console.log('[RoomLobby] Poll: Both ready! Navigating to game');
          hasNavigatedRef.current = true;
          navigation.replace('OnlineGame', {gameId});
        }
      } catch (error) {
        console.log('[RoomLobby] Poll error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameId, navigation]);

  const handleStateChange = (state: GameState) => {
    console.log('[RoomLobby] State change:', {
      status: state.status,
      p1Ready: state.player1?.ready,
      p2Ready: state.player2?.ready,
      p1Connected: state.player1?.connected,
      p2Connected: state.player2?.connected,
      hasNavigated: hasNavigatedRef.current,
    });

    setGameState(state);

    // Prevent processing after we've already navigated away
    if (hasNavigatedRef.current) {
      return;
    }

    const currentGame = MultiplayerService.getCurrentGame();
    const myRole = currentGame?.role;

    // Determine which player is the opponent
    const opponent = myRole === 'player1' ? state.player2 : state.player1;

    // Check if both players are ready - navigate to deployment/game
    console.log('[RoomLobby] Navigation check:', {
      p1Ready: state.player1?.ready,
      p2Ready: state.player2?.ready,
      status: state.status,
    });
    if (state.player1?.ready && state.player2?.ready) {
      if (state.status === 'waiting') {
        console.log('[RoomLobby] Both ready but status=waiting, setting deploying');
        database().ref(`activeGames/${gameId}/status`).set('deploying');
      }
      console.log('[RoomLobby] Both ready! Navigating to OnlineGame');
      hasNavigatedRef.current = true;
      navigation.replace('OnlineGame', {gameId});
      return;
    }

    // Check if opponent disconnected (only check the OTHER player, not ourselves)
    // IMPORTANT: Use === false, not !connected, to avoid triggering on undefined
    if (opponent && opponent.connected === false) {
      hasNavigatedRef.current = true;
      Alert.alert(
        'Opponent Disconnected',
        `${opponent.nickname || 'Opponent'} has left the game`,
        [{
          text: 'OK',
          onPress: async () => {
            await MultiplayerService.leaveGame();
            navigation.replace('OnlineMode');
          },
        }]
      );
    }
  };

  const handleReady = async () => {
    const newReadyState = !isReady;
    const success = await MultiplayerService.setReady(newReadyState);

    if (success) {
      setIsReady(newReadyState);

      // CRITICAL: After write succeeds, directly read Firebase and navigate
      // This bypasses the real-time listener which may have timing issues
      if (newReadyState && !hasNavigatedRef.current) {
        try {
          const snapshot = await database().ref(`activeGames/${gameId}`).once('value');
          if (snapshot.exists()) {
            const data = snapshot.val();
            const p1Ready = data?.player1?.ready || data?.player1?.playerReady;
            const p2Ready = data?.player2?.ready || data?.player2?.playerReady;
            const status = data?.status;

            console.log('[RoomLobby] Direct check after ready:', { p1Ready, p2Ready, status });

            if (p1Ready && p2Ready && !hasNavigatedRef.current) {
              if (status === 'waiting') {
                console.log('[RoomLobby] Direct check: Both ready but status=waiting, setting deploying');
                await database().ref(`activeGames/${gameId}/status`).set('deploying');
              }
              console.log('[RoomLobby] Direct check: Both ready! Navigating');
              hasNavigatedRef.current = true;
              navigation.replace('OnlineGame', {gameId});
            }
          }
        } catch (error) {
          console.log('[RoomLobby] Direct check error:', error);
        }
      }
    } else {
      Alert.alert('Error', 'Failed to update ready status');
    }
  };

  const handleShareRoomCode = async () => {
    if (!roomCode) return;

    try {
      await Share.share({
        message: `Join my Headshot: Air Battle game!\nRoom Code: ${roomCode}`,
      });
    } catch (error) {
      console.error('[RoomLobbyScreen] Error sharing:', error);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            await MultiplayerService.leaveGame();
            navigation.replace('OnlineMode');
          },
        },
      ]
    );
  };

  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentGame = MultiplayerService.getCurrentGame();
  const isHost = currentGame?.role === 'player1';
  const player1 = gameState.player1;
  const player2 = gameState.player2;
  const waitingForOpponent = !player2;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Game Lobby</Text>
          {roomCode && (
            <View style={styles.roomCodeContainer}>
              <Text style={styles.roomCodeLabel}>Room Code:</Text>
              <Text style={styles.roomCode}>{roomCode}</Text>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareRoomCode}>
                <Text style={styles.shareIcon}>📤</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Players */}
        <View style={styles.playersContainer}>
          {/* Player 1 */}
          <View style={[
            styles.playerCard,
            isHost && styles.currentPlayerCard,
          ]}>
            <View style={styles.playerHeader}>
              <Text style={styles.playerIcon}>👤</Text>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player1?.nickname || 'Player 1'}
                  {isHost && ' (You)'}
                </Text>
                <Text style={styles.playerRole}>Host</Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              player1?.ready && styles.statusReady,
            ]}>
              <Text style={styles.statusText}>
                {player1?.ready ? '✓ Ready' : '⏳ Not Ready'}
              </Text>
            </View>
          </View>

          {/* VS */}
          <Text style={styles.vsText}>VS</Text>

          {/* Player 2 */}
          {waitingForOpponent ? (
            <View style={styles.playerCard}>
              <View style={styles.waitingContainer}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.waitingText}>Waiting for opponent...</Text>
              </View>
            </View>
          ) : (
            <View style={[
              styles.playerCard,
              !isHost && styles.currentPlayerCard,
            ]}>
              <View style={styles.playerHeader}>
                <Text style={styles.playerIcon}>👤</Text>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {player2?.nickname || 'Player 2'}
                    {!isHost && ' (You)'}
                  </Text>
                  <Text style={styles.playerRole}>Guest</Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                player2?.ready && styles.statusReady,
              ]}>
                <Text style={styles.statusText}>
                  {player2?.ready ? '✓ Ready' : '⏳ Not Ready'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Game Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Game Settings</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mode:</Text>
            <Text style={styles.infoValue}>{gameState.mode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Board Size:</Text>
            <Text style={styles.infoValue}>
              {gameState.boardSize}×{gameState.boardSize}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Airplanes:</Text>
            <Text style={styles.infoValue}>{gameState.airplaneCount}</Text>
          </View>
        </View>

        {/* Ready Button */}
        {!waitingForOpponent && (
          <TouchableOpacity
            style={[
              styles.readyButton,
              isReady && styles.readyButtonActive,
            ]}
            onPress={handleReady}>
            <Text style={styles.readyButtonText}>
              {isReady ? '✓ Ready' : 'Ready Up'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Leave Button */}
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={handleLeave}>
          <Text style={styles.leaveButtonText}>Leave Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.rajdhaniRegular,
    marginTop: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 16,
    letterSpacing: 2,
  },
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  roomCodeLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginRight: 8,
  },
  roomCode: {
    fontFamily: fonts.orbitronExtraBold,
    fontSize: 22,
    color: colors.accent,
    letterSpacing: 4,
  },
  shareButton: {
    marginLeft: 12,
    padding: 8,
  },
  shareIcon: {
    fontSize: 24,
  },
  playersContainer: {
    marginBottom: 24,
  },
  playerCard: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  currentPlayerCard: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  playerRole: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  statusReady: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  statusText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingText: {
    fontFamily: fonts.rajdhaniRegular,
    marginTop: 12,
    fontSize: 14,
    color: colors.textMuted,
  },
  vsText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 20,
    color: colors.textDark,
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 2,
  },
  infoCard: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  infoTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 14,
    color: colors.accent,
    marginBottom: 16,
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  readyButton: {
    backgroundColor: colors.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  readyButtonActive: {
    backgroundColor: colors.success,
  },
  readyButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 2,
  },
  leaveButton: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.danger,
    fontSize: 13,
    letterSpacing: 1,
  },
});
