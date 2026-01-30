/**
 * Room Service
 * Handles private room creation and joining
 */

import database from '@react-native-firebase/database';
import AuthService from './AuthService';
import MultiplayerService from './MultiplayerService';
import {withTimeout} from '../utils/promiseTimeout';

interface RoomCode {
  gameId: string;
  hostId: string;
  createdAt: number;
  expiresAt: number;
}

class RoomServiceClass {
  /**
   * Generate 6-character room code
   */
  private generateRoomCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  /**
   * Create a private room
   */
  async createRoom(options: {
    mode?: string;
    boardSize?: number;
    airplaneCount?: number;
  } = {}): Promise<{ success: boolean; roomCode?: string; gameId?: string; error?: string }> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return { success: false, error: 'Not signed in' };
    }

    try {
      // Clean up any previous room data for this user (like web version)
      console.log('[RoomService] Cleaning up previous room data...');
      try {
        const userRoomsRef = database().ref('activeGames');
        const userRoomsSnapshot = await withTimeout(
          userRoomsRef.orderByChild('player1/id').equalTo(userId).once('value'),
          5000,
          'Timeout cleaning user rooms'
        );

        if (userRoomsSnapshot.exists()) {
          const games = userRoomsSnapshot.val();
          for (const gameId in games) {
            await database().ref(`activeGames/${gameId}`).remove();
            console.log('[RoomService] Cleaned up old game:', gameId);
          }
        }
      } catch (e) {
        console.log('[RoomService] No previous rooms to clean');
      }

      // Generate unique room code
      let roomCode = this.generateRoomCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure room code is unique
      console.log('[RoomService] Generating unique room code...');
      while (attempts < maxAttempts) {
        try {
          const existingRoom = await withTimeout(
            database().ref(`roomCodes/${roomCode}`).once('value'),
            5000,
            'Timeout checking room code'
          );

          if (!existingRoom.exists()) {
            break;
          }

          roomCode = this.generateRoomCode();
          attempts++;
        } catch (error: any) {
          console.error('[RoomService] Error checking room code:', error);
          return { success: false, error: 'Network error: ' + error.message };
        }
      }

      if (attempts >= maxAttempts) {
        return { success: false, error: 'Failed to generate unique room code' };
      }

      // Create game
      const gameResult = await MultiplayerService.createGame({
        gameType: 'privateRoom',
        roomCode,
        mode: options.mode || 'standard',
        boardSize: options.boardSize,
        airplaneCount: options.airplaneCount,
      });

      if (!gameResult.success || !gameResult.gameId) {
        return { success: false, error: 'Failed to create game' };
      }

      const gameId = gameResult.gameId;

      // Create room code mapping
      const roomData: RoomCode = {
        gameId,
        hostId: userId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000, // Expire after 1 hour
      };

      console.log('[RoomService] Saving room code mapping...');
      await withTimeout(
        database().ref(`roomCodes/${roomCode}`).set(roomData),
        10000,
        'Failed to save room code: Connection timeout'
      );

      // Set up auto-delete after expiry
      await withTimeout(
        database().ref(`roomCodes/${roomCode}`).onDisconnect().remove(),
        5000,
        'Failed to setup auto-delete'
      );

      console.log('[RoomService] ✓ Room created:', roomCode);
      return { success: true, roomCode, gameId };
    } catch (error: any) {
      console.error('[RoomService] Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join a private room by code
   */
  async joinRoom(roomCode: string): Promise<{ success: boolean; gameId?: string; error?: string }> {
    const userId = AuthService.getUserId();
    if (!userId) {
      return { success: false, error: 'Not signed in' };
    }

    try {
      // Normalize room code (uppercase, trim)
      const normalizedCode = roomCode.toUpperCase().trim();

      // Check if room code exists
      console.log('[RoomService] Looking up room code...');
      const roomSnapshot = await withTimeout(
        database().ref(`roomCodes/${normalizedCode}`).once('value'),
        10000,
        'Failed to find room: Connection timeout. Please check your internet connection.'
      );

      if (!roomSnapshot.exists()) {
        return { success: false, error: 'Room not found' };
      }

      const roomData = roomSnapshot.val() as RoomCode;

      // Check if room has expired
      if (roomData.expiresAt < Date.now()) {
        // Clean up expired room
        await database().ref(`roomCodes/${normalizedCode}`).remove();
        return { success: false, error: 'Room has expired' };
      }

      // Join the game
      const joinResult = await MultiplayerService.joinGame(roomData.gameId);

      if (!joinResult.success) {
        return { success: false, error: joinResult.error || 'Failed to join game' };
      }

      console.log('[RoomService] ✓ Joined room:', normalizedCode);
      return { success: true, gameId: roomData.gameId };
    } catch (error: any) {
      console.error('[RoomService] Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomCode: string): Promise<boolean> {
    try {
      await database().ref(`roomCodes/${roomCode}`).remove();
      console.log('[RoomService] ✓ Room deleted:', roomCode);
      return true;
    } catch (error) {
      console.error('[RoomService] Error deleting room:', error);
      return false;
    }
  }

  /**
   * Get room info
   */
  async getRoomInfo(roomCode: string): Promise<RoomCode | null> {
    try {
      const roomSnapshot = await database()
        .ref(`roomCodes/${roomCode}`)
        .once('value');

      if (!roomSnapshot.exists()) {
        return null;
      }

      return roomSnapshot.val() as RoomCode;
    } catch (error) {
      console.error('[RoomService] Error getting room info:', error);
      return null;
    }
  }

  /**
   * Validate room code format
   */
  isValidRoomCode(roomCode: string): boolean {
    return /^[A-Z0-9]{6}$/.test(roomCode.toUpperCase().trim());
  }
}

// Export singleton instance
export default new RoomServiceClass();
