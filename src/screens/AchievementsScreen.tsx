import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {AchievementService} from '../services/AchievementService';
import {AchievementConfig, Achievement, AchievementCategory} from '../config/AchievementConfig';

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2c2c2c',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#2c2c2c',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#bbb',
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#3a3a3a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2c',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#3498db',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  achievementsList: {
    flex: 1,
  },
  achievementsListContent: {
    padding: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  achievementCardUnlocked: {
    backgroundColor: '#2c3e50',
  },
  achievementIcon: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementIconText: {
    fontSize: 40,
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
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  achievementNameLocked: {
    color: '#666',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  rarityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 8,
  },
  achievementDescriptionLocked: {
    color: '#666',
  },
  rewardContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  rewardLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  rewardValue: {
    fontSize: 12,
    color: '#f39c12',
    fontWeight: '600',
  },
  lockedHint: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
