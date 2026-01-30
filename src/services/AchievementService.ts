/**
 * Achievement Service
 * Manages achievement unlocking, tracking, and persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AchievementConfig, Achievement} from '../config/AchievementConfig';

const STORAGE_KEY = 'achievements_data';

interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  name: string;
  icon: string;
}

class AchievementServiceClass {
  private unlockedAchievements: Set<string> = new Set();
  private listeners: Array<(achievement: UnlockedAchievement) => void> = [];
  private initialized: boolean = false;

  /**
   * Initialize the achievement service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.unlockedAchievements = new Set(data.unlocked || []);
        console.log('[AchievementService] Loaded', this.unlockedAchievements.size, 'unlocked achievements');
      } else {
        console.log('[AchievementService] No saved achievements found');
      }
      this.initialized = true;
    } catch (error) {
      console.error('[AchievementService] Failed to load achievements:', error);
      this.unlockedAchievements = new Set();
      this.initialized = true;
    }
  }

  /**
   * Check if an achievement is unlocked
   */
  isUnlocked(achievementId: string): boolean {
    return this.unlockedAchievements.has(achievementId);
  }

  /**
   * Get all unlocked achievement IDs
   */
  getUnlockedIds(): string[] {
    return Array.from(this.unlockedAchievements);
  }

  /**
   * Get all unlocked achievements with details
   */
  getUnlockedAchievements(): Achievement[] {
    const achievements: Achievement[] = [];
    this.unlockedAchievements.forEach(id => {
      const achievement = AchievementConfig.getAchievement(id);
      if (achievement) {
        achievements.push(achievement);
      }
    });
    return achievements;
  }

  /**
   * Unlock an achievement
   */
  private async unlockAchievement(achievementId: string): Promise<boolean> {
    if (this.isUnlocked(achievementId)) {
      return false; // Already unlocked
    }

    const achievement = AchievementConfig.getAchievement(achievementId);
    if (!achievement) {
      console.warn('[AchievementService] Achievement not found:', achievementId);
      return false;
    }

    // Add to unlocked set
    this.unlockedAchievements.add(achievementId);

    // Save to storage
    await this.saveToStorage();

    // Create unlocked achievement object
    const unlockedAchievement: UnlockedAchievement = {
      id: achievementId,
      unlockedAt: Date.now(),
      name: achievement.name,
      icon: achievement.icon
    };

    // Notify listeners
    this.notifyListeners(unlockedAchievement);

    console.log('[AchievementService] Achievement unlocked:', achievement.name);
    return true;
  }

  /**
   * Save unlocked achievements to storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        unlocked: Array.from(this.unlockedAchievements),
        lastUpdated: Date.now()
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[AchievementService] Failed to save achievements:', error);
    }
  }

  /**
   * Check achievements on game end
   */
  async checkGameEndAchievements(gameResult: any, userStats: any): Promise<UnlockedAchievement[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const newlyUnlocked: UnlockedAchievement[] = [];
    const achievementsToCheck = AchievementConfig.getGameEndAchievements();

    console.log('[AchievementService] Checking', achievementsToCheck.length, 'game-end achievements');

    for (const achievement of achievementsToCheck) {
      if (this.isUnlocked(achievement.id)) {
        continue; // Skip already unlocked
      }

      try {
        const conditionMet = achievement.condition(gameResult, userStats);
        if (conditionMet) {
          const unlocked = await this.unlockAchievement(achievement.id);
          if (unlocked) {
            newlyUnlocked.push({
              id: achievement.id,
              unlockedAt: Date.now(),
              name: achievement.name,
              icon: achievement.icon
            });
          }
        }
      } catch (error) {
        console.error(`[AchievementService] Error checking ${achievement.id}:`, error);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check achievements on stats update
   */
  async checkStatsAchievements(gameResult: any, userStats: any): Promise<UnlockedAchievement[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const newlyUnlocked: UnlockedAchievement[] = [];
    const achievementsToCheck = AchievementConfig.getStatsAchievements();

    console.log('[AchievementService] Checking', achievementsToCheck.length, 'stats achievements');

    for (const achievement of achievementsToCheck) {
      if (this.isUnlocked(achievement.id)) {
        continue; // Skip already unlocked
      }

      try {
        const conditionMet = achievement.condition(gameResult, userStats);
        if (conditionMet) {
          const unlocked = await this.unlockAchievement(achievement.id);
          if (unlocked) {
            newlyUnlocked.push({
              id: achievement.id,
              unlockedAt: Date.now(),
              name: achievement.name,
              icon: achievement.icon
            });
          }
        }
      } catch (error) {
        console.error(`[AchievementService] Error checking ${achievement.id}:`, error);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Manually unlock an achievement (for special events like viewing battle report)
   */
  async manuallyUnlock(achievementId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.unlockAchievement(achievementId);
  }

  /**
   * Get progress for all achievements
   */
  getAchievementProgress(): { total: number; unlocked: number; percentage: number } {
    const total = AchievementConfig.getAllAchievements().length;
    const unlocked = this.unlockedAchievements.size;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return { total, unlocked, percentage };
  }

  /**
   * Check if a difficulty is unlocked
   */
  isDifficultyUnlocked(difficulty: string): boolean {
    if (difficulty === 'easy') return true; // Easy is always unlocked

    if (difficulty === 'medium') {
      return this.isUnlocked('mediumUnlocked');
    }

    if (difficulty === 'hard') {
      return this.isUnlocked('hardUnlocked');
    }

    return false;
  }

  /**
   * Check if a board size mode is unlocked
   */
  isModeUnlocked(size: number): boolean {
    if (size === 10) return true; // Standard mode always unlocked

    if (size === 15) {
      return this.isUnlocked('extendedUnlocked');
    }

    if (size === 20) {
      return this.isUnlocked('largeUnlocked');
    }

    return false;
  }

  /**
   * Get unlock requirement message
   */
  getUnlockRequirement(achievementId: string): string | null {
    const achievement = AchievementConfig.getAchievement(achievementId);
    if (!achievement) return null;

    return achievement.description;
  }

  /**
   * Add listener for achievement unlocks
   */
  addListener(callback: (achievement: UnlockedAchievement) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback: (achievement: UnlockedAchievement) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of new achievement
   */
  private notifyListeners(achievement: UnlockedAchievement): void {
    this.listeners.forEach(listener => {
      try {
        listener(achievement);
      } catch (error) {
        console.error('[AchievementService] Listener error:', error);
      }
    });
  }

  /**
   * Reset all achievements (for testing)
   */
  async reset(): Promise<void> {
    this.unlockedAchievements.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('[AchievementService] All achievements reset');
  }

  /**
   * Check collector achievement (all skins unlocked)
   */
  async checkCollectorAchievement(allSkinsUnlocked: boolean): Promise<boolean> {
    if (allSkinsUnlocked && !this.isUnlocked('collector')) {
      return await this.unlockAchievement('collector');
    }
    return false;
  }

  /**
   * Check completionist achievement (all other achievements unlocked)
   */
  async checkCompletionistAchievement(): Promise<boolean> {
    const allAchievements = AchievementConfig.getAllAchievements();
    const totalAchievements = allAchievements.length;
    const unlockedCount = this.unlockedAchievements.size;

    // Check if all except completionist are unlocked
    const hasCompletionist = this.isUnlocked('completionist');
    const allOthersUnlocked = hasCompletionist
      ? unlockedCount === totalAchievements
      : unlockedCount === totalAchievements - 1;

    if (allOthersUnlocked && !hasCompletionist) {
      return await this.unlockAchievement('completionist');
    }

    return false;
  }
}

// Export singleton instance
export const AchievementService = new AchievementServiceClass();
