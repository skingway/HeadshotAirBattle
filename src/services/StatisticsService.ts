/**
 * Statistics Service
 * Handles user statistics tracking and updates
 */

import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';
import FirebaseService from './FirebaseService';

interface Statistics {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  onlineGames?: number;
}

class StatisticsService {
  private static instance: StatisticsService;
  private statistics: Statistics | null = null;

  private constructor() {}

  static getInstance(): StatisticsService {
    if (!StatisticsService.instance) {
      StatisticsService.instance = new StatisticsService();
    }
    return StatisticsService.instance;
  }

  /**
   * Load user statistics (supports offline mode)
   */
  async loadStatistics(): Promise<Statistics> {
    const userId = AuthService.getUserId();
    if (!userId) {
      console.warn('[StatisticsService] No user ID, returning default stats');
      this.statistics = this.getDefaultStatistics();
      return this.statistics;
    }

    // Try to load from local storage first (works in all modes)
    try {
      const savedStats = await AsyncStorage.getItem('offline_statistics');
      if (savedStats) {
        this.statistics = JSON.parse(savedStats);
        console.log('[StatisticsService] ✓ Statistics loaded from local storage:', this.statistics);

        // If online, try to sync with Firestore in background (non-blocking)
        if (!FirebaseService.isOffline()) {
          this.syncWithFirestore(userId).catch(err => {
            console.warn('[StatisticsService] Background sync failed, continuing with local data');
          });
        }

        return this.statistics;
      }
    } catch (error) {
      console.warn('[StatisticsService] Could not load from local storage:', error);
    }

    // If no local data, try Firestore (only if not in offline mode)
    if (!FirebaseService.isOffline()) {
      try {
        const userDoc = await firestore().collection('users').doc(userId).get();

        if (userDoc.exists) {
          const data = userDoc.data();
          this.statistics = {
            totalGames: data?.totalGames || 0,
            wins: data?.wins || 0,
            losses: data?.losses || 0,
            winRate: data?.winRate || 0,
            onlineGames: data?.onlineGames || 0,
          };

          // Save to local storage for offline access
          await AsyncStorage.setItem('offline_statistics', JSON.stringify(this.statistics));
          console.log('[StatisticsService] ✓ Statistics loaded from Firestore:', this.statistics);
          return this.statistics;
        }
      } catch (error) {
        console.warn('[StatisticsService] Firestore unavailable, using local data:', error);
      }
    }

    // Fall back to default statistics
    this.statistics = this.getDefaultStatistics();
    await AsyncStorage.setItem('offline_statistics', JSON.stringify(this.statistics));
    console.log('[StatisticsService] ✓ Initialized default statistics');
    return this.statistics;
  }

