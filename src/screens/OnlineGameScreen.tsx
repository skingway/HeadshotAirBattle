/**
 * Online Game Screen
 * Real-time multiplayer battle interface
 */

import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

import GameConstants from '../config/GameConstants';
import BoardManager from '../core/BoardManager';
import Airplane from '../core/Airplane';
import CoordinateSystem from '../core/CoordinateSystem';
import AudioManager from '../services/AudioManager';
import DeploymentPhase from '../components/DeploymentPhase';
import CountdownScreen from '../components/CountdownScreen';
import DualBoardView from '../components/DualBoardView';
import database from '@react-native-firebase/database';
import MultiplayerService, {GameState} from '../services/MultiplayerService';
import AuthService from '../services/AuthService';
import StatisticsService from '../services/StatisticsService';

type RootStackParamList = {
  OnlineMode: undefined;
  OnlineGame: {gameId: string};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnlineGame'>;
  route: RouteProp<RootStackParamList, 'OnlineGame'>;
};

type GamePhase = 'deploying' | 'waiting' | 'countdown' | 'battle' | 'gameover';

export default function OnlineGameScreen({navigation, route}: Props) {
  const {gameId} = route.params;
  const [phase, setPhase] = useState<GamePhase>('deploying');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [renderKey, setRenderKey] = useState<number>(0); // Force re-render counter

  // Use refs for boards to prevent re-creation on state updates
  const playerBoardRef = useRef<BoardManager | null>(null);
  const opponentBoardRef = useRef<BoardManager | null>(null);
  const myRole = useRef<'player1' | 'player2' | null>(null);
  const phaseRef = useRef<GamePhase>('deploying');

  // Helper to prevent backwards phase transitions
  const transitionToPhase = useCallback((newPhase: GamePhase, reason?: string) => {
    const phaseOrder: GamePhase[] = ['deploying', 'waiting', 'countdown', 'battle', 'gameover'];
    const currentIndex = phaseOrder.indexOf(phaseRef.current);
    const newIndex = phaseOrder.indexOf(newPhase);

    // Allow transition if moving forward or staying in same phase
    if (newIndex >= currentIndex) {
      if (phaseRef.current !== newPhase) {
        console.log(`[OnlineGameScreen] Phase transition: ${phaseRef.current} → ${newPhase}${reason ? ` (${reason})` : ''}`);
        phaseRef.current = newPhase;
        setPhase(newPhase);
      }
    } else {
      console.log(`[OnlineGameScreen] Blocked backwards transition: ${phaseRef.current} → ${newPhase}`);
    }
  }, []);

  // Initialize audio
  useEffect(() => {
    AudioManager.init();
  }, []);

  // Listen for game state changes
  useEffect(() => {
    const currentGame = MultiplayerService.getCurrentGame();
    if (currentGame) {
      myRole.current = currentGame.role;
      console.log('[OnlineGameScreen] My role initialized:', myRole.current);
      // Set initial game state
      setGameState(currentGame);
    }

    const handleStateChange = (state: GameState) => {
    console.log('[OnlineGameScreen] Game state changed:', state.status);
    setGameState(state);

    // Check if opponent disconnected
    const myPlayer = myRole.current === 'player1' ? state.player1 : state.player2;
    const opponent = myRole.current === 'player1' ? state.player2 : state.player1;

    if (opponent && !opponent.connected) {
      Alert.alert(
        'Opponent Disconnected',
        `${opponent.nickname} has left the game`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('OnlineMode'),
          },
        ]
      );
      return;
    }

    // Handle phase transitions
    if (state.status === 'deploying') {
      console.log('[OnlineGameScreen] Deploying phase - myRole:', myRole.current);
      console.log('[OnlineGameScreen] player1 ready:', state.player1?.ready);
      console.log('[OnlineGameScreen] player2 ready:', state.player2?.ready);
      console.log('[OnlineGameScreen] myPlayer ready:', myPlayer?.ready);
      console.log('[OnlineGameScreen] opponent ready:', opponent?.ready);

      // Check if both players are ready AND have board data
      if (state.player1?.ready && state.player2?.ready) {
        console.log('[OnlineGameScreen] Both players ready in Firebase!');
        console.log('[OnlineGameScreen] player1.board exists:', !!state.player1?.board);
        console.log('[OnlineGameScreen] player2.board exists:', !!state.player2?.board);

        // Both deployed AND both have board data
        if (myPlayer?.ready && opponent?.ready && myPlayer?.board && opponent?.board) {
          console.log('[OnlineGameScreen] Both players ready AND have board data');
          console.log('[OnlineGameScreen] Board data exists - myPlayer:', !!myPlayer?.board, 'opponent:', !!opponent?.board);
          // Just transition to countdown and wait for server to change status to 'battle'
          // The battle will be started automatically by MultiplayerService.submitBoard()
          createOpponentBoard(opponent, state);
          transitionToPhase('countdown', 'both players ready, waiting for battle status');
        } else {
          console.log('[OnlineGameScreen] Waiting for board data - myPlayer.board:', !!myPlayer?.board, 'opponent.board:', !!opponent?.board);
        }
      } else if (myPlayer?.ready && !opponent?.ready) {
        // We're ready, waiting for opponent
        console.log('[OnlineGameScreen] Waiting for opponent to deploy');
        transitionToPhase('waiting', 'waiting for opponent');
        addLog(`Waiting for ${opponent?.nickname || 'opponent'} to deploy...`);
      }
    } else if (state.status === 'battle') {
      console.log('[OnlineGameScreen] Battle status received, phaseRef.current:', phaseRef.current);

      // Create boards ONCE if they don't exist
      if (!playerBoardRef.current && myPlayer?.ready && myPlayer?.board) {
        console.log('[OnlineGameScreen] Creating player board ONCE from Firebase data');
        const board = new BoardManager(state.boardSize, state.airplaneCount);
        myPlayer.board.airplanes.forEach((airplaneData: any) => {
          const airplane = new Airplane(
            airplaneData.headRow,
            airplaneData.headCol,
            airplaneData.direction,
            airplaneData.id
          );
          board.airplanes.push(airplane);
        });
        playerBoardRef.current = board;
        setRenderKey(prev => prev + 1); // Force render
      }

      if (!opponentBoardRef.current && opponent?.ready && opponent?.board) {
        console.log('[OnlineGameScreen] Creating opponent board ONCE from Firebase data');
        const board = new BoardManager(state.boardSize, state.airplaneCount);
        opponent.board.airplanes.forEach((airplaneData: any) => {
          const airplane = new Airplane(
            airplaneData.headRow,
            airplaneData.headCol,
            airplaneData.direction,
            airplaneData.id
          );
          board.airplanes.push(airplane);
        });
        opponentBoardRef.current = board;
        setRenderKey(prev => prev + 1); // Force render
      }

      // Transition to battle phase
      if (phaseRef.current !== 'battle') {
        transitionToPhase('battle', 'Firebase status is battle');
        addLog('Battle started!');
      }

      // Update turn indicator
      const userId = AuthService.getUserId();
      setIsMyTurn(state.currentTurn === userId);

      // Sync opponent's attacks to our board
      if (opponent?.attacks && playerBoardRef.current) {
        syncOpponentAttacks(opponent.attacks);
      }
    } else if (state.status === 'finished') {
      transitionToPhase('gameover', 'game finished');
      const userId = AuthService.getUserId();
      const didWin = state.winner === userId;

      if (didWin) {
        addLog('🎉 YOU WIN!');
        AudioManager.playSFX('victory');
      } else {
        addLog('💀 GAME OVER');
        AudioManager.playSFX('defeat');
      }

      // Update statistics
      StatisticsService.updateStatistics(didWin, true).then(success => {
        console.log('[OnlineGameScreen] Statistics update result:', success);
      });

      // Save game history
      const playerBoard = playerBoardRef.current;
      const opponentBoard = opponentBoardRef.current;
      if (gameState && playerBoard && opponentBoard) {
        const historyData = {
          gameType: 'online' as const,
          opponent: opponent?.nickname || 'Unknown',
          winner: state.winner || '',
          boardSize: state.boardSize,
          airplaneCount: state.airplaneCount,
          totalTurns: myPlayer?.attacks.length || 0,
          completedAt: Date.now(),
          playerBoardData: {
            airplanes: playerBoard.airplanes.map(a => ({
              id: a.id,
              headRow: a.headRow,
              headCol: a.headCol,
              direction: a.direction,
            })),
            attacks: playerBoard.getAttackHistory(),
          },
          opponentBoardData: {
            attacks: opponentBoard.getAttackHistory(),
          },
          playerStats: myPlayer?.stats || {hits: 0, misses: 0, kills: 0},
          opponentStats: opponent?.stats || {hits: 0, misses: 0, kills: 0},
        };

        StatisticsService.saveGameHistory(historyData).then(success => {
          console.log('[OnlineGameScreen] Game history save result:', success);
        });
      }
    }
    };

    MultiplayerService.onStateChange(handleStateChange);

    return () => {
      MultiplayerService.offStateChange(handleStateChange);
    };
  }, [transitionToPhase]);

  const createOpponentBoard = (opponent: any, state: GameState) => {
    if (!state || !opponent.board) {
      console.log('[OnlineGameScreen] Cannot create opponent board - state:', !!state, 'opponent.board:', !!opponent.board);
      return;
    }

    console.log('[OnlineGameScreen] Creating opponent board with', opponent.board.airplanes.length, 'airplanes');
    // Create opponent board with their airplane positions (from server)
    const board = new BoardManager(state.boardSize, state.airplaneCount);

    // Recreate opponent's airplanes from board data
    opponent.board.airplanes.forEach((airplaneData: any) => {
      const airplane = new Airplane(
        airplaneData.headRow,
        airplaneData.headCol,
        airplaneData.direction,
        airplaneData.id
      );
      board.airplanes.push(airplane);
    });

    opponentBoardRef.current = board;
    setRenderKey(prev => prev + 1); // Force render
  };

  const syncOpponentAttacks = (attacks: Array<{row: number; col: number; result: string; timestamp: number}>) => {
    const playerBoard = playerBoardRef.current;
    if (!playerBoard) return;

    let hasNewAttacks = false;

    // Apply all opponent attacks to our board
    attacks.forEach(attack => {
      if (!playerBoard.isCellAttacked(attack.row, attack.col)) {
        playerBoard.processAttack(attack.row, attack.col);
        hasNewAttacks = true;
      }
    });

    // Force re-render if there were new attacks
    if (hasNewAttacks) {
      setRenderKey(prev => prev + 1);
    }
  };

  // Battle is now started automatically by MultiplayerService.submitBoard()
  // No need for manual startBattle function

  const handleDeploymentComplete = async (deployedBoard: BoardManager) => {
    console.log('[OnlineGameScreen] Deployment complete, submitting to server...');
    console.log('[OnlineGameScreen] Current phase before submit:', phaseRef.current);

    // If already in battle or later phase, ignore this callback
    if (phaseRef.current !== 'deploying') {
      console.log('[OnlineGameScreen] Ignoring deployment complete - already past deploying phase');
      return;
    }

    playerBoardRef.current = deployedBoard;

    // Submit board to server
    const success = await MultiplayerService.submitBoard({
      airplanes: deployedBoard.airplanes.map(a => ({
        id: a.id,
        headRow: a.headRow,
        headCol: a.headCol,
        direction: a.direction,
      })),
    });

    if (success) {
      await MultiplayerService.setReady(true);
      addLog('Deployment submitted! Waiting for opponent...');
      transitionToPhase('waiting', 'deployment complete');
    } else {
      Alert.alert('Error', 'Failed to submit deployment');
    }
  };

  const handleCountdownComplete = () => {
    transitionToPhase('battle', 'countdown complete');
    addLog('Battle started!');
  };

  const handleCellPress = async (row: number, col: number) => {
    const opponentBoard = opponentBoardRef.current;
    if (phase !== 'battle' || !isMyTurn || !opponentBoard || !gameState) {
      return;
    }

    // Check if already attacked
    if (opponentBoard.isCellAttacked(row, col)) {
      addLog('Already attacked this cell!');
      return;
    }

    // Process attack locally against opponent's board
    const attackResult = opponentBoard.processAttack(row, col);
    const coord = CoordinateSystem.positionToCoordinate(row, col);

    // Play sound and show result
    if (attackResult.result === GameConstants.ATTACK_RESULTS.MISS) {
      addLog(`You attacked ${coord} - MISS`);
      AudioManager.playSFX('miss');
    } else if (attackResult.result === GameConstants.ATTACK_RESULTS.HIT) {
      addLog(`You attacked ${coord} - HIT! 🎯`);
      AudioManager.playSFX('hit');
    } else if (attackResult.result === GameConstants.ATTACK_RESULTS.KILL) {
      addLog(`You attacked ${coord} - KILL! ✈️💥`);
      AudioManager.playSFX('kill');

      // Check if all enemy airplanes destroyed
      if (opponentBoard.areAllAirplanesDestroyed()) {
        const userId = AuthService.getUserId();
        await MultiplayerService.attack(row, col, attackResult.result);
        await MultiplayerService.endGame(userId || '');
        return;
      }
    }

    // Send attack result to server
    const success = await MultiplayerService.attack(row, col, attackResult.result);

    if (!success) {
      Alert.alert('Error', 'Failed to send attack');
      return;
    }

    // Force re-render to show attack result
    setRenderKey(prev => prev + 1);
  };

  const handleSurrender = () => {
    Alert.alert(
      'Surrender',
      'Are you sure you want to surrender? This will be recorded as a loss.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Surrender',
          style: 'destructive',
          onPress: async () => {
            const userId = AuthService.getUserId();
            const opponent = myRole.current === 'player1' ? gameState?.player2 : gameState?.player1;
            await MultiplayerService.endGame(opponent?.id || '');
            navigation.navigate('OnlineMode');
          },
        },
      ]
    );
  };

  const addLog = (message: string) => {
    setGameLog(prev => [...prev, message].slice(-10));
  };

  // Show deployment phase
  if (phase === 'deploying' && gameState) {
    return (
      <DeploymentPhase
        boardSize={gameState.boardSize}
        airplaneCount={gameState.airplaneCount}
        onDeploymentComplete={handleDeploymentComplete}
        onCancel={() => {
          Alert.alert(
            'Leave Game',
            'Are you sure you want to leave?',
            [
              {text: 'No', style: 'cancel'},
              {
                text: 'Yes',
                onPress: async () => {
                  await MultiplayerService.leaveGame();
                  navigation.navigate('OnlineMode');
                },
              },
            ]
          );
        }}
      />
    );
  }

  // Show waiting screen
  if (phase === 'waiting') {
    const opponent = myRole.current === 'player1' ? gameState?.player2 : gameState?.player1;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingTitle}>Waiting for Opponent</Text>
          <ActivityIndicator size="large" color="#4CAF50" style={styles.waitingSpinner} />
          <Text style={styles.waitingText}>
            {opponent?.nickname || 'Opponent'} is deploying airplanes...
          </Text>
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={async () => {
              await MultiplayerService.leaveGame();
              navigation.navigate('OnlineMode');
            }}>
            <Text style={styles.leaveButtonText}>Leave Game</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show countdown phase
  if (phase === 'countdown') {
    return <CountdownScreen onComplete={handleCountdownComplete} />;
  }

  // Show battle/gameover phase
  const opponent = myRole.current === 'player1' ? gameState?.player2 : gameState?.player1;
  const myPlayer = myRole.current === 'player1' ? gameState?.player1 : gameState?.player2;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Online Battle</Text>
        <Text style={styles.opponent}>
          vs {opponent?.nickname || 'Opponent'}
        </Text>
        {phase === 'battle' && (
          <>
            <Text style={styles.turnIndicator}>
              {isMyTurn ? '🎯 Your Turn' : `⏳ ${opponent?.nickname || 'Opponent'}'s Turn`}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Your Hits</Text>
                <Text style={styles.statValue}>
                  {myPlayer?.stats.hits || 0}/{(myPlayer?.stats.hits || 0) + (myPlayer?.stats.misses || 0)}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Your Kills</Text>
                <Text style={styles.statValue}>
                  {myPlayer?.stats.kills || 0}/{gameState?.airplaneCount || 3}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Opponent Kills</Text>
                <Text style={styles.statValue}>
                  {opponent?.stats.kills || 0}/{gameState?.airplaneCount || 3}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {phase === 'battle' && playerBoardRef.current && opponentBoardRef.current && (
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollContainer}>
          <View style={styles.battleContainer}>
            <DualBoardView
              key={renderKey}
              playerBoard={playerBoardRef.current}
              enemyBoard={opponentBoardRef.current}
              currentTurn={isMyTurn ? 'player' : 'ai'}
              onCellPress={handleCellPress}
              showEnemyAirplanes={false}
            />
          </View>

          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Game Log:</Text>
            <ScrollView style={styles.logScroll} nestedScrollEnabled={true}>
              {gameLog.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.surrenderButton}
            onPress={handleSurrender}>
            <Text style={styles.surrenderButtonText}>🏳️ Surrender</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {phase === 'gameover' && (
        <View style={styles.gameoverContainer}>
          <Text style={styles.gameoverText}>
            {gameState?.winner === AuthService.getUserId() ? '🎉 YOU WIN!' : '💀 GAME OVER'}
          </Text>
          <Text style={styles.gameoverSubtext}>
            {gameState?.winner === AuthService.getUserId()
              ? `You defeated ${opponent?.nickname || 'opponent'}!`
              : `${opponent?.nickname || 'Opponent'} won this round!`}
          </Text>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={async () => {
              await MultiplayerService.leaveGame();
              // Reset navigation stack to OnlineMode
              navigation.reset({
                index: 0,
                routes: [{name: 'OnlineMode'}],
              });
            }}>
            <Text style={styles.menuButtonText}>Back to Online Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuButton, {backgroundColor: '#607D8B', marginTop: 16}]}
            onPress={async () => {
              await MultiplayerService.leaveGame();
              // Navigate back to main menu
              navigation.reset({
                index: 0,
                routes: [{name: 'MainMenu'}],
              });
            }}>
            <Text style={styles.menuButtonText}>Back to Main Menu</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 15,
    backgroundColor: '#16213e',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  opponent: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 5,
  },
  turnIndicator: {
    fontSize: 16,
    color: '#FFD700',
    marginTop: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    width: '100%',
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 5,
    minWidth: 90,
  },
  statLabel: {
    fontSize: 10,
    color: '#aaa',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    flexGrow: 1,
  },
  battleContainer: {
    flex: 1,
    minHeight: 500,
  },
  logContainer: {
    backgroundColor: '#16213e',
    padding: 10,
    margin: 10,
    borderRadius: 10,
    maxHeight: 120,
  },
  logScroll: {
    maxHeight: 80,
  },
  logTitle: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  logText: {
    fontSize: 13,
    color: '#e0e0e0',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  waitingSpinner: {
    marginVertical: 20,
  },
  waitingText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 40,
  },
  leaveButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameoverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameoverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  gameoverSubtext: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 30,
    textAlign: 'center',
  },
  menuButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  surrenderButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D32F2F',
  },
  surrenderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
