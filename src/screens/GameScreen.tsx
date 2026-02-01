import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';

import GameConstants from '../config/GameConstants';
import BoardManager from '../core/BoardManager';
import AIStrategy from '../ai/AIStrategy';
import AIStrategyUltraV2 from '../ai/AIStrategyUltraV2';
import CoordinateSystem from '../core/CoordinateSystem';
import AudioManager from '../services/AudioManager';
import DeploymentPhase from '../components/DeploymentPhase';
import CountdownScreen from '../components/CountdownScreen';
import DualBoardView from '../components/DualBoardView';
import StatisticsService from '../services/StatisticsService';
import AuthService from '../services/AuthService';
import {AchievementService} from '../services/AchievementService';
import {useOrientation} from '../hooks/useOrientation';

type RootStackParamList = {
  MainMenu: undefined;
  Game: {difficulty: string; mode: string; boardSize?: number; airplaneCount?: number};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game'>;
  route: RouteProp<RootStackParamList, 'Game'>;
};

type GamePhase = 'deployment' | 'countdown' | 'battle' | 'gameover';

export default function GameScreen({navigation, route}: Props) {
  const {difficulty, mode, boardSize: customBoardSize, airplaneCount: customAirplaneCount} = route.params;

  // Use custom values if provided, otherwise use defaults from mode
  const modeConfig = GameConstants.getModeConfig(mode);
  const boardSize = customBoardSize || modeConfig.boardSize || 10;
  const airplaneCount = customAirplaneCount || modeConfig.defaultAirplanes || 3;

  const [phase, setPhase] = useState<GamePhase>('deployment');
  const [playerBoard, setPlayerBoard] = useState<BoardManager | null>(null);
  const [aiBoard, setAiBoard] = useState<BoardManager | null>(null);
  const [aiStrategy, setAiStrategy] = useState<any>(null);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState<number>(0);
  const [playerStats, setPlayerStats] = useState({hits: 0, misses: 0, kills: 0});
  const [aiStats, setAiStats] = useState({hits: 0, misses: 0, kills: 0});

  // Turn timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(GameConstants.TURN_TIMER.DURATION);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Screen orientation
  const orientation = useOrientation();
  const isLandscape = orientation === 'landscape';

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    StatusBar.setHidden(!isFullscreen);
  };

  // Initialize game and audio
  useEffect(() => {
    AudioManager.init();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleDeploymentComplete = (deployedBoard: BoardManager) => {
    console.log('[GameScreen] Player deployment complete, initializing AI...');

    // Create AI board
    const aBoard = new BoardManager(boardSize, airplaneCount);
    const aiSuccess = aBoard.placeAirplanesRandomly();

    if (!aiSuccess) {
      Alert.alert('Error', 'Failed to place AI airplanes');
      return;
    }

    // Create AI strategy
    let strategy;
    if (difficulty === 'hard') {
      strategy = new AIStrategyUltraV2('hard', boardSize);
    } else {
      strategy = new AIStrategy(difficulty, boardSize);
    }

    setPlayerBoard(deployedBoard);
    setAiBoard(aBoard);
    setAiStrategy(strategy);

    addLog('Both players deployed airplanes!');
    addLog('Preparing for battle...');

    // Start countdown before battle
    setTimeout(() => {
      setPhase('countdown');
    }, 500);
  };

  const handleCountdownComplete = () => {
    setPhase('battle');
    addLog("Battle started! It's your turn!");
    addLog("Tap on enemy board to attack.");
    // Start timer for first turn
    startTurnTimer();
  };

  const resetGame = () => {
    stopTurnTimer();
    setPhase('deployment');
    setPlayerBoard(null);
    setAiBoard(null);
    setAiStrategy(null);
    setCurrentTurn('player');
    setWinner(null);
    setGameLog([]);
    setTurnCount(0);
    setPlayerStats({hits: 0, misses: 0, kills: 0});
    setAiStats({hits: 0, misses: 0, kills: 0});
    setTimeRemaining(GameConstants.TURN_TIMER.DURATION);
  };

  const handleSurrender = () => {
    Alert.alert(
      'Surrender',
      'Are you sure you want to surrender? This will be recorded as a loss.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Surrender',
          style: 'destructive',
          onPress: () => {
            stopTurnTimer();
            setWinner('AI');
            setPhase('gameover');
            addLog('🏳️ You surrendered!');
            AudioManager.playSFX('defeat');

            // Update statistics - record as loss
            console.log('[GameScreen] Player surrendered! Updating statistics...');
            StatisticsService.updateStatistics(false, false).then(success => {
              console.log('[GameScreen] Statistics update result:', success);
            });
            StatisticsService.saveGameHistory({
              gameType: 'ai',
              opponent: `${difficulty.toUpperCase()} AI`,
              winner: 'AI',
              boardSize: boardSize,
              airplaneCount: airplaneCount,
              totalTurns: turnCount,
              completedAt: Date.now(),
              // Board snapshot data - preserve battle state even when surrendering
              playerBoardData: playerBoard ? {
                airplanes: playerBoard.airplanes.map(a => ({
                  id: a.id,
                  headRow: a.headRow,
                  headCol: a.headCol,
                  direction: a.direction,
                  hits: Array.from(a.hits || []),
                  isDestroyed: a.isDestroyed || false,
                })),
                attacks: playerBoard.getAttackHistory(), // AI's attacks on player board
              } : null,
              aiBoardData: aiBoard ? {
                airplanes: aiBoard.airplanes.map(a => ({
                  id: a.id,
                  headRow: a.headRow,
                  headCol: a.headCol,
                  direction: a.direction,
                  hits: Array.from(a.hits || []),
                  isDestroyed: a.isDestroyed || false,
                })),
                attacks: aiBoard.getAttackHistory(), // Player's attacks on AI board
              } : null,
              playerStats: playerStats,
              aiStats: aiStats,
            }).then(success => {
              console.log('[GameScreen] Game history save result (surrender):', success);
              if (success) {
                checkAchievements({
                  gameType: 'ai',
                  opponent: `${difficulty.toUpperCase()} AI`,
                  winner: 'AI',
                  boardSize: boardSize,
                  airplaneCount: airplaneCount,
                  totalTurns: turnCount,
                  completedAt: Date.now(),
                  playerStats: playerStats,
                  aiStats: aiStats,
                });
              }
            });
          },
        },
      ]
    );
  };

  const addLog = (message: string) => {
    setGameLog(prev => [...prev, message].slice(-10)); // Keep last 10 messages
  };

  // Check achievements after game ends
  const checkAchievements = async (historyData: any) => {
    try {
      console.log('[GameScreen] Checking achievements...');

      // Get current user statistics
      const userStats = await StatisticsService.refresh();

      // Prepare game result data for achievement checking
      const gameResult = {
        won: historyData.winner === (AuthService.getUserId() || 'Player'),
        difficulty: difficulty,
        boardSize: boardSize,
        airplaneCount: airplaneCount,
        totalTurns: historyData.totalTurns,
        playerStats: historyData.playerStats,
        aiStats: historyData.aiStats,
        accuracy: historyData.playerStats.hits + historyData.playerStats.misses > 0
          ? (historyData.playerStats.hits / (historyData.playerStats.hits + historyData.playerStats.misses)) * 100
          : 0,
      };

      // Check game-end achievements
      const gameEndAchievements = await AchievementService.checkGameEndAchievements(gameResult, userStats);
      if (gameEndAchievements.length > 0) {
        console.log('[GameScreen] Unlocked achievements (game-end):', gameEndAchievements.map(a => a.name).join(', '));
      }

      // Check stats achievements
      const statsAchievements = await AchievementService.checkStatsAchievements(gameResult, userStats);
      if (statsAchievements.length > 0) {
        console.log('[GameScreen] Unlocked achievements (stats):', statsAchievements.map(a => a.name).join(', '));
      }

      // Show achievement notifications
      const allNewAchievements = [...gameEndAchievements, ...statsAchievements];
      if (allNewAchievements.length > 0) {
        // TODO: Show achievement notification UI
        const achievementNames = allNewAchievements.map(a => `${a.icon} ${a.name}`).join('\n');
        setTimeout(() => {
          Alert.alert(
            '🏆 Achievement Unlocked!',
            achievementNames,
            [{text: 'OK'}]
          );
        }, 1000);
      }
    } catch (error) {
      console.error('[GameScreen] Error checking achievements:', error);
    }
  };

  // Start turn timer
  const startTurnTimer = () => {
    // Clear existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset time
    setTimeRemaining(GameConstants.TURN_TIMER.DURATION);

    // Start countdown
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, GameConstants.TURN_TIMER.DURATION - elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }, GameConstants.TURN_TIMER.TICK_INTERVAL);

    // Set timeout for turn end
    timeoutRef.current = setTimeout(() => {
      handleTurnTimeout();
    }, GameConstants.TURN_TIMER.DURATION);
  };

  // Stop turn timer
  const stopTurnTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Handle turn timeout
  const handleTurnTimeout = () => {
    if (phase !== 'battle') return;

    stopTurnTimer();

    if (currentTurn === 'player') {
      // Player timeout: make random attack
      addLog('⏱️ Time out! Random attack...');
      performRandomPlayerAttack();
    } else {
      // AI timeout: execute AI turn
      performAIAttack();
    }
  };

  // Perform random player attack on timeout
  const performRandomPlayerAttack = () => {
    if (!aiBoard || !playerBoard) return;

    // Find all unattacked cells
    const unattackedCells: {row: number; col: number}[] = [];
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (!aiBoard.isCellAttacked(row, col)) {
          unattackedCells.push({row, col});
        }
      }
    }

    if (unattackedCells.length === 0) {
      addLog('No valid moves!');
      return;
    }

    // Pick random cell
    const randomIndex = Math.floor(Math.random() * unattackedCells.length);
    const {row, col} = unattackedCells[randomIndex];

    // Process attack
    const result = aiBoard.processAttack(row, col);
    const coord = CoordinateSystem.positionToCoordinate(row, col);

    if (result.result === GameConstants.ATTACK_RESULTS.MISS) {
      addLog(`Random attack ${coord} - MISS`);
      AudioManager.playSFX('miss');
      setPlayerStats(prev => ({...prev, misses: prev.misses + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.HIT) {
      addLog(`Random attack ${coord} - HIT! 🎯`);
      AudioManager.playSFX('hit');
      setPlayerStats(prev => ({...prev, hits: prev.hits + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.KILL) {
      addLog(`Random attack ${coord} - KILL! ✈️💥`);
      AudioManager.playSFX('kill');
      setPlayerStats(prev => ({...prev, hits: prev.hits + 1, kills: prev.kills + 1}));
    }

    setTurnCount(prev => prev + 1);

    // Check if player won
    if (aiBoard.areAllAirplanesDestroyed()) {
      setWinner('Player');
      setPhase('gameover');
      addLog('🎉 YOU WIN! All enemy planes destroyed!');
      AudioManager.playSFX('victory');

      // Update statistics
      console.log('[GameScreen] Player won! Updating statistics...');
      StatisticsService.updateStatistics(true, false).then(success => {
        console.log('[GameScreen] Statistics update result:', success);
      });
      // Save game history with board data
      const historyData = {
        gameType: 'ai',
        opponent: `${difficulty.toUpperCase()} AI`,
        winner: AuthService.getUserId() || 'Player',
        boardSize: boardSize,
        airplaneCount: airplaneCount,
        totalTurns: turnCount + 1,
        completedAt: Date.now(),
        // Board snapshot data
        playerBoardData: playerBoard ? {
          airplanes: playerBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: playerBoard.getAttackHistory(), // AI's attacks on player board
        } : null,
        aiBoardData: aiBoard ? {
          airplanes: aiBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: aiBoard.getAttackHistory(), // Player's attacks on AI board
        } : null,
        playerStats: playerStats,
        aiStats: aiStats,
      };

      StatisticsService.saveGameHistory(historyData).then(success => {
        console.log('[GameScreen] Game history save result (player wins):', success);
        if (success) {
          checkAchievements(historyData);
        }
      });

      return;
    }

    // Switch to AI turn
    setCurrentTurn('ai');
    addLog("AI's turn...");

    // AI attack after delay
    setTimeout(() => {
      performAIAttack();
    }, 800);
  };

  const handleCellPress = (row: number, col: number) => {
    if (phase !== 'battle' || currentTurn !== 'player' || !aiBoard || !playerBoard) {
      return;
    }

    // Check if already attacked
    if (aiBoard.isCellAttacked(row, col)) {
      addLog('Already attacked this cell!');
      return;
    }

    // Stop timer on player action
    stopTurnTimer();

    // Process player attack
    const result = aiBoard.processAttack(row, col);
    const coord = CoordinateSystem.positionToCoordinate(row, col);

    if (result.result === GameConstants.ATTACK_RESULTS.MISS) {
      addLog(`You attacked ${coord} - MISS`);
      AudioManager.playSFX('miss');
      setPlayerStats(prev => ({...prev, misses: prev.misses + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.HIT) {
      addLog(`You attacked ${coord} - HIT! 🎯`);
      AudioManager.playSFX('hit');
      setPlayerStats(prev => ({...prev, hits: prev.hits + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.KILL) {
      addLog(`You attacked ${coord} - KILL! ✈️💥`);
      AudioManager.playSFX('kill');
      setPlayerStats(prev => ({...prev, hits: prev.hits + 1, kills: prev.kills + 1}));
    }

    setTurnCount(prev => prev + 1);

    // Check if player won
    if (aiBoard.areAllAirplanesDestroyed()) {
      setWinner('Player');
      setPhase('gameover');
      addLog('🎉 YOU WIN! All enemy planes destroyed!');
      AudioManager.playSFX('victory');

      // Update statistics
      console.log('[GameScreen] Player won! Updating statistics...');
      StatisticsService.updateStatistics(true, false).then(success => {
        console.log('[GameScreen] Statistics update result:', success);
      });
      // Save game history with board data
      const historyData = {
        gameType: 'ai',
        opponent: `${difficulty.toUpperCase()} AI`,
        winner: AuthService.getUserId() || 'Player',
        boardSize: boardSize,
        airplaneCount: airplaneCount,
        totalTurns: turnCount + 1,
        completedAt: Date.now(),
        // Board snapshot data
        playerBoardData: playerBoard ? {
          airplanes: playerBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: playerBoard.getAttackHistory(), // AI's attacks on player board
        } : null,
        aiBoardData: aiBoard ? {
          airplanes: aiBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: aiBoard.getAttackHistory(), // Player's attacks on AI board
        } : null,
        playerStats: playerStats,
        aiStats: aiStats,
      };

      StatisticsService.saveGameHistory(historyData).then(success => {
        console.log('[GameScreen] Game history save result (player wins):', success);
        if (success) {
          checkAchievements(historyData);
        }
      });

      return;
    }

    // Switch to AI turn
    setCurrentTurn('ai');
    addLog("AI's turn...");

    // AI attack after delay
    setTimeout(() => {
      performAIAttack();
    }, 800);
  };

  const performAIAttack = () => {
    if (!aiStrategy || !playerBoard) return;

    // Stop timer during AI turn
    stopTurnTimer();

    const attack = aiStrategy.getNextAttack(playerBoard);
    if (!attack) {
      addLog('AI has no valid moves!');
      return;
    }

    const result = playerBoard.processAttack(attack.row, attack.col);
    const coord = CoordinateSystem.positionToCoordinate(attack.row, attack.col);

    if (!result) {
      console.error('[GameScreen] processAttack returned null/undefined');
      return;
    }

    if (result.result === GameConstants.ATTACK_RESULTS.MISS) {
      addLog(`AI attacked ${coord} - MISS`);
      AudioManager.playSFX('miss');
      setAiStats(prev => ({...prev, misses: prev.misses + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.HIT) {
      addLog(`AI attacked ${coord} - HIT! ⚠️`);
      AudioManager.playSFX('hit');
      setAiStats(prev => ({...prev, hits: prev.hits + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.KILL) {
      addLog(`AI attacked ${coord} - KILL! 💀`);
      AudioManager.playSFX('kill');
      setAiStats(prev => ({...prev, hits: prev.hits + 1, kills: prev.kills + 1}));
    }

    setTurnCount(prev => prev + 1);

    // Check if AI won
    if (playerBoard.areAllAirplanesDestroyed()) {
      setWinner('AI');
      setPhase('gameover');
      addLog('💀 GAME OVER! AI destroyed all your planes!');
      AudioManager.playSFX('defeat');

      // Update statistics
      console.log('[GameScreen] AI won! Updating statistics...');
      StatisticsService.updateStatistics(false, false).then(success => {
        console.log('[GameScreen] Statistics update result:', success);
      });
      const historyData = {
        gameType: 'ai',
        opponent: `${difficulty.toUpperCase()} AI`,
        winner: 'AI',
        boardSize: boardSize,
        airplaneCount: airplaneCount,
        totalTurns: turnCount + 1,
        completedAt: Date.now(),
        // Board snapshot data
        playerBoardData: playerBoard ? {
          airplanes: playerBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: playerBoard.getAttackHistory(), // AI's attacks on player board
        } : null,
        aiBoardData: aiBoard ? {
          airplanes: aiBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: aiBoard.getAttackHistory(), // Player's attacks on AI board
        } : null,
        playerStats: playerStats,
        aiStats: aiStats,
      };

      StatisticsService.saveGameHistory(historyData).then(success => {
        console.log('[GameScreen] Game history save result (AI wins):', success);
        if (success) {
          checkAchievements(historyData);
        }
      });

      return;
    }

    // Switch back to player
    setCurrentTurn('player');
    addLog("Your turn!");

    // Start timer for player's turn
    startTurnTimer();
  };

  const renderCell = (
    row: number,
    col: number,
    board: BoardManager,
    isPlayerBoard: boolean,
  ) => {
    const isAttacked = board.isCellAttacked(row, col);
    const hasAirplane = board.hasAirplaneAt(row, col);
    const airplane = board.getAirplaneAt(row, col);

    let cellStyle = [styles.cell];
    let cellText = '';

    if (isAttacked) {
      if (hasAirplane && airplane) {
        if (airplane.isDestroyed && airplane.getCellType(row, col) === 'head') {
          cellStyle.push(styles.cellKilled);
          cellText = '✕';
        } else {
          cellStyle.push(styles.cellHit);
          cellText = '⊗';
        }
      } else {
        cellStyle.push(styles.cellMiss);
        cellText = '○';
      }
    } else if (isPlayerBoard && hasAirplane) {
      cellStyle.push(styles.cellAirplane);
      cellText = '✈';
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={cellStyle}
        onPress={() => !isPlayerBoard && handleCellPress(row, col)}
        disabled={isPlayerBoard || phase !== 'battle' || currentTurn !== 'player'}>
        <Text style={styles.cellText}>{cellText}</Text>
      </TouchableOpacity>
    );
  };

  const renderBoard = (board: BoardManager | null, isPlayerBoard: boolean, title: string) => {
    if (!board) return null;

    return (
      <View style={styles.boardContainer}>
        <Text style={styles.boardTitle}>{title}</Text>
        <View style={styles.board}>
          {Array.from({length: boardSize}, (_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({length: boardSize}, (_, col) =>
                renderCell(row, col, board, isPlayerBoard)
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Show deployment phase
  if (phase === 'deployment') {
    return (
      <>
        <StatusBar hidden={false} backgroundColor="#16213e" barStyle="light-content" />
        <DeploymentPhase
          boardSize={boardSize}
          airplaneCount={airplaneCount}
          onDeploymentComplete={handleDeploymentComplete}
          onCancel={() => navigation.goBack()}
        />
      </>
    );
  }

  // Show countdown phase (3-second countdown)
  if (phase === 'countdown') {
    return (
      <>
        <StatusBar hidden={false} backgroundColor="#16213e" barStyle="light-content" />
        <CountdownScreen onComplete={handleCountdownComplete} />
      </>
    );
  }

  // Show battle/gameover phase
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={isFullscreen} backgroundColor="#16213e" barStyle="light-content" />
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        {!isLandscape && (
          <Text style={styles.title}>Headshot: Air Battle</Text>
        )}
        <Text style={[styles.difficulty, isLandscape && styles.difficultyLandscape]}>
          {difficulty.toUpperCase()} AI
        </Text>
        {phase === 'battle' && (
          <>
            <Text style={[styles.turnIndicator, isLandscape && styles.turnIndicatorLandscape]}>
              {currentTurn === 'player' ? '🎯 Your Turn' : '🤖 AI Turn'}
            </Text>
            <View style={[styles.timerContainer, isLandscape && styles.timerContainerLandscape]}>
              {currentTurn === 'player' ? (
                <Text style={[
                  styles.timerText,
                  isLandscape && styles.timerTextLandscape,
                  timeRemaining <= GameConstants.TURN_TIMER.WARNING_THRESHOLD && styles.timerWarning
                ]}>
                  ⏱️ {(timeRemaining / 1000).toFixed(1)}s
                </Text>
              ) : (
                <Text style={[styles.timerText, isLandscape && styles.timerTextLandscape]}>
                  🤔 AI Thinking...
                </Text>
              )}
            </View>
            <View style={[styles.statsRow, isLandscape && styles.statsRowLandscape]}>
              <View style={[styles.statBox, isLandscape && styles.statBoxLandscape]}>
                <Text style={[styles.statLabel, isLandscape && styles.statLabelLandscape]}>Turn</Text>
                <Text style={[styles.statValue, isLandscape && styles.statValueLandscape]}>{turnCount}</Text>
              </View>
              <View style={[styles.statBox, isLandscape && styles.statBoxLandscape]}>
                <Text style={[styles.statLabel, isLandscape && styles.statLabelLandscape]}>Hits</Text>
                <Text style={[styles.statValue, isLandscape && styles.statValueLandscape]}>{playerStats.hits}/{playerStats.hits + playerStats.misses}</Text>
              </View>
              <View style={[styles.statBox, isLandscape && styles.statBoxLandscape]}>
                <Text style={[styles.statLabel, isLandscape && styles.statLabelLandscape]}>Kills</Text>
                <Text style={[styles.statValue, isLandscape && styles.statValueLandscape]}>{playerStats.kills}/{airplaneCount}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.fullscreenButton, isLandscape && styles.fullscreenButtonLandscape]}
              onPress={toggleFullscreen}>
              <Text style={[styles.fullscreenButtonText, isLandscape && styles.fullscreenButtonTextLandscape]}>
                {isFullscreen ? '⛶' : '⛶'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {phase === 'battle' && playerBoard && aiBoard && (
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollContainer}>
          <View style={styles.battleContainer}>
            <DualBoardView
              playerBoard={playerBoard}
              enemyBoard={aiBoard}
              currentTurn={currentTurn}
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
            {winner === 'Player' ? '🎉 YOU WIN!' : '💀 GAME OVER'}
          </Text>
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={resetGame}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.menuButtonText}>Main Menu</Text>
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
    padding: 8,
    paddingVertical: 10,
    backgroundColor: '#16213e',
    alignItems: 'center',
  },
  headerLandscape: {
    padding: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  difficulty: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 3,
  },
  difficultyLandscape: {
    fontSize: 11,
    marginTop: 0,
    marginLeft: 5,
  },
  turnIndicator: {
    fontSize: 16,
    color: '#FFD700',
    marginTop: 6,
    fontWeight: 'bold',
  },
  turnIndicatorLandscape: {
    fontSize: 12,
    marginTop: 0,
    marginLeft: 5,
  },
  timerContainer: {
    marginTop: 5,
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  timerContainerLandscape: {
    marginTop: 0,
    marginLeft: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timerText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  timerTextLandscape: {
    fontSize: 11,
  },
  timerWarning: {
    color: '#FF5722',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
    width: '100%',
  },
  statsRowLandscape: {
    marginTop: 0,
    marginLeft: 'auto',
    width: 'auto',
    gap: 5,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 5,
    minWidth: 80,
  },
  statBoxLandscape: {
    padding: 3,
    minWidth: 50,
  },
  statLabel: {
    fontSize: 10,
    color: '#aaa',
    marginBottom: 3,
  },
  statLabelLandscape: {
    fontSize: 8,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statValueLandscape: {
    fontSize: 10,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 5,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenButtonLandscape: {
    top: 4,
    right: 4,
    padding: 4,
    width: 28,
    height: 28,
  },
  fullscreenButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  fullscreenButtonTextLandscape: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
  },
  boardContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  boardTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  board: {
    backgroundColor: '#0f3460',
    padding: 2,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 30,
    height: 30,
    margin: 1,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  cellAirplane: {
    backgroundColor: '#4CAF50',
  },
  cellMiss: {
    backgroundColor: '#546e7a',
  },
  cellHit: {
    backgroundColor: '#FF9800',
  },
  cellKilled: {
    backgroundColor: '#F44336',
  },
  cellText: {
    color: '#fff',
    fontSize: 16,
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
  gameoverContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 10,
    alignItems: 'center',
  },
  gameoverText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: '#546e7a',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
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