  /**
   * Sync local statistics with Firestore (background task)
   */
  private async syncWithFirestore(userId: string): Promise<void> {
    if (!this.statistics) return;

    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const firestoreData = userDoc.data();
        // If Firestore has newer data, update local
        if (firestoreData && firestoreData.totalGames > (this.statistics.totalGames || 0)) {
          this.statistics = {
            totalGames: firestoreData.totalGames || 0,
            wins: firestoreData.wins || 0,
            losses: firestoreData.losses || 0,
            winRate: firestoreData.winRate || 0,
            onlineGames: firestoreData.onlineGames || 0,
          };
          await AsyncStorage.setItem('offline_statistics', JSON.stringify(this.statistics));
          console.log('[StatisticsService] ✓ Synced from Firestore');
        }
      }
    } catch (error) {
      // Silently fail - we already have local data
      console.log('[StatisticsService] Sync skipped (Firestore unavailable)');
    }
  }

  /**
   * Initialize statistics for new user
   */
  private async initializeStatistics(userId: string): Promise<void> {
    const defaultStats = this.getDefaultStatistics();

    try {
      // Always save to local storage
      await AsyncStorage.setItem('offline_statistics', JSON.stringify(defaultStats));

      // Try to save to Firestore (may fail)
      if (!FirebaseService.isOffline()) {
        firestore().collection('users').doc(userId).set(
          defaultStats,
          { merge: true }
        ).catch(err => {
          console.warn('[StatisticsService] Could not initialize in Firestore:', err.message);
        });
      }

      this.statistics = defaultStats;
      console.log('[StatisticsService] ✓ Statistics initialized');
    } catch (error) {
      console.error('[StatisticsService] ❌ Failed to initialize statistics:', error);
    }
  }

  /**
   * Get default statistics
   */
  private getDefaultStatistics(): Statistics {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      onlineGames: 0,
    };
  }

  /**
   * Update statistics after a game (supports offline mode)
   */
  async updateStatistics(isWinner: boolean, isOnlineGame: boolean = false): Promise<boolean> {
    const userId = AuthService.getUserId();
    if (!userId) {
      console.warn('[StatisticsService] Cannot update stats: No user ID');
      return false;
    }

    try {
      console.log('[StatisticsService] Updating statistics...', { isWinner, isOnlineGame });

      // Load current statistics
      await this.loadStatistics();

      // Calculate new statistics
      const newTotalGames = (this.statistics?.totalGames || 0) + 1;
      const newWins = isWinner ? (this.statistics?.wins || 0) + 1 : (this.statistics?.wins || 0);
      const newLosses = !isWinner ? (this.statistics?.losses || 0) + 1 : (this.statistics?.losses || 0);
      const newWinRate = newTotalGames > 0 ? (newWins / newTotalGames) * 100 : 0;
      const newOnlineGames = isOnlineGame ? (this.statistics?.onlineGames || 0) + 1 : (this.statistics?.onlineGames || 0);

      const updatedStats: Statistics = {
        totalGames: newTotalGames,
        wins: newWins,
        losses: newLosses,
        winRate: parseFloat(newWinRate.toFixed(2)),
        onlineGames: newOnlineGames,
      };

      // Always save to local storage first (most reliable)
      await AsyncStorage.setItem('offline_statistics', JSON.stringify(updatedStats));

      // Update local cache
      this.statistics = updatedStats;

      // Try to update Firestore in background (non-blocking, may fail)
      if (!FirebaseService.isOffline()) {
        firestore().collection('users').doc(userId).set(
          updatedStats,
          { merge: true }
        ).catch(err => {
          console.warn('[StatisticsService] Could not sync to Firestore (continuing with local save):', err.message);
        });
      }

      console.log('[StatisticsService] ✓ Statistics updated:', updatedStats);
      return true;
    } catch (error) {
      console.error('[StatisticsService] ❌ Failed to update statistics:', error);
      return false;
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): Statistics {
    return this.statistics || this.getDefaultStatistics();
  }

  /**
   * Get total games
   */
  getTotalGames(): number {
    return this.statistics?.totalGames || 0;
  }

  /**
   * Get wins
   */
  getWins(): number {
    return this.statistics?.wins || 0;
  }

  /**
   * Get losses
   */
  getLosses(): number {
    return this.statistics?.losses || 0;
  }

  /**
   * Get win rate
   */
  getWinRate(): number {
    return this.statistics?.winRate || 0;
  }

  /**
   * Get online games
   */
  getOnlineGames(): number {
    return this.statistics?.onlineGames || 0;
  }

  /**
   * Refresh statistics from server
   */
  async refresh(): Promise<Statistics> {
    return await this.loadStatistics();
  }

  /**
   * Save game history (supports offline mode)
   */
  async saveGameHistory(gameData: {
    gameType: 'ai' | 'online';
    opponent: string;
    winner: string;
    boardSize: number;
    airplaneCount: number;
    totalTurns: number;
    completedAt: number;
    playerBoardData?: any;
    aiBoardData?: any;
    playerStats?: {hits: number; misses: number; kills: number};
    aiStats?: {hits: number; misses: number; kills: number};
  }): Promise<boolean> {
    const userId = AuthService.getUserId();
    if (!userId) {
      console.warn('[StatisticsService] Cannot save game history: No user ID');
      return false;
    }

    try {
      console.log('[StatisticsService] Saving game history...');

      const historyData = {
        ...gameData,
        userId,
        players: gameData.gameType === 'ai'
          ? [userId, 'AI']
          : [userId, gameData.opponent],
      };

      // Always save to local storage first (most reliable)
      const history = await AsyncStorage.getItem('offline_game_history');
      const historyArray = history ? JSON.parse(history) : [];
      historyArray.push(historyData);

      // Keep only last 10 games to avoid storage bloat
      if (historyArray.length > 10) {
        historyArray.shift();
      }

      await AsyncStorage.setItem('offline_game_history', JSON.stringify(historyArray));

      // Try to save to Firestore in background (non-blocking, may fail)
      if (!FirebaseService.isOffline()) {
        firestore().collection('gameHistory').add(historyData).catch(err => {
          console.warn('[StatisticsService] Could not sync history to Firestore (continuing with local save):', err.message);
        });
      }

      console.log('[StatisticsService] ✓ Game history saved');
      return true;
    } catch (error) {
      console.error('[StatisticsService] ❌ Failed to save game history:', error);
      return false;
    }
  }

  /**
   * Get game history (supports offline mode)
   * Returns last 10 games
   */
  async getGameHistory(): Promise<any[]> {
    try {
      // Try local storage first
      const history = await AsyncStorage.getItem('offline_game_history');
      if (history) {
        const historyArray = JSON.parse(history);
        // Return last 10 games (most recent first)
        return historyArray.reverse().slice(0, 10);
      }

      // If online and no local data, try Firestore
      if (!FirebaseService.isOffline()) {
        const userId = AuthService.getUserId();
        if (!userId) return [];

        const snapshot = await firestore()
          .collection('gameHistory')
          .where('userId', '==', userId)
          .orderBy('completedAt', 'desc')
          .limit(10)
          .get();

        const games = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Cache locally
        await AsyncStorage.setItem('offline_game_history', JSON.stringify(games));
        return games;
      }

      return [];
    } catch (error) {
      console.error('[StatisticsService] ❌ Failed to get game history:', error);
      return [];
    }
  }

  /**
   * Get leaderboard data (online only)
   * Returns top 20 players by winRate, wins, and totalGames
   */
  async getLeaderboard(type: 'winRate' | 'wins' | 'totalGames' = 'winRate'): Promise<any[]> {
    try {
      if (FirebaseService.isOffline()) {
        console.warn('[StatisticsService] Leaderboard unavailable in offline mode');
        return [];
      }

      const fieldMap = {
        winRate: 'winRate',
        wins: 'wins',
        totalGames: 'totalGames',
      };

      const snapshot = await firestore()
        .collection('users')
        .orderBy(fieldMap[type], 'desc')
        .limit(20)
        .get();

      const leaderboard = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          rank: index + 1,
          userId: doc.id,
          nickname: data.nickname || 'Anonymous',
          totalGames: data.totalGames || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          winRate: data.winRate || 0,
        };
      });

      // Cache locally
      await AsyncStorage.setItem(`leaderboard_${type}`, JSON.stringify(leaderboard));
      await AsyncStorage.setItem(`leaderboard_${type}_timestamp`, Date.now().toString());

      return leaderboard;
    } catch (error) {
      console.error('[StatisticsService] ❌ Failed to get leaderboard:', error);

      // Try to load from cache
      try {
        const cached = await AsyncStorage.getItem(`leaderboard_${type}`);
        const timestamp = await AsyncStorage.getItem(`leaderboard_${type}_timestamp`);

        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp);
          // Use cache if less than 5 minutes old
          if (age < 5 * 60 * 1000) {
            console.log('[StatisticsService] Using cached leaderboard data');
            return JSON.parse(cached);
          }
        }
      } catch (cacheError) {
        console.warn('[StatisticsService] Could not load cached leaderboard');
      }

      return [];
    }
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(type: 'winRate' | 'wins' | 'totalGames' = 'winRate'): Promise<number> {
    try {
      if (FirebaseService.isOffline()) {
        return -1;
      }

      const userId = AuthService.getUserId();
      if (!userId) return -1;

      const fieldMap = {
        winRate: 'winRate',
        wins: 'wins',
        totalGames: 'totalGames',
      };

      const currentUserDoc = await firestore().collection('users').doc(userId).get();
      if (!currentUserDoc.exists) return -1;

      const currentUserValue = currentUserDoc.data()?.[fieldMap[type]] || 0;

      const snapshot = await firestore()
        .collection('users')
        .where(fieldMap[type], '>', currentUserValue)
        .get();

      return snapshot.size + 1;
    } catch (error) {
      console.error('[StatisticsService] ❌ Failed to get user rank:', error);
      return -1;
    }
  }
}

export default StatisticsService.getInstance();
