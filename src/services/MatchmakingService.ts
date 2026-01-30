/**
 * Matchmaking Service
 * Handles automatic player matching for quick games
 */

import firestore from '@react-native-firebase/firestore';
import AuthService from './AuthService';
import StatisticsService from './StatisticsService';
import MultiplayerService from './MultiplayerService';

interface QueueEntry {
  userId: string;
  nickname: string;
  totalGames: number;
  winRate: number;
  preferredMode: string;
  joinedAt: number;
  status: 'waiting' | 'matched';
  matchId?: string;
}

type MatchFoundCallback = (gameId: string) => void;

class MatchmakingServiceClass {
  private queueListener: (() => void) | null = null;
  private matchFoundCallback: MatchFoundCallback | null = null;
  private isInQueue: boolean = false;
  private matchCheckInterval: NodeJS.Timeout | null = null;
  private searchTimeout: NodeJS.Timeout | null = null;
  private readonly SEARCH_TIMEOUT_MS = 60000; // 60 seconds like web version

  /**
   * Join matchmaking queue
   */
  async joinQueue(mode: string = 'standard'): Promise<{ success: boolean; error?: string }> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return { success: false, error: 'Not signed in' };
    }

    if (this.isInQueue) {
      return { success: false, error: 'Already in queue' };
    }

    try {
      // Clean up stale data first (like web version)
      console.log('[MatchmakingService] Cleaning up stale data...');
      try {
        await firestore().collection('matchmakingQueue').doc(userId).delete();
      } catch (e) {
        // Ignore if doesn't exist
      }

      const userProfile = AuthService.getUserProfile();
      const stats = await StatisticsService.refresh();

      const queueEntry: QueueEntry = {
        userId,
        nickname: userProfile?.nickname || 'Player',
        totalGames: stats.totalGames,
        winRate: stats.winRate,
        preferredMode: mode,
        joinedAt: Date.now(),
        status: 'waiting',
      };

      // Add to queue
      await firestore()
        .collection('matchmakingQueue')
        .doc(userId)
        .set(queueEntry);

      this.isInQueue = true;

      // Start listening for matches
      this.startMatchListening(userId);

      // Start match checking
      this.startMatchChecking();

      // Start timeout timer (60 seconds like web version)
      this.searchTimeout = setTimeout(() => {
        this.handleSearchTimeout();
      }, this.SEARCH_TIMEOUT_MS);

      console.log('[MatchmakingService] ✓ Joined queue with 60s timeout');
      return { success: true };
    } catch (error: any) {
      console.error('[MatchmakingService] Error joining queue:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle search timeout (60 seconds)
   */
  private handleSearchTimeout(): void {
    console.log('[MatchmakingService] Search timeout reached (60s)');
    this.leaveQueue();
    if (this.matchFoundCallback) {
      // Call with null to indicate timeout
      this.matchFoundCallback(null as any); // Signal timeout to UI
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(): Promise<boolean> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return false;
    }

    try {
      // Clear timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      // Remove from queue
      await firestore()
        .collection('matchmakingQueue')
        .doc(userId)
        .delete();

      this.stopMatchListening();
      this.stopMatchChecking();
      this.isInQueue = false;

      console.log('[MatchmakingService] ✓ Left queue');
      return true;
    } catch (error) {
      console.error('[MatchmakingService] Error leaving queue:', error);
      return false;
    }
  }

  /**
   * Start listening for match found
   */
  private startMatchListening(userId: string): void {
    if (this.queueListener) {
      this.queueListener();
    }

    const unsubscribe = firestore()
      .collection('matchmakingQueue')
      .doc(userId)
      .onSnapshot(snapshot => {
        if (!snapshot.exists) {
          console.log('[MatchmakingService] Removed from queue');
          this.stopMatchListening();
          return;
        }

        const data = snapshot.data() as QueueEntry;

        if (data.status === 'matched' && data.matchId) {
          console.log('[MatchmakingService] ✓ Match found:', data.matchId);
          this.handleMatchFound(data.matchId);
        }
      });

    this.queueListener = unsubscribe;
  }

  /**
   * Stop listening for matches
   */
  private stopMatchListening(): void {
    if (this.queueListener) {
      this.queueListener();
      this.queueListener = null;
    }
  }

  /**
   * Start periodic match checking
   */
  private startMatchChecking(): void {
    // Check every 2 seconds
    this.matchCheckInterval = setInterval(() => {
      this.tryMatchWithOpponent();
    }, 2000);
  }

  /**
   * Stop match checking
   */
  private stopMatchChecking(): void {
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
      this.matchCheckInterval = null;
    }
  }

  /**
   * Try to match with an opponent
   */
  private async tryMatchWithOpponent(): Promise<void> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return;
    }

    try {
      // Get current user's queue entry
      const myEntrySnapshot = await firestore()
        .collection('matchmakingQueue')
        .doc(userId)
        .get();

      if (!myEntrySnapshot.exists) {
        return;
      }

      const myEntry = myEntrySnapshot.data() as QueueEntry;

      if (myEntry.status !== 'waiting') {
        return;
      }

      // Find suitable opponent
      const opponentsSnapshot = await firestore()
        .collection('matchmakingQueue')
        .where('status', '==', 'waiting')
        .where('preferredMode', '==', myEntry.preferredMode)
        .orderBy('joinedAt')
        .limit(5)
        .get();

      if (opponentsSnapshot.empty) {
        return;
      }

      // Find best match (excluding self)
      const opponents = opponentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as QueueEntry & { id: string }))
        .filter(entry => entry.userId !== userId);

      if (opponents.length === 0) {
        return;
      }

      const opponent = this.selectBestOpponent(myEntry, opponents);

      // Try to create match
      await this.createMatch(myEntry, opponent);
    } catch (error) {
      console.error('[MatchmakingService] Error checking for match:', error);
    }
  }

  /**
   * Select best opponent based on skill level
   */
  private selectBestOpponent(
    myEntry: QueueEntry,
    opponents: Array<QueueEntry & { id: string }>
  ): QueueEntry & { id: string } {
    // For now, just pick the first one
    // In the future, can implement skill-based matching
    return opponents[0];
  }

  /**
   * Create a match between two players
   */
  private async createMatch(
    player1: QueueEntry,
    player2: QueueEntry & { id: string }
  ): Promise<void> {
    try {
      // Use Firestore transaction to ensure atomicity
      await firestore().runTransaction(async transaction => {
        const player1Ref = firestore().collection('matchmakingQueue').doc(player1.userId);
        const player2Ref = firestore().collection('matchmakingQueue').doc(player2.userId);

        const player1Doc = await transaction.get(player1Ref);
        const player2Doc = await transaction.get(player2Ref);

        // Check if both are still waiting
        if (!player1Doc.exists || !player2Doc.exists) {
          throw new Error('Player no longer in queue');
        }

        const p1Data = player1Doc.data() as QueueEntry;
        const p2Data = player2Doc.data() as QueueEntry;

        if (p1Data.status !== 'waiting' || p2Data.status !== 'waiting') {
          throw new Error('Player already matched');
        }

        // Create game
        const gameResult = await MultiplayerService.createGame({
          gameType: 'quickMatch',
          mode: player1.preferredMode,
        });

        if (!gameResult.success || !gameResult.gameId) {
          throw new Error('Failed to create game');
        }

        // Update both players' status
        transaction.update(player1Ref, {
          status: 'matched',
          matchId: gameResult.gameId,
        });

        transaction.update(player2Ref, {
          status: 'matched',
          matchId: gameResult.gameId,
        });

        console.log('[MatchmakingService] ✓ Match created:', gameResult.gameId);
      });
    } catch (error) {
      console.error('[MatchmakingService] Error creating match:', error);
    }
  }

  /**
   * Handle match found
   */
  private handleMatchFound(gameId: string): void {
    this.stopMatchListening();
    this.stopMatchChecking();
    this.isInQueue = false;

    if (this.matchFoundCallback) {
      this.matchFoundCallback(gameId);
    }
  }

  /**
   * Set match found callback
   */
  onMatchFound(callback: MatchFoundCallback): void {
    this.matchFoundCallback = callback;
  }

  /**
   * Check if in queue
   */
  isInMatchmakingQueue(): boolean {
    return this.isInQueue;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.leaveQueue();
    this.matchFoundCallback = null;
  }
}

// Export singleton instance
export default new MatchmakingServiceClass();
