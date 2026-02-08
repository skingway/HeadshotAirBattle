/**
 * Game History Screen
 * Displays last 10 games played
 */

import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Pressable,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import StatisticsService from '../services/StatisticsService';
import AuthService from '../services/AuthService';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  GameHistory: undefined;
  BattleReport: {gameId: string; gameData: any};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GameHistory'>;
};

function StaggeredItem({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 250,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateX: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
        ],
      }}>
      {children}
    </Animated.View>
  );
}

export default function GameHistoryScreen({navigation}: Props) {
  const [games, setGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'result'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses'>('all');
  const currentUserId = AuthService.getUserId();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadHistory();
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
    ]).start();
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

    if (filterBy === 'wins') {
      filtered = games.filter(game => game.winner === currentUserId);
    } else if (filterBy === 'losses') {
      filtered = games.filter(game => game.winner !== currentUserId);
    }

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

    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes}m ago`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }
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
        <Text style={styles.title}>GAME HISTORY</Text>
        <Text style={styles.subtitle}>Last 10 Games</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>FILTER</Text>
          <View style={styles.buttonGroup}>
            {(['all', 'wins', 'losses'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.controlButton, filterBy === f && styles.activeControl]}
                onPress={() => setFilterBy(f)}>
                <Text style={[styles.controlButtonText, filterBy === f && styles.activeControlText]}>
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>SORT</Text>
          <View style={styles.buttonGroup}>
            {(['date', 'result'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.controlButton, sortBy === s && styles.activeControl]}
                onPress={() => setSortBy(s)}>
                <Text style={[styles.controlButtonText, sortBy === s && styles.activeControlText]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
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
            tintColor={colors.accent}
          />
        }>
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </View>
          ) : filteredGames.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>{'\uD83C\uDFAE'}</Text>
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
                  <StaggeredItem key={game.id || `game_${index}`} index={index}>
                    <TouchableOpacity
                      style={[
                        styles.gameCard,
                        won ? styles.winCard : styles.lossCard,
                      ]}
                      onPress={() => viewBattleReport(game)}>
                      <View style={styles.gameInfo}>
                        <View style={styles.gameHeader}>
                          <Text style={styles.opponentText}>
                            vs {getOpponentName(game)}
                          </Text>
                          <Text style={styles.dateText}>{formatDate(game.completedAt)}</Text>
                        </View>

                        <View style={styles.gameDetails}>
                          <Text style={styles.detailText}>
                            {game.boardSize}x{game.boardSize} | {game.airplaneCount} planes | {game.totalTurns} turns
                          </Text>
                        </View>
                      </View>

                      <View style={won ? styles.tagWin : styles.tagLoss}>
                        <Text style={won ? styles.tagWinText : styles.tagLossText}>
                          {won ? 'WIN' : 'LOSS'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </StaggeredItem>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Back Button */}
      <Pressable
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>BACK</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.accentBorder,
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
  },
  controls: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  controlSection: {
    marginBottom: 10,
  },
  controlLabel: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 2,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeControl: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  controlButtonText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  activeControlText: {
    color: colors.accent,
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
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 16,
    color: colors.textMuted,
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
    fontFamily: fonts.orbitronBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  winCard: {
    borderLeftColor: colors.success,
  },
  lossCard: {
    borderLeftColor: colors.danger,
  },
  gameInfo: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  opponentText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
  gameDetails: {
    flexDirection: 'row',
  },
  detailText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
  tagWin: {
    backgroundColor: colors.successDim,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  tagWinText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 11,
    color: colors.success,
  },
  tagLoss: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  tagLossText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 11,
    color: colors.danger,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textSecondary,
    fontSize: 14,
    letterSpacing: 2,
  },
});
