import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
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
import AdService from '../services/AdService';
import BombDropAnimation, {BombDropAnimationRef} from '../components/BombDropAnimation';
import {useOrientation} from '../hooks/useOrientation';
import {colors, fonts} from '../theme/colors';

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
  const gameStartedAtRef = useRef<number>(Date.now());

  // Screen orientation
  const orientation = useOrientation();
  const isLandscape = orientation === 'landscape';

  // Bomb animation
  const bombRef = useRef<BombDropAnimationRef>(null);
  const shakeOffset = useRef(new Animated.Value(0)).current;

  // 防止快速点击导致同一回合多次攻击
  const isProcessingAttackRef = useRef(false);

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
    gameStartedAtRef.current = Date.now();
    addLog("Battle started! It's your turn!");
    addLog("Tap on enemy board to attack.");
    // Start background music for battle
    AudioManager.playBGM();
    // Start timer for first turn
    startTurnTimer();
  };

  const resetGame = () => {
    stopTurnTimer();
    AudioManager.stopBGM();
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
            AudioManager.stopBGM();
            setWinner('AI');
            setPhase('gameover');
            addLog('🏳️ You surrendered!');
            AudioManager.playSFX('defeat');
            showGameOverAd();

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
              startedAt: gameStartedAtRef.current,
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

  // Show interstitial ad after game ends (with delay)
  const showGameOverAd = () => {
    AdService.incrementGameCount();
    setTimeout(async () => {
      await AdService.showInterstitialIfReady();
    }, 1500);
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
    if (isProcessingAttackRef.current) return;

    stopTurnTimer();

    if (currentTurn === 'player') {
      // Player timeout: make random attack
      isProcessingAttackRef.current = true;
      addLog('⏱️ Time out! Random attack...');
      performRandomPlayerAttack();
    } else {
      // AI timeout: execute AI turn
      performAIAttack();
    }
  };

  // Estimate target screen position from row/col
  const getTargetPosition = (row: number, col: number) => {
    const screenWidth = Dimensions.get('window').width;
    const enemyBoardWidth = Math.min(screenWidth - 40, 380);
    const cellSize = Math.floor((enemyBoardWidth - boardSize * 2) / boardSize);
    const boardLeft = (screenWidth - enemyBoardWidth) / 2 + 20 + 5; // padding + board padding
    const boardTop = 180; // approximate header + board title offset
    const targetX = boardLeft + col * (cellSize + 2) + cellSize / 2;
    const targetY = boardTop + row * (cellSize + 2) + cellSize / 2;
    return {targetX, targetY};
  };

  // Map attack result to animation result type
  const getAnimResultType = (attackResult: string): 'miss' | 'hit' | 'kill' => {
    if (attackResult === GameConstants.ATTACK_RESULTS.KILL) return 'kill';
    if (attackResult === GameConstants.ATTACK_RESULTS.HIT) return 'hit';
    return 'miss';
  };

  // Process post-attack logic (SFX, stats, win check, turn switch)
  const processPostAttack = (
    result: any,
    coord: string,
    isRandom: boolean,
    board: BoardManager,
  ) => {
    const prefix = isRandom ? 'Random attack' : 'You attacked';

    if (result.result === GameConstants.ATTACK_RESULTS.MISS) {
      addLog(`${prefix} ${coord} - MISS`);
      AudioManager.playSFX('miss');
      setPlayerStats(prev => ({...prev, misses: prev.misses + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.HIT) {
      addLog(`${prefix} ${coord} - HIT! 🎯`);
      AudioManager.playSFX('hit');
      setPlayerStats(prev => ({...prev, hits: prev.hits + 1}));
    } else if (result.result === GameConstants.ATTACK_RESULTS.KILL) {
      addLog(`${prefix} ${coord} - KILL! ✈️💥`);
      AudioManager.playSFX('kill');
      setPlayerStats(prev => ({...prev, hits: prev.hits + 1, kills: prev.kills + 1}));
    }

    setTurnCount(prev => prev + 1);

    // Check if player won
    if (board.areAllAirplanesDestroyed()) {
      isProcessingAttackRef.current = false;
      setWinner('Player');
      setPhase('gameover');
      addLog('🎉 YOU WIN! All enemy planes destroyed!');
      AudioManager.stopBGM();
      AudioManager.playSFX('victory');
      showGameOverAd();

      const finalPlayerStats = {
        hits: playerStats.hits + (result.result !== GameConstants.ATTACK_RESULTS.MISS ? 1 : 0),
        misses: playerStats.misses + (result.result === GameConstants.ATTACK_RESULTS.MISS ? 1 : 0),
        kills: playerStats.kills + (result.result === GameConstants.ATTACK_RESULTS.KILL ? 1 : 0),
      };

      console.log('[GameScreen] Player won! Updating statistics...');
      StatisticsService.updateStatistics(true, false).then(success => {
        console.log('[GameScreen] Statistics update result:', success);
      });
      const historyData = {
        gameType: 'ai',
        opponent: `${difficulty.toUpperCase()} AI`,
        winner: AuthService.getUserId() || 'Player',
        boardSize: boardSize,
        airplaneCount: airplaneCount,
        totalTurns: turnCount + 1,
        completedAt: Date.now(),
        startedAt: gameStartedAtRef.current,
        playerBoardData: playerBoard ? {
          airplanes: playerBoard.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: playerBoard.getAttackHistory(),
        } : null,
        aiBoardData: board ? {
          airplanes: board.airplanes.map(a => ({
            id: a.id,
            headRow: a.headRow,
            headCol: a.headCol,
            direction: a.direction,
          })),
          attacks: board.getAttackHistory(),
        } : null,
        playerStats: finalPlayerStats,
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

    setTimeout(() => {
      performAIAttack();
    }, 800);
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

    // Process attack first to get result
    const result = aiBoard.processAttack(row, col);
    const coord = CoordinateSystem.positionToCoordinate(row, col);
    const {targetX, targetY} = getTargetPosition(row, col);
    const animType = getAnimResultType(result.result);

    if (bombRef.current) {
      bombRef.current.playAttack(targetX, targetY, animType, () => {
        processPostAttack(result, coord, true, aiBoard);
      }, (dx: number) => {
        shakeOffset.setValue(dx);
      });
    } else {
      processPostAttack(result, coord, true, aiBoard);
    }
  };

  const handleCellPress = (row: number, col: number, pageX?: number, pageY?: number) => {
    if (phase !== 'battle' || currentTurn !== 'player' || !aiBoard || !playerBoard) {
      return;
    }

    // 防止快速点击同一回合多次攻击
    if (isProcessingAttackRef.current) {
      return;
    }

    // Check if already attacked
    if (aiBoard.isCellAttacked(row, col)) {
      addLog('Already attacked this cell!');
      return;
    }

    isProcessingAttackRef.current = true;

    // Stop timer on player action
    stopTurnTimer();

    // Process player attack first to get the result
    const result = aiBoard.processAttack(row, col);
    const coord = CoordinateSystem.positionToCoordinate(row, col);
    // Use actual touch coordinates if available, otherwise estimate
    const fallback = getTargetPosition(row, col);
    const targetX = pageX ?? fallback.targetX;
    const targetY = pageY ?? fallback.targetY;
    const animType = getAnimResultType(result.result);

    // Play bomb drop animation, then do post-attack in onComplete
    if (bombRef.current) {
      bombRef.current.playAttack(targetX, targetY, animType, () => {
        processPostAttack(result, coord, false, aiBoard);
      }, (dx: number) => {
        shakeOffset.setValue(dx);
      });
    } else {
      processPostAttack(result, coord, false, aiBoard);
    }
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
      isProcessingAttackRef.current = false;
      setWinner('AI');
      setPhase('gameover');
      addLog('💀 GAME OVER! AI destroyed all your planes!');
      AudioManager.stopBGM();
      AudioManager.playSFX('defeat');
      showGameOverAd();

      // Compute final AI stats including this last attack
      const finalAiStats = {
        hits: aiStats.hits + (result.result !== GameConstants.ATTACK_RESULTS.MISS ? 1 : 0),
        misses: aiStats.misses + (result.result === GameConstants.ATTACK_RESULTS.MISS ? 1 : 0),
        kills: aiStats.kills + (result.result === GameConstants.ATTACK_RESULTS.KILL ? 1 : 0),
      };

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
        startedAt: gameStartedAtRef.current,
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
        aiStats: finalAiStats,
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
    isProcessingAttackRef.current = false;
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
        <StatusBar hidden={false} backgroundColor={colors.bgPrimary} barStyle="light-content" />
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
        <StatusBar hidden={false} backgroundColor={colors.bgPrimary} barStyle="light-content" />
        <CountdownScreen onComplete={handleCountdownComplete} />
      </>
    );
  }

  // Show battle/gameover phase
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={isFullscreen} backgroundColor={colors.bgPrimary} barStyle="light-content" />
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
          <Animated.View style={[styles.battleContainer, {transform: [{translateX: shakeOffset}]}]}>
            <DualBoardView
              playerBoard={playerBoard}
              enemyBoard={aiBoard}
              currentTurn={currentTurn}
              onCellPress={handleCellPress}
              showEnemyAirplanes={false}
            />
          </Animated.View>

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

      <BombDropAnimation ref={bombRef} />

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
    backgroundColor: colors.bgPrimary,
  },
  header: {
    padding: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  headerLandscape: {
    padding: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  difficulty: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.accent,
    marginTop: 3,
  },
  difficultyLandscape: {
    fontSize: 11,
    marginTop: 0,
    marginLeft: 5,
  },
  turnIndicator: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 14,
    color: colors.gold,
    marginTop: 6,
    letterSpacing: 1,
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
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  timerContainerLandscape: {
    marginTop: 0,
    marginLeft: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timerText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 16,
    color: colors.accent,
  },
  timerTextLandscape: {
    fontSize: 11,
  },
  timerWarning: {
    color: colors.danger,
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
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.12)',
  },
  statBoxLandscape: {
    padding: 3,
    minWidth: 50,
  },
  statLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 3,
  },
  statLabelLandscape: {
    fontSize: 8,
    marginBottom: 1,
  },
  statValue: {
    fontFamily: fonts.orbitronBold,
    fontSize: 13,
    color: colors.accent,
  },
  statValueLandscape: {
    fontSize: 10,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 8,
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
    color: colors.textPrimary,
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
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  board: {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
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
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  cellAirplane: {
    backgroundColor: 'rgba(0, 212, 255, 0.25)',
  },
  cellMiss: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cellHit: {
    backgroundColor: 'rgba(255, 152, 0, 0.6)',
  },
  cellKilled: {
    backgroundColor: 'rgba(255, 40, 40, 0.7)',
  },
  cellText: {
    color: colors.textPrimary,
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
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    padding: 10,
    margin: 10,
    borderRadius: 12,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  logScroll: {
    maxHeight: 80,
  },
  logTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.gold,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  logText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  gameoverContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  gameoverText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 20,
    letterSpacing: 2,
  },
  playAgainButton: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  playAgainText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textPrimary,
    fontSize: 14,
    letterSpacing: 2,
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  menuButtonText: {
    fontFamily: fonts.rajdhaniSemiBold,
    color: colors.textSecondary,
    fontSize: 16,
  },
  surrenderButton: {
    backgroundColor: colors.dangerDim,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 10,
    marginTop: 20,
    marginBottom: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  surrenderButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.danger,
    fontSize: 13,
    letterSpacing: 1,
  },
});
