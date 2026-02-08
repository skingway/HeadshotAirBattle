/**
 * Battle Report Screen
 * Displays detailed battle report for a game
 */

import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import AuthService from '../services/AuthService';
import BattleBoardDisplay from '../components/BattleBoardDisplay';
import {AchievementService} from '../services/AchievementService';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  GameHistory: undefined;
  BattleReport: {gameId: string; gameData: any};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BattleReport'>;
  route: RouteProp<RootStackParamList, 'BattleReport'>;
};

function AnimatedButton({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        Animated.spring(scaleAnim, {toValue: 0.97, useNativeDriver: true}).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true}).start();
      }}
      onPress={onPress}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function BattleReportScreen({navigation, route}: Props) {
  const {gameData} = route.params;
  const currentUserId = AuthService.getUserId();
  const isWinner = currentUserId && gameData.winner === currentUserId;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const unlockAnalystAchievement = async () => {
      try {
        await AchievementService.manuallyUnlock('analyst');
      } catch (error) {
        console.error('[BattleReportScreen] Error unlocking analyst achievement:', error);
      }
    };
    unlockAnalystAchievement();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
    ]).start();
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
    const estimatedSeconds = gameData.totalTurns * 30;
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    return `~${minutes}m ${seconds}s`;
  };

  const getAccuracyEstimate = (): string => {
    const efficiency = ((gameData.airplaneCount * 12) / gameData.totalTurns) * 100;
    return efficiency.toFixed(1) + '%';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isWinner ? styles.winHeader : styles.lossHeader]}>
        <Animated.Text
          style={[
            styles.resultEmoji,
            {transform: [{translateY: floatAnim}]},
            isWinner ? styles.winEmojiShadow : styles.lossEmojiShadow,
          ]}>
          {isWinner ? '\uD83C\uDFC6' : '\uD83D\uDC80'}
        </Animated.Text>
        <Text style={[styles.resultTitle, isWinner ? styles.winTitleColor : styles.lossTitleColor]}>
          {isWinner ? 'VICTORY' : 'DEFEAT'}
        </Text>
        <Text style={styles.resultSubtitle}>vs {getOpponentName()}</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
          {/* Info Tags */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{gameData.boardSize}x{gameData.boardSize}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{gameData.airplaneCount} ships</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{gameData.totalTurns} turns</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{gameData.gameType === 'ai' ? 'vs AI' : 'Online'}</Text>
            </View>
          </View>

          {/* Score Cards */}
          <View style={styles.playersContainer}>
            <View style={[isWinner ? styles.cardHighlight : styles.card]}>
              {isWinner && <Text style={styles.crownIcon}>{'\uD83D\uDC51'}</Text>}
              <Text style={styles.playerLabel}>YOU</Text>
              <Text style={[styles.playerName, {fontFamily: fonts.orbitronBold}]}>
                {AuthService.getUserProfile()?.nickname || 'Unknown'}
              </Text>
              {isWinner ? (
                <View style={styles.tagWin}>
                  <Text style={styles.tagWinText}>WIN</Text>
                </View>
              ) : (
                <View style={styles.tagLoss}>
                  <Text style={styles.tagLossText}>LOSS</Text>
                </View>
              )}
            </View>

            <Text style={styles.vsLabel}>VS</Text>

            <View style={[!isWinner ? styles.cardHighlight : styles.card]}>
              {!isWinner && <Text style={styles.crownIcon}>{'\uD83D\uDC51'}</Text>}
              <Text style={styles.playerLabel}>OPPONENT</Text>
              <Text style={[styles.playerName, {fontFamily: fonts.orbitronBold}]}>
                {getOpponentName()}
              </Text>
              {!isWinner ? (
                <View style={styles.tagWin}>
                  <Text style={styles.tagWinText}>WIN</Text>
                </View>
              ) : (
                <View style={styles.tagLoss}>
                  <Text style={styles.tagLossText}>LOSS</Text>
                </View>
              )}
            </View>
          </View>

          {/* Battle Boards */}
          {(gameData.playerBoardData || gameData.aiBoardData) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BATTLE OVERVIEW</Text>
              <View style={styles.mapContainer}>
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
            <Text style={styles.sectionTitle}>GAME SUMMARY</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>RESULT</Text>
                <Text style={[styles.summaryValue, isWinner ? {color: colors.accent} : {color: colors.danger}]}>
                  {isWinner ? 'WIN' : 'LOSS'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>TOTAL TURNS</Text>
                <Text style={styles.summaryValue}>{gameData.totalTurns}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>DURATION</Text>
                <Text style={styles.summaryValue}>{getGameDuration()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>EFFICIENCY</Text>
                <Text style={styles.summaryValue}>{getAccuracyEstimate()}</Text>
              </View>
            </View>
          </View>

          {/* Game Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONFIGURATION</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Game Type</Text>
                <Text style={styles.infoValue}>
                  {gameData.gameType === 'ai' ? 'vs AI' : 'Online'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Board Size</Text>
                <Text style={styles.infoValue}>{gameData.boardSize}x{gameData.boardSize}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Airplanes</Text>
                <Text style={styles.infoValue}>{gameData.airplaneCount} per player</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Completed</Text>
                <Text style={styles.infoValue}>{formatDate(gameData.completedAt)}</Text>
              </View>
            </View>
          </View>

          {/* Statistics */}
          {gameData.playerStats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>BATTLE STATISTICS</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statColumn}>
                  <Text style={[styles.statColumnTitle, {color: colors.accent}]}>You</Text>
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
                  <Text style={[styles.statColumnTitle, {color: colors.goldDark}]}>Opponent</Text>
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

          {/* Note */}
          <View style={styles.noteSection}>
            <Text style={styles.noteEmoji}>{'\uD83D\uDCA1'}</Text>
            <Text style={styles.noteText}>
              Full battle replay feature coming soon! This will allow you to review each turn
              and see exactly how the battle unfolded.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <AnimatedButton
          style={styles.btnBack}
          onPress={() => navigation.goBack()}>
          <Text style={styles.btnBackText}>BACK</Text>
        </AnimatedButton>

        <AnimatedButton
          style={styles.btnMain}
          onPress={() => navigation.navigate('MainMenu')}>
          <Text style={styles.btnMainText}>MAIN MENU</Text>
        </AnimatedButton>
      </View>
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
    padding: 24,
    borderBottomWidth: 2,
  },
  winHeader: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  lossHeader: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderBottomColor: colors.dangerBorder,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  winEmojiShadow: {
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
  },
  lossEmojiShadow: {
    textShadowColor: 'rgba(255, 68, 68, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
  },
  resultTitle: {
    fontFamily: fonts.orbitronBlack,
    fontSize: 32,
    marginBottom: 5,
    letterSpacing: 3,
  },
  winTitleColor: {
    color: colors.gold,
  },
  lossTitleColor: {
    color: colors.danger,
  },
  resultSubtitle: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tagText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  playersContainer: {
    gap: 10,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  cardHighlight: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentGlow,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  crownIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  playerLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  playerName: {
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    color: colors.textPrimary,
    marginVertical: 4,
  },
  tagWin: {
    backgroundColor: colors.successDim,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 6,
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
    marginTop: 6,
  },
  tagLossText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 11,
    color: colors.danger,
  },
  vsLabel: {
    fontFamily: fonts.orbitronBold,
    fontSize: 16,
    color: colors.textDark,
    textAlign: 'center',
    paddingVertical: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 2,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginBottom: 12,
    marginTop: 8,
  },
  mapContainer: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
    letterSpacing: 1,
  },
  summaryValue: {
    fontFamily: fonts.orbitronExtraBold,
    fontSize: 20,
    color: colors.textPrimary,
  },
  infoGrid: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
  },
  statColumn: {
    flex: 1,
  },
  statColumnTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 8,
    marginBottom: 6,
  },
  statLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
  statValue: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 12,
  },
  noteSection: {
    backgroundColor: 'rgba(0, 30, 60, 0.3)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  noteEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  noteText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  btnBack: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnBackText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  btnMain: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  btnMainText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
});
