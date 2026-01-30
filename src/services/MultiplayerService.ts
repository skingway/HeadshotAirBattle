/**
 * Multiplayer Service
 * Core service for online PvP games - handles game state synchronization
 */

import database from '@react-native-firebase/database';
import AuthService from './AuthService';
import {withTimeout} from '../utils/promiseTimeout';

export interface GamePlayer {
  id: string;
  nickname: string;
  ready: boolean;
  connected: boolean;
  board?: {
    airplanes: Array<{
      id: string;
      headRow: number;
      headCol: number;
      direction: string;
    }>;
  };
  attacks: Array<{
    row: number;
    col: number;
    result: string;
    timestamp: number;
  }>;
  stats: {
    hits: number;
    misses: number;
    kills: number;
  };
}

export interface GameState {
  gameId: string;
  gameType: 'quickMatch' | 'privateRoom';
  roomCode?: string;
  status: 'waiting' | 'deploying' | 'battle' | 'finished';
  mode: string;
  boardSize: number;
  airplaneCount: number;
  createdAt: number;
  player1: GamePlayer | null;
  player2: GamePlayer | null;
  currentTurn: string | null;
  turnStartedAt: number | null;
  winner: string | null;
  completedAt?: number;
}

type StateChangeCallback = (state: GameState) => void;

class MultiplayerServiceClass {
  private currentGame: (GameState & { role: 'player1' | 'player2' }) | null = null;
  private gameListener: (() => void) | null = null;
  private stateListeners: StateChangeCallback[] = [];
  private reconnectAttempts: number = 0;
  private presenceRef: any = null;

  /**
   * Initialize multiplayer service
   */
  init(): boolean {
    console.log('[MultiplayerService] ✓ Initialized');
    return true;
  }

  /**
   * Add state change listener
   */
  onStateChange(callback: StateChangeCallback): void {
    this.stateListeners.push(callback);
  }

