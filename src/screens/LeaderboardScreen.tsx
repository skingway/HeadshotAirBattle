/**
 * Leaderboard Screen
 * Displays global rankings by win rate, total wins, and total games
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
import FirebaseService from '../services/FirebaseService';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  Leaderboard: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Leaderboard'>;
};

type LeaderboardType = 'winRate' | 'wins' | 'totalGames';

export default function LeaderboardScreen({navigation}: Props) {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('winRate');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRank, setUserRank] = useState<number>(-1);
  const [isOffline, setIsOffline] = useState(false);
  const currentUserId = AuthService.getUserId();

  useEffect(() => {
    loadLeaderboard();
  }, [leaderboardType]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    setIsOffline(FirebaseService.isOffline());

    if (FirebaseService.isOffline()) {
      setIsLoading(false);
      setLeaderboardData([]);
      return;
    }

    try {
      const data = await StatisticsService.getLeaderboard(leaderboardType);
      setLeaderboardData(data);

      // Get user's rank
      const rank = await StatisticsService.getUserRank(leaderboardType);
      setUserRank(rank);
    } catch (error) {
      console.error('[LeaderboardScreen] Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getTypeLabel = (type: LeaderboardType): string => {
    switch (type) {
      case 'winRate':
        return 'Win Rate';
      case 'wins':
        return 'Total Wins';
      case 'totalGames':
        return 'Total Games';
      default:
        return '';
    }
  };

  const getTypeValue = (player: any, type: LeaderboardType): string => {
    switch (type) {
      case 'winRate':
        return `${player.winRate.toFixed(1)}%`;
      case 'wins':
        return player.wins.toString();
      case 'totalGames':
        return player.totalGames.toString();
      default:
        return '';
    }
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return colors.gold;
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.textPrimary;
  };

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARD</Text>
        {!isOffline && userRank > 0 && (
          <Text style={styles.userRank}>Your Rank: #{userRank}</Text>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, leaderboardType === 'winRate' && styles.activeTab]}
          onPress={() => setLeaderboardType('winRate')}>
          <Text style={[styles.tabText, leaderboardType === 'winRate' && styles.activeTabText]}>
            Win Rate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, leaderboardType === 'wins' && styles.activeTab]}
          onPress={() => setLeaderboardType('wins')}>
          <Text style={[styles.tabText, leaderboardType === 'wins' && styles.activeTabText]}>
            Total Wins
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, leaderboardType === 'totalGames' && styles.activeTab]}
          onPress={() => setLeaderboardType('totalGames')}>
          <Text style={[styles.tabText, leaderboardType === 'totalGames' && styles.activeTabText]}>
            Total Games
          </Text>
        </TouchableOpacity>
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : isOffline ? (
          <View style={styles.offlineContainer}>
            <Text style={styles.offlineEmoji}>📡</Text>
            <Text style={styles.offlineTitle}>Leaderboard Unavailable</Text>
            <Text style={styles.offlineText}>
              Leaderboard requires an internet connection.
            </Text>
            <Text style={styles.offlineText}>
              Please check your network and try again.
            </Text>
          </View>
        ) : leaderboardData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎮</Text>
            <Text style={styles.emptyText}>No data available yet</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.rankCell]}>Rank</Text>
              <Text style={[styles.headerCell, styles.playerCell]}>Player</Text>
              <Text style={[styles.headerCell, styles.statsCell]}>W/L</Text>
              <Text style={[styles.headerCell, styles.valueCell]}>{getTypeLabel(leaderboardType)}</Text>
            </View>

            {/* Player Rows */}
            {leaderboardData.map((player, index) => {
              const isCurrentUser = player.userId === currentUserId;
              return (
                <View
                  key={player.userId}
                  style={[
                    styles.playerRow,
                    isCurrentUser && styles.currentUserRow,
                  ]}>
                  <View style={styles.rankCell}>
                    <Text style={[styles.rankText, {color: getRankColor(player.rank)}]}>
                      {getRankEmoji(player.rank)} #{player.rank}
                    </Text>
                  </View>
                  <View style={styles.playerCell}>
                    <Text style={[styles.nicknameText, isCurrentUser && styles.currentUserText]}>
                      {player.nickname}
                      {isCurrentUser && ' (You)'}
                    </Text>
                  </View>
                  <View style={styles.statsCell}>
                    <Text style={styles.wlText}>
                      {player.wins}/{player.losses}
                    </Text>
                  </View>
                  <View style={styles.valueCell}>
                    <Text style={[styles.valueText, isCurrentUser && styles.currentUserText]}>
                      {getTypeValue(player, leaderboardType)}
                    </Text>
                  </View>
                </View>
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
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 3,
    marginBottom: 8,
  },
  userRank: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  tabText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  activeTabText: {
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
    fontFamily: fonts.rajdhaniRegular,
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  offlineEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  offlineTitle: {
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  offlineText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 5,
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
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 16,
    color: colors.textMuted,
  },
  listContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  headerCell: {
    fontFamily: fonts.orbitronBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 30, 60, 0.3)',
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  currentUserRow: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rankCell: {
    width: 70,
  },
  playerCell: {
    flex: 1,
  },
  statsCell: {
    width: 60,
  },
  valueCell: {
    width: 80,
    alignItems: 'flex-end',
  },
  rankText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 13,
  },
  nicknameText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  currentUserText: {
    color: colors.accent,
  },
  wlText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
  valueText: {
    fontFamily: fonts.orbitronExtraBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 2,
  },
});
