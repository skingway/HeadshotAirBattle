/**
 * Achievement System Configuration
 * Defines all achievements, unlock conditions, and rewards
 */

export type AchievementCategory = 'basic' | 'skill' | 'rare' | 'mode_unlock';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RewardType = 'badge' | 'title' | 'mode' | 'difficulty';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  checkOnGameEnd?: boolean;
  checkOnStats?: boolean;
  checkManually?: boolean;
  condition: (gameResult: any, userStats: any) => boolean;
  reward: {
    type: RewardType;
    value?: string;
    title?: string;
  };
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  // ==================== BASIC ACHIEVEMENTS ====================
  firstWin: {
    id: 'firstWin',
    name: 'First Victory',
    description: 'Win your first game',
    icon: '🎯',
    category: 'basic',
    rarity: 'common',
    checkOnGameEnd: true,
    condition: (gameResult, userStats) => {
      return userStats.wins >= 1;
    },
    reward: {
      type: 'badge',
      title: 'Recruit'
    }
  },

  tactician: {
    id: 'tactician',
    name: 'Tactician',
    description: 'Complete 10 games',
    icon: '🎲',
    category: 'basic',
    rarity: 'common',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.totalGames >= 10;
    },
    reward: {
      type: 'badge'
    }
  },

  analyst: {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'View a battle report',
    icon: '📊',
    category: 'basic',
    rarity: 'common',
    checkManually: true,
    condition: () => true,
    reward: {
      type: 'badge'
    }
  },

  // ==================== SKILL ACHIEVEMENTS ====================
  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Achieve ≥80% accuracy in a single game',
    icon: '🎯',
    category: 'skill',
    rarity: 'rare',
    checkOnGameEnd: true,
    condition: (gameResult, userStats) => {
      const {playerStats} = gameResult;
      if (!playerStats) return false;

      const totalShots = playerStats.hits + playerStats.misses;
      if (totalShots < 10) return false;

      const accuracy = (playerStats.hits / totalShots) * 100;
      return accuracy >= 80;
    },
    reward: {
      type: 'title',
      title: 'Precision Shooter'
    }
  },

  lightning: {
    id: 'lightning',
    name: 'Lightning Strike',
    description: 'Win within 30 moves',
    icon: '⚡',
    category: 'skill',
    rarity: 'rare',
    checkOnGameEnd: true,
    condition: (gameResult, userStats) => {
      return gameResult.winner !== 'AI' && gameResult.totalTurns <= 30;
    },
    reward: {
      type: 'title',
      title: 'Blitz Master'
    }
  },

  streakMaster: {
    id: 'streakMaster',
    name: 'Winning Streak',
    description: 'Achieve a 5-win streak',
    icon: '🔥',
    category: 'skill',
    rarity: 'rare',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return (userStats.currentStreak || 0) >= 5;
    },
    reward: {
      type: 'title',
      title: 'Streak Master'
    }
  },

  perfectGame: {
    id: 'perfectGame',
    name: 'Perfectionist',
    description: '100% accuracy in a single game (minimum 10 attacks)',
    icon: '💯',
    category: 'skill',
    rarity: 'epic',
    checkOnGameEnd: true,
    condition: (gameResult, userStats) => {
      const {playerStats} = gameResult;
      if (!playerStats) return false;

      const totalShots = playerStats.hits + playerStats.misses;
      return totalShots >= 10 && playerStats.misses === 0;
    },
    reward: {
      type: 'title',
      title: 'Perfect'
    }
  },

  veteran: {
    id: 'veteran',
    name: 'Battle-Hardened Veteran',
    description: 'Complete 100 games',
    icon: '🎖️',
    category: 'skill',
    rarity: 'epic',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.totalGames >= 100;
    },
    reward: {
      type: 'title',
      title: 'Veteran'
    }
  },

  victor: {
    id: 'victor',
    name: 'Victory Royale',
    description: 'Achieve 50 total wins',
    icon: '👑',
    category: 'skill',
    rarity: 'rare',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.wins >= 50;
    },
    reward: {
      type: 'title',
      title: 'Victor'
    }
  },

  elite: {
    id: 'elite',
    name: 'Elite Player',
    description: 'Reach 70% win rate (minimum 20 games)',
    icon: '🌟',
    category: 'skill',
    rarity: 'epic',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.totalGames >= 20 && (userStats.winRate || 0) >= 70;
    },
    reward: {
      type: 'title',
      title: 'Elite'
    }
  },

  champion: {
    id: 'champion',
    name: 'Champion',
    description: 'Achieve 100 total wins',
    icon: '🏆',
    category: 'skill',
    rarity: 'legendary',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.wins >= 100;
    },
    reward: {
      type: 'title',
      title: 'Champion'
    }
  },

  // ==================== RARE ACHIEVEMENTS ====================
  comeback: {
    id: 'comeback',
    name: 'Last Stand',
    description: 'Win with only 1 plane remaining',
    icon: '🎭',
    category: 'rare',
    rarity: 'epic',
    checkOnGameEnd: true,
    condition: (gameResult, userStats) => {
      return gameResult.comebackWin === true;
    },
    reward: {
      type: 'title',
      title: 'Comeback King'
    }
  },

  prophet: {
    id: 'prophet',
    name: 'Prophet',
    description: 'Hit all first 5 attacks',
    icon: '🔮',
    category: 'rare',
    rarity: 'epic',
    checkOnGameEnd: true,
    condition: (gameResult, userStats) => {
      return gameResult.first5AllHit === true;
    },
    reward: {
      type: 'title',
      title: 'Oracle'
    }
  },

  undefeated: {
    id: 'undefeated',
    name: 'Undefeated Legend',
    description: 'Achieve a 10-win streak',
    icon: '🏅',
    category: 'rare',
    rarity: 'legendary',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return (userStats.currentStreak || 0) >= 10;
    },
    reward: {
      type: 'title',
      title: 'Undefeated'
    }
  },

  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Unlock all skins and themes',
    icon: '⭐',
    category: 'rare',
    rarity: 'legendary',
    checkManually: true,
    condition: () => false, // Checked manually
    reward: {
      type: 'title',
      title: 'Collector'
    }
  },

  completionist: {
    id: 'completionist',
    name: 'Completionist',
    description: 'Unlock all other achievements',
    icon: '🌈',
    category: 'rare',
    rarity: 'legendary',
    checkManually: true,
    condition: () => false, // Checked manually
    reward: {
      type: 'title',
      title: 'Completionist'
    }
  },

  // ==================== MODE UNLOCK ACHIEVEMENTS ====================
  mediumUnlocked: {
    id: 'mediumUnlocked',
    name: 'AI Challenger',
    description: 'Unlock Medium AI - Win 3 games',
    icon: '🤖',
    category: 'mode_unlock',
    rarity: 'common',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.wins >= 3;
    },
    reward: {
      type: 'difficulty',
      value: 'medium'
    }
  },

  hardUnlocked: {
    id: 'hardUnlocked',
    name: 'Ultimate Challenge',
    description: 'Unlock Hard AI - Win 10 games',
    icon: '🤖',
    category: 'mode_unlock',
    rarity: 'rare',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.wins >= 10;
    },
    reward: {
      type: 'difficulty',
      value: 'hard'
    }
  },

  extendedUnlocked: {
    id: 'extendedUnlocked',
    name: 'Mode Explorer',
    description: 'Unlock Extended mode (15×15) - Play 10 games',
    icon: '🔓',
    category: 'mode_unlock',
    rarity: 'common',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.totalGames >= 10;
    },
    reward: {
      type: 'mode',
      value: 'extended'
    }
  },

  largeUnlocked: {
    id: 'largeUnlocked',
    name: 'Grand Strategy',
    description: 'Unlock Large mode (20×20) - Play 25 games',
    icon: '📐',
    category: 'mode_unlock',
    rarity: 'rare',
    checkOnStats: true,
    condition: (gameResult, userStats) => {
      return userStats.totalGames >= 25;
    },
    reward: {
      type: 'mode',
      value: 'large'
    }
  },
};

export class AchievementConfig {
  static getAchievement(id: string): Achievement | undefined {
    return ACHIEVEMENTS[id];
  }

  static getAllAchievements(): Achievement[] {
    return Object.values(ACHIEVEMENTS);
  }

  static getByCategory(category: AchievementCategory): Achievement[] {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  static getGameEndAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => a.checkOnGameEnd);
  }

  static getStatsAchievements(): Achievement[] {
    return this.getAllAchievements().filter(a => a.checkOnStats);
  }

  static getRarityColor(rarity: AchievementRarity): string {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      default: return '#95a5a6';
    }
  }

  static getRarityName(rarity: AchievementRarity): string {
    switch (rarity) {
      case 'common': return 'Common';
      case 'rare': return 'Rare';
      case 'epic': return 'Epic';
      case 'legendary': return 'Legendary';
      default: return 'Common';
    }
  }
}
