/**
 * Battle Report Screen
 * Displays detailed battle report for a game
 */

import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import AuthService from '../services/AuthService';
import BattleBoardDisplay from '../components/BattleBoardDisplay';
import {AchievementService} from '../services/AchievementService';

type RootStackParamList = {
  MainMenu: undefined;
  GameHistory: undefined;
  BattleReport: {gameId: string; gameData: any};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BattleReport'>;
  route: RouteProp<RootStackParamList, 'BattleReport'>;
};

export default function BattleReportScreen({navigation, route}: Props) {
  const {gameData} = route.params;
  const currentUserId = AuthService.getUserId();
  const isWinner = currentUserId && gameData.winner === currentUserId;

  // Unlock "analyst" achievement when viewing battle report
  useEffect(() => {
    const unlockAnalystAchievement = async () => {
      try {
        await AchievementService.manuallyUnlock('analyst');
        console.log('[BattleReportScreen] Checked analyst achievement');
      } catch (error) {
        console.error('[BattleReportScreen] Error unlocking analyst achievement:', error);
      }
    };

    unlockAnalystAchievement();
  }, []);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getOpponentName = (): string => {
    if (gameData.gameType === 'ai') {
      return 'AI';
    }
    return gameData.opponent || 'Unknown';
  };

  const getGameDuration = (): string => {
    // Estimate: ~30 seconds per turn
    const estimatedSeconds = gameData.totalTurns * 30;
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    return `~${minutes}m ${seconds}s`;
  };

  const getAccuracyEstimate = (): string => {
    // For AI games, estimate based on turns
    // Rough estimate: boardSize * boardSize is total possible shots
    const totalCells = gameData.boardSize * gameData.boardSize;
    const efficiency = ((gameData.airplaneCount * 12) / gameData.totalTurns) * 100;
    return efficiency.toFixed(1) + '%';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isWinner ? styles.winHeader : styles.lossHeader]}>
        <Text style={styles.resultEmoji}>{isWinner ? '🎉' : '😔'}</Text>
        <Text style={styles.resultTitle}>{isWinner ? 'VICTORY!' : 'DEFEAT'}</Text>
        <Text style={styles.resultSubtitle}>
          vs {getOpponentName()}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Battle Boards */}
        {(gameData.playerBoardData || gameData.aiBoardData) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Battle Overview</Text>
            <View style={styles.boardsContainer}>
              {gameData.playerBoardData && (
                <BattleBoardDisplay
                  boardSize={gameData.boardSize}
                  boardData={gameData.playerBoardData}
                  title="Your Board"
                  cellSize={20}
                />
              )}
              {gameData.aiBoardData && (
                <BattleBoardDisplay
                  boardSize={gameData.boardSize}
                  boardData={gameData.aiBoardData}
                  title="Opponent's Board"
                  cellSize={20}
                />
              )}
            </View>
          </View>
        )}

        {/* Game Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Game Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Result</Text>
              <Text style={[styles.summaryValue, isWinner ? styles.winText : styles.lossText]}>
                {isWinner ? 'WIN' : 'LOSS'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Turns</Text>
              <Text style={styles.summaryValue}>{gameData.totalTurns}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{getGameDuration()}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Efficiency</Text>
              <Text style={styles.summaryValue}>{getAccuracyEstimate()}</Text>
            </View>
          </View>
        </View>

        {/* Game Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Game Configuration</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Game Type:</Text>
              <Text style={styles.infoValue}>
                {gameData.gameType === 'ai' ? '🤖 vs AI' : '🌐 Online'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Board Size:</Text>
              <Text style={styles.infoValue}>
                {gameData.boardSize}×{gameData.boardSize}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Airplanes:</Text>
              <Text style={styles.infoValue}>{gameData.airplaneCount} per player</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Completed:</Text>
              <Text style={styles.infoValue}>{formatDate(gameData.completedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Players */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Players</Text>
          <View style={styles.playersContainer}>
            {/* Player 1 (You) */}
            <View style={[styles.playerCard, isWinner && styles.winnerCard]}>
              <Text style={styles.playerLabel}>You</Text>
              <Text style={styles.playerName}>
                {AuthService.getUserProfile()?.nickname || 'Unknown'}
              </Text>
              {isWinner && <Text style={styles.winnerBadge}>🏆 Winner</Text>}
            </View>

            <View style={styles.vsText}>
              <Text style={styles.vsLabel}>VS</Text>
            </View>

            {/* Player 2 (Opponent) */}
            <View style={[styles.playerCard, !isWinner && styles.winnerCard]}>
              <Text style={styles.playerLabel}>Opponent</Text>
              <Text style={styles.playerName}>{getOpponentName()}</Text>
              {!isWinner && <Text style={styles.winnerBadge}>🏆 Winner</Text>}
            </View>
          </View>
        </View>

        {/* Statistics (if available) */}
        {gameData.playerStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Battle Statistics</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statColumn}>
                <Text style={styles.statColumnTitle}>You</Text>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Hits</Text>
                  <Text style={styles.statValue}>{gameData.playerStats?.hits || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Misses</Text>
                  <Text style={styles.statValue}>{gameData.playerStats?.misses || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Kills</Text>
                  <Text style={styles.statValue}>{gameData.playerStats?.kills || 0}</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statColumn}>
                <Text style={styles.statColumnTitle}>Opponent</Text>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Hits</Text>
                  <Text style={styles.statValue}>{gameData.aiStats?.hits || '?'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Misses</Text>
                  <Text style={styles.statValue}>{gameData.aiStats?.misses || '?'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Kills</Text>
                  <Text style={styles.statValue}>{gameData.aiStats?.kills || '?'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Note about replay */}
        <View style={styles.noteSection}>
          <Text style={styles.noteEmoji}>💡</Text>
          <Text style={styles.noteText}>
            Full battle replay feature coming soon! This will allow you to review each turn
            and see exactly how the battle unfolded.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>← Back to History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.mainMenuButton]}
          onPress={() => navigation.navigate('MainMenu')}>
          <Text style={styles.buttonText}>🏠 Main Menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 3,
  },
  winHeader: {
    backgroundColor: '#1a4d2e',
    borderBottomColor: '#4CAF50',
  },
  lossHeader: {
    backgroundColor: '#4d1a1a',
    borderBottomColor: '#F44336',
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#ddd',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  boardsContainer: {
    gap: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  winText: {
    color: '#4CAF50',
  },
  lossText: {
    color: '#F44336',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  playersContainer: {
    gap: 15,
  },
  playerCard: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  winnerCard: {
    borderColor: '#FFD700',
    backgroundColor: '#1a4d2e',
  },
  playerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  winnerBadge: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 8,
  },
  vsText: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  vsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statColumn: {
    flex: 1,
  },
  statColumnTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
    textAlign: 'center',
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#0f3460',
    borderRadius: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  statDivider: {
    width: 2,
    backgroundColor: '#0f3460',
    marginHorizontal: 15,
  },
  noteSection: {
    backgroundColor: '#2c2c3e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  noteEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#607D8B',
  },
  mainMenuButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