  /**
   * Remove state change listener
   */
  offStateChange(callback: StateChangeCallback): void {
    this.stateListeners = this.stateListeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all state listeners
   */
  private notifyStateChange(state: GameState): void {
    this.stateListeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[MultiplayerService] Listener error:', error);
      }
    });
  }

  /**
   * Generate unique game ID
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new online game
   */
  async createGame(options: {
    gameType: 'quickMatch' | 'privateRoom';
    roomCode?: string;
    mode?: string;
    boardSize?: number;
    airplaneCount?: number;
  }): Promise<{ success: boolean; gameId?: string; error?: string }> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return { success: false, error: 'Not signed in' };
    }

    try {
      const userProfile = AuthService.getUserProfile();
      const gameId = this.generateGameId();

      const gameData: GameState = {
        gameId,
        gameType: options.gameType,
        roomCode: options.roomCode,
        status: 'waiting',
        mode: options.mode || 'standard',
        boardSize: options.boardSize || 10,
        airplaneCount: options.airplaneCount || 3,
        createdAt: Date.now(),
        player1: {
          id: userId,
          nickname: userProfile?.nickname || 'Player 1',
          ready: false,
          connected: true,
          attacks: [],
          stats: { hits: 0, misses: 0, kills: 0 },
        },
        player2: null,
        currentTurn: null,
        turnStartedAt: null,
        winner: null,
      };

      // Save to Firebase with timeout
      console.log('[MultiplayerService] Saving game to Firebase...');
      await withTimeout(
        database().ref(`activeGames/${gameId}`).set(gameData),
        10000,
        'Failed to create game: Connection timeout. Please check your internet connection.'
      );

      this.currentGame = {
        ...gameData,
        role: 'player1',
      };

      // Set up presence
      this.setupPresence(gameId, 'player1');

      // Listen for game updates
      this.listenToGame(gameId);

      console.log('[MultiplayerService] ✓ Game created:', gameId);
      return { success: true, gameId };
    } catch (error: any) {
      console.error('[MultiplayerService] Error creating game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join an existing game
   */
  async joinGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return { success: false, error: 'Not signed in' };
    }

    try {
      console.log('[MultiplayerService] Looking for game...');
      const gameRef = database().ref(`activeGames/${gameId}`);
      const snapshot = await withTimeout(
        gameRef.once('value'),
        10000,
        'Failed to join game: Connection timeout. Please check your internet connection.'
      );

      if (!snapshot.exists()) {
        return { success: false, error: 'Game not found' };
      }

      const gameData = snapshot.val() as GameState;

      if (gameData.status !== 'waiting') {
        return { success: false, error: 'Game already started' };
      }

      // Check if player2 slot is taken (like web version's guestId check)
      if (gameData.player2) {
        // Check if player2 is the current user (reconnection scenario)
        if (gameData.player2.id === userId) {
          console.log('[MultiplayerService] Reconnecting as player2');
          this.currentGame = {
            ...gameData,
            role: 'player2',
          };
          this.setupPresence(gameId, 'player2');
          this.listenToGame(gameId);
          return { success: true };
        }

        return { success: false, error: 'Game is full' };
      }

      // Check if user is trying to join their own game
      if (gameData.player1?.id === userId) {
        return { success: false, error: 'Cannot join your own game' };
      }

      const userProfile = AuthService.getUserProfile();

      // Join as player2
      console.log('[MultiplayerService] Joining as player2...');
      await withTimeout(
        gameRef.child('player2').set({
          id: userId,
          nickname: userProfile?.nickname || 'Player 2',
          ready: false,
          connected: true,
          attacks: [],
          stats: { hits: 0, misses: 0, kills: 0 },
        }),
        10000,
        'Failed to join game: Connection timeout'
      );

      // Update status to deploying
      await withTimeout(
        gameRef.child('status').set('deploying'),
        10000,
        'Failed to update game status'
      );

      this.currentGame = {
        ...gameData,
        player2: {
          id: userId,
          nickname: userProfile?.nickname || 'Player 2',
          ready: false,
          connected: true,
          attacks: [],
          stats: { hits: 0, misses: 0, kills: 0 },
        },
        role: 'player2',
      };

      // Set up presence
      this.setupPresence(gameId, 'player2');

      // Listen for game updates
      this.listenToGame(gameId);

      console.log('[MultiplayerService] ✓ Joined game:', gameId);
      return { success: true };
    } catch (error: any) {
      console.error('[MultiplayerService] Error joining game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Listen to game state changes
   */
  private listenToGame(gameId: string): void {
    // Remove previous listener if exists
    if (this.gameListener) {
      this.gameListener();
      this.gameListener = null;
    }

    const gameRef = database().ref(`activeGames/${gameId}`);

    const onValueChange = gameRef.on('value', snapshot => {
      if (!snapshot.exists()) {
        console.log('[MultiplayerService] Game deleted');
        this.handleGameDeleted();
        return;
      }

      const gameData = snapshot.val() as GameState;
      console.log('[MultiplayerService] Game state updated:', gameData.status);

      // Update current game
      if (this.currentGame) {
        this.currentGame = {
          ...gameData,
          role: this.currentGame.role,
        };
      }

      // Notify listeners
      this.notifyStateChange(gameData);
    });

    // Store cleanup function
    this.gameListener = () => {
      gameRef.off('value', onValueChange);
    };
  }

  /**
   * Setup presence detection
   */
  private setupPresence(gameId: string, role: 'player1' | 'player2'): void {
    const connectedRef = database().ref('.info/connected');
    const playerRef = database().ref(`activeGames/${gameId}/${role}/connected`);

    connectedRef.on('value', snapshot => {
      if (snapshot.val() === true) {
        // Set connected to true
        playerRef.set(true);

        // When disconnect, set to false
        playerRef.onDisconnect().set(false);

        console.log('[MultiplayerService] Presence setup complete');
      }
    });

    this.presenceRef = connectedRef;
  }

  /**
   * Handle game deleted
   */
  private handleGameDeleted(): void {
    console.log('[MultiplayerService] Game was deleted');
    this.cleanup();
  }

  /**
   * Update player ready status
   */
  async setReady(ready: boolean): Promise<boolean> {
    if (!this.currentGame) {
      return false;
    }

    try {
      const { gameId, role } = this.currentGame;
      await database().ref(`activeGames/${gameId}/${role}/ready`).set(ready);
      console.log('[MultiplayerService] Ready status updated:', ready);
      return true;
    } catch (error) {
      console.error('[MultiplayerService] Error updating ready status:', error);
      return false;
    }
  }

  /**
   * Submit deployed board
   */
  async submitBoard(board: {
    airplanes: Array<{
      id: string;
      headRow: number;
      headCol: number;
      direction: string;
    }>;
  }): Promise<boolean> {
    if (!this.currentGame) {
      return false;
    }

    try {
      const { gameId, role } = this.currentGame;
      await database().ref(`activeGames/${gameId}/${role}/board`).set(board);
      await database().ref(`activeGames/${gameId}/${role}/ready`).set(true);
      console.log('[MultiplayerService] Board submitted');
      return true;
    } catch (error) {
      console.error('[MultiplayerService] Error submitting board:', error);
      return false;
    }
  }

  /**
   * Make an attack
   */
  async attack(row: number, col: number, result: string): Promise<boolean> {
    if (!this.currentGame) {
      return false;
    }

    try {
      const { gameId, role } = this.currentGame;
      const opponentRole = role === 'player1' ? 'player2' : 'player1';

      const attackData = {
        row,
        col,
        result,
        timestamp: Date.now(),
      };

      // Add attack to player's attack list
      const attacksRef = database().ref(`activeGames/${gameId}/${role}/attacks`);
      await attacksRef.push(attackData);

      // Update stats
      const statsRef = database().ref(`activeGames/${gameId}/${role}/stats`);
      const statsSnapshot = await statsRef.once('value');
      const stats = statsSnapshot.val() || { hits: 0, misses: 0, kills: 0 };

      if (result === 'hit') {
        stats.hits += 1;
      } else if (result === 'miss') {
        stats.misses += 1;
      } else if (result === 'kill') {
        stats.hits += 1;
        stats.kills += 1;
      }

      await statsRef.set(stats);

      // Get opponent's userId and switch turn to opponent
      const gameRef = database().ref(`activeGames/${gameId}`);
      const gameSnapshot = await gameRef.once('value');
      const gameData = gameSnapshot.val();
      const opponentUserId = gameData[opponentRole]?.id;

      if (opponentUserId) {
        await database().ref(`activeGames/${gameId}/currentTurn`).set(opponentUserId);
        await database().ref(`activeGames/${gameId}/turnStartedAt`).set(Date.now());
      }

      console.log('[MultiplayerService] Attack submitted:', attackData);
      return true;
    } catch (error) {
      console.error('[MultiplayerService] Error submitting attack:', error);
      return false;
    }
  }

  /**
   * End game
   */
  async endGame(winner: string): Promise<boolean> {
    if (!this.currentGame) {
      return false;
    }

    try {
      const { gameId } = this.currentGame;
      await database().ref(`activeGames/${gameId}`).update({
        status: 'finished',
        winner,
        completedAt: Date.now(),
      });

      console.log('[MultiplayerService] Game ended, winner:', winner);
      return true;
    } catch (error) {
      console.error('[MultiplayerService] Error ending game:', error);
      return false;
    }
  }

  /**
   * Leave current game
   */
  async leaveGame(): Promise<void> {
    if (!this.currentGame) {
      return;
    }

    // Log call stack to see who called leaveGame
    console.log('[MultiplayerService] leaveGame called');
    console.log('[MultiplayerService] Call stack:', new Error().stack);

    try {
      const { gameId, role } = this.currentGame;

      // Mark player as disconnected
      await database().ref(`activeGames/${gameId}/${role}/connected`).set(false);

      console.log('[MultiplayerService] Left game');
    } catch (error) {
      console.error('[MultiplayerService] Error leaving game:', error);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Get current game
   */
  getCurrentGame(): (GameState & { role: 'player1' | 'player2' }) | null {
    return this.currentGame;
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    if (this.gameListener) {
      this.gameListener();
      this.gameListener = null;
    }

    if (this.presenceRef) {
      this.presenceRef.off();
      this.presenceRef = null;
    }

    this.currentGame = null;
    this.stateListeners = [];
    this.reconnectAttempts = 0;

    console.log('[MultiplayerService] Cleaned up');
  }
}

// Export singleton instance
export default new MultiplayerServiceClass();
