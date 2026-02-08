import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {AchievementService} from '../services/AchievementService';
import {AchievementConfig, Achievement, AchievementCategory} from '../config/AchievementConfig';
import {colors, fonts} from '../theme/colors';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type Props = {
  navigation: any;
};

export default function AchievementsScreen({navigation}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory>('basic');
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({total: 0, unlocked: 0, percentage: 0});

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    await AchievementService.initialize();
    const ids = AchievementService.getUnlockedIds();
    setUnlockedIds(new Set(ids));
    setProgress(AchievementService.getAchievementProgress());
  };

  const achievements = AchievementConfig.getByCategory(selectedCategory);

  const categories: Array<{key: AchievementCategory; label: string}> = [
    {key: 'basic', label: 'Basic'},
    {key: 'skill', label: 'Skill'},
    {key: 'rare', label: 'Rare'},
    {key: 'mode_unlock', label: 'Unlocks'},
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ACHIEVEMENTS</Text>
        <View style={styles.backButton} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            {progress.unlocked} / {progress.total} Unlocked
          </Text>
          <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {width: `${progress.percentage}%`},
            ]}
          />
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryTab,
              selectedCategory === category.key && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(category.key)}>
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === category.key && styles.categoryTabTextActive,
              ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Achievements List */}
      <ScrollView
        style={styles.achievementsList}
        contentContainerStyle={styles.achievementsListContent}>
        {achievements.map(achievement => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const rarityColor = AchievementConfig.getRarityColor(achievement.rarity);

          return (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                isUnlocked && styles.achievementCardUnlocked,
                {borderLeftColor: rarityColor},
              ]}>
              <View style={styles.achievementIcon}>
                <Text
                  style={[
                    styles.achievementIconText,
                    !isUnlocked && styles.achievementIconLocked,
                  ]}>
                  {isUnlocked ? achievement.icon : '🔒'}
                </Text>
              </View>

              <View style={styles.achievementContent}>
                <View style={styles.achievementHeader}>
                  <Text
                    style={[
                      styles.achievementName,
                      !isUnlocked && styles.achievementNameLocked,
                    ]}>
                    {isUnlocked ? achievement.name : '???'}
                  </Text>
                  <View
                    style={[
                      styles.rarityBadge,
                      {backgroundColor: rarityColor},
                    ]}>
                    <Text style={styles.rarityText}>
                      {AchievementConfig.getRarityName(achievement.rarity)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.achievementDescription,
                    !isUnlocked && styles.achievementDescriptionLocked,
                  ]}>
                  {isUnlocked ? achievement.description : 'Complete requirements to unlock'}
                </Text>

                {achievement.reward.title && isUnlocked && (
                  <View style={styles.rewardContainer}>
                    <Text style={styles.rewardLabel}>Reward:</Text>
                    <Text style={styles.rewardValue}>
                      Title: "{achievement.reward.title}"
                    </Text>
                  </View>
                )}

                {!isUnlocked && (
                  <Text style={styles.lockedHint}>
                    {achievement.description}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.accentBorder,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  backButtonText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.accent,
  },
  headerTitle: {
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  progressContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  progressPercentage: {
    fontFamily: fonts.orbitronBold,
    fontSize: 16,
    color: colors.accent,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 6,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryTabActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  categoryTabText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  categoryTabTextActive: {
    color: colors.accent,
  },
  achievementsList: {
    flex: 1,
  },
  achievementsListContent: {
    padding: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 30, 60, 0.3)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  achievementCardUnlocked: {
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
    borderColor: 'rgba(0, 212, 255, 0.12)',
  },
  achievementIcon: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 28,
  },
  achievementIconText: {
    fontSize: 32,
  },
  achievementIconLocked: {
    opacity: 0.3,
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  achievementName: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: 0.5,
  },
  achievementNameLocked: {
    color: colors.textDark,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  rarityText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 8,
    color: colors.bgPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  achievementDescription: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
    lineHeight: 20,
  },
  achievementDescriptionLocked: {
    color: colors.textDark,
  },
  rewardContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rewardLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginRight: 8,
  },
  rewardValue: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 12,
    color: colors.gold,
  },
  lockedHint: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 12,
    color: colors.textDark,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
