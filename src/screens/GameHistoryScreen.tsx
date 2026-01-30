/**
 * Game History Screen
 * Displays last 10 games played
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import StatisticsService from '../services/StatisticsService';
import AuthService from '../services/AuthService';

type RootStackParamList = {
  MainMenu: undefined;
  GameHistory: undefined;
  BattleReport: {gameId: string; gameData: any};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GameHistory'>;
};

export default function GameHistoryScreen({navigation}: Props) {
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'result'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses'>('all');
  const currentUserId = AuthService.getUserId();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = await StatisticsService.getGameHistory();
      setGames(history);
    } catch (error) {
      console.error('[GameHistoryScreen] Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getFilteredAndSortedGames = () => {
    let filtered = games;

    // Filter
    if (filterBy === 'wins') {
      filtered = games.filter(game => game.winner === currentUserId);
    } else if (filterBy === 'losses') {
      filtered = games.filter(game => game.winner !== currentUserId);
    }

    // Sort
    if (sortBy === 'result') {
      filtered = [...filtered].sort((a, b) => {
        const aWon = a.winner === currentUserId ? 1 : 0;
        const bWon = b.winner === currentUserId ? 1 : 0;
        return bWon - aWon;
      });
    }

    return filtered;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m ago`;
    }

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }

    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }

    // Full date
    return date.toLocaleDateString();
  };

  const getOpponentName = (game: any): string => {
    if (game.gameType === 'ai') {
      return 'AI';
    }
    return game.opponent || 'Unknown';
  };

  const isWinner = (game: any): boolean => {
    return game.winner === currentUserId;
  };

  const viewBattleReport = (game: any) => {
    navigation.navigate('BattleReport', {
      gameId: game.id || `game_${game.completedAt}`,
      gameData: game,
    });
  };

  const filteredGames = getFilteredAndSortedGames();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📜 Game History</Text>
        <Text style={styles.subtitle}>Last 10 Games</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Filter */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Filter:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.controlButton, filterBy === 'all' && styles.activeControl]}
              onPress={() => setFilterBy('all')}>
              <Text style={[styles.controlButtonText, filterBy === 'all' && styles.activeControlText]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, filterBy === 'wins' && styles.activeControl]}
              onPress={() => setFilterBy('wins')}>
              <Text style={[styles.controlButtonText, filterBy === 'wins' && styles.activeControlText]}>
                Wins
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, filterBy === 'losses' && styles.activeControl]}
              onPress={() => setFilterBy('losses')}>
              <Text style={[styles.controlButtonText, filterBy === 'losses' && styles.activeControlText]}>
                Losses
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sort */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Sort:</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.controlButton, sortBy === 'date' && styles.activeControl]}
              onPress={() => setSortBy('date')}>
              <Text style={[styles.controlButtonText, sortBy === 'date' && styles.activeControlText]}>
                Date
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, sortBy === 'result' && styles.activeControl]}
              onPress={() => setSortBy('result')}>
              <Text style={[styles.controlButtonText, sortBy === 'result' && styles.activeControlText]}>
                Result
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4CAF50"
          />
        }>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyText}>
              {filterBy !== 'all'
                ? `No ${filterBy} found`
                : 'No games played yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              Play some games to see your history here!
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredGames.map((game, index) => {
              const won = isWinner(game);
              return (
                <TouchableOpacity
                  key={game.id || `game_${index}`}
                  style={[
                    styles.gameCard,
                    won ? styles.winCard : styles.lossCard,
                  ]}
                  onPress={() => viewBattleReport(game)}>
                  {/* Result Badge */}
                  <View style={[styles.resultBadge, won ? styles.winBadge : styles.lossBadge]}>
                    <Text style={styles.resultText}>{won ? 'WIN' : 'LOSS'}</Text>
                  </View>

                  {/* Game Info */}
                  <View style={styles.gameInfo}>
                    <View style={styles.gameHeader}>
                      <Text style={styles.opponentText}>
                        vs {getOpponentName(game)}
                      </Text>
                      <Text style={styles.dateText}>{formatDate(game.completedAt)}</Text>
                    </View>

                    <View style={styles.gameDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Type:</Text>
                        <Text style={styles.detailValue}>
                          {game.gameType === 'ai' ? '🤖 AI' : '🌐 Online'}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Board:</Text>
                        <Text style={styles.detailValue}>
                          {game.boardSize}×{game.boardSize}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Planes:</Text>
                        <Text style={styles.detailValue}>{game.airplaneCount}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Turns:</Text>
                        <Text style={styles.detailValue}>{game.totalTurns}</Text>
                      </View>
                    </View>
                  </View>

                  {/* View Report Arrow */}
                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrowText}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
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
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  controls: {
    backgroundColor: '#16213e',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  controlSection: {
    marginBottom: 10,
  },
  controlLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0f3460',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeControl: {
    backgroundColor: '#1a4d2e',
    borderColor: '#4CAF50',
  },
  controlButtonText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  activeControlText: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
  },
  winCard: {
    borderLeftColor: '#4CAF50',
  },
  lossCard: {
    borderLeftColor: '#F44336',
  },
  resultBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  winBadge: {
    backgroundColor: '#1a4d2e',
  },
  lossBadge: {
    backgroundColor: '#4d1a1a',
  },
  resultText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  gameInfo: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  opponentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  gameDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  arrowContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#607D8B',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
