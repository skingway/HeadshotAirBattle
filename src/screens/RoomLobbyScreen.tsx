/**
 * Room Lobby Screen
 * Waiting room for both players to be ready
 */

import React, {useEffect, useState} from 'react';
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

  const handleStateChange = (state: GameState) => {
    setGameState(state);

    // Check if both players are ready
    if (state.status === 'deploying' && state.player1?.ready && state.player2?.ready) {
      // Both players ready, start deployment
      navigation.replace('OnlineGame', {gameId});
    }

    // Check if opponent disconnected
    if (state.player1 && !state.player1.connected) {
      Alert.alert('Opponent Disconnected', 'Player 1 has left the game');
      handleLeave();
    }
    if (state.player2 && !state.player2.connected) {
      Alert.alert('Opponent Disconnected', 'Player 2 has left the game');
      handleLeave();
    }
  };

  const handleReady = async () => {
    const newReadyState = !isReady;
    const success = await MultiplayerService.setReady(newReadyState);

    if (success) {
      setIsReady(newReadyState);
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
            navigation.navigate('OnlineMode');
          },
        },
      ]
    );
  };

  if (!gameState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
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
                <ActivityIndicator color="#4CAF50" />
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
    backgroundColor: '#1a1a2e',
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
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 10,
  },
  roomCodeLabel: {
    fontSize: 14,
    color: '#aaa',
    marginRight: 8,
  },
  roomCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    marginBottom: 30,
  },
  playerCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  currentPlayerCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  playerRole: {
    fontSize: 14,
    color: '#aaa',
  },
  statusBadge: {
    backgroundColor: '#0f3460',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusReady: {
    backgroundColor: '#1a4d2e',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#aaa',
  },
  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginVertical: 8,
  },
  infoCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  infoLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  readyButton: {
    backgroundColor: '#2196F3',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  readyButtonActive: {
    backgroundColor: '#4CAF50',
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaveButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
