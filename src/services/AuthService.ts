/**
 * Authentication Service
 * Handles user authentication and profile management
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirebaseService from './FirebaseService';

interface UserProfile {
  userId: string;
  nickname: string;
  nicknameChangedAt: number | null;
  createdAt: number;
  selectedBackground?: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: FirebaseAuthTypes.User | null = null;
  private userProfile: UserProfile | null = null;
  private authStateListener: (() => void) | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize auth service and set up listener
   * Supports offline mode using local storage
   */
  async initialize(): Promise<void> {
    console.log('[AuthService] Initializing...');

    // Check if running in offline mode
    if (FirebaseService.isOffline()) {
      console.log('[AuthService] Running in OFFLINE MODE');
      await this.initializeOfflineMode();
      return;
    }

    try {
      // Set up auth state listener
      this.authStateListener = auth().onAuthStateChanged(async (user) => {
        console.log('[AuthService] Auth state changed:', user ? user.uid : 'null');
        this.currentUser = user;

        if (user) {
          await this.createUserProfileIfNeeded(user.uid);
        } else {
          this.userProfile = null;
        }
      });

      // Try to sign in anonymously if not signed in (with 5s timeout)
      const user = auth().currentUser;
      if (!user) {
        await Promise.race([
          this.signInAnonymously().catch(err => {
            // Catch and suppress Firebase errors - they will be handled by timeout
            console.log('[AuthService] Firebase sign in attempt failed (expected in offline mode)');
            throw err;
          }),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 5000)
          )
        ]);
      } else {
        this.currentUser = user;
        await this.createUserProfileIfNeeded(user.uid);
      }
    } catch (error) {
      console.warn('[AuthService] Online initialization failed, falling back to offline mode');
      console.warn('[AuthService] Error:', error);
      await this.initializeOfflineMode();
    }
  }

  /**
   * Initialize offline mode using local storage
   */
  private async initializeOfflineMode(): Promise<void> {
    try {
      // Try to load existing offline profile
      const savedProfile = await AsyncStorage.getItem('offline_user_profile');

      if (savedProfile) {
        this.userProfile = JSON.parse(savedProfile);
        console.log('[AuthService] ✓ Loaded offline profile:', this.userProfile?.nickname);
      } else {
        // Create new offline profile
        const nickname = this.generateNickname();
        const offlineUserId = 'offline_' + Date.now();

        this.userProfile = {
          userId: offlineUserId,
          nickname,
          nicknameChangedAt: null,
          createdAt: Date.now(),
        };

        await AsyncStorage.setItem('offline_user_profile', JSON.stringify(this.userProfile));
        console.log('[AuthService] ✓ Created offline profile:', nickname);
      }
    } catch (error) {
      console.error('[AuthService] ❌ Offline initialization failed:', error);
      // Create minimal profile in memory
      this.userProfile = {
        userId: 'offline_temp',
        nickname: 'OfflinePilot',
        nicknameChangedAt: null,
        createdAt: Date.now(),
      };
    }
  }

  /**
   * Sign in anonymously
   */
  async signInAnonymously(): Promise<FirebaseAuthTypes.User> {
    try {
      console.log('[AuthService] Signing in anonymously...');
      const userCredential = await auth().signInAnonymously();
      const user = userCredential.user;

      console.log('[AuthService] ✓ Signed in anonymously:', user.uid);
      this.currentUser = user;

      // Create user profile if doesn't exist
      await this.createUserProfileIfNeeded(user.uid);

      return user;
    } catch (error) {
      // Don't log error here - it will be caught by the timeout handler
      // console.error('[AuthService] ❌ Anonymous sign in failed:', error);
      throw error;
    }
  }

  /**
   * Create user profile if it doesn't exist
   */
  private async createUserProfileIfNeeded(userId: string): Promise<void> {
    try {
      console.log('[AuthService] Checking profile for user:', userId);
      const userDoc = await firestore().collection('users').doc(userId).get();

      if (!userDoc.exists) {
        console.log('[AuthService] Creating new user profile...');

        const nickname = this.generateNickname();
        const profile: UserProfile = {
          userId,
          nickname,
          nicknameChangedAt: null,
          createdAt: Date.now(),
        };

        await firestore().collection('users').doc(userId).set(profile);
        console.log('[AuthService] ✓ User profile created:', nickname);

        this.userProfile = profile;
      } else {
        console.log('[AuthService] Profile exists, loading...');
        await this.loadUserProfile(userId);
      }
    } catch (error) {
      console.error('[AuthService] ❌ Failed to create user profile:', error);
      // Don't throw, allow app to continue with offline mode
      console.log('[AuthService] Creating fallback offline profile...');
      const nickname = this.generateNickname();
      this.userProfile = {
        userId,
        nickname,
        nicknameChangedAt: null,
        createdAt: Date.now(),
      };
      console.log('[AuthService] ✓ Fallback profile created:', nickname);
    }
  }

  /**
   * Load user profile from Firestore
   */
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();

      if (userDoc.exists) {
        const data = userDoc.data();
        // Validate that profile has required fields
        if (data && data.nickname && data.userId) {
          this.userProfile = data as UserProfile;
          console.log('[AuthService] ✓ User profile loaded:', this.userProfile.nickname);
        } else {
          // Profile exists but is incomplete, recreate it
          console.log('[AuthService] Profile incomplete, recreating...');
          const nickname = this.generateNickname();
          const profile: UserProfile = {
            userId,
            nickname,
            nicknameChangedAt: null,
            createdAt: Date.now(),
          };
          await firestore().collection('users').doc(userId).set(profile);
          this.userProfile = profile;
          console.log('[AuthService] ✓ User profile recreated:', nickname);
        }
      }
    } catch (error) {
      console.error('[AuthService] ❌ Failed to load user profile:', error);
    }
  }

  /**
   * Generate random nickname
   */
  private generateNickname(): string {
    const adjectives = [
      'Swift', 'Brave', 'Mighty', 'Silent', 'Thunder', 'Shadow', 'Storm', 'Iron',
      'Eagle', 'Ghost', 'Steel', 'Phantom', 'Cobra', 'Viper', 'Falcon', 'Hawk',
    ];
    const nouns = [
      'Pilot', 'Ace', 'Wing', 'Hunter', 'Warrior', 'Knight', 'Fighter', 'Striker',
      'Commander', 'Captain', 'Leader', 'Master', 'Legend', 'Hero', 'Champion',
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);

    return `${adjective}${noun}${number}`;
  }

  /**
   * Update user nickname (supports offline mode)
   */
  async updateNickname(newNickname: string): Promise<{ success: boolean; message?: string }> {
    if (!this.userProfile) {
      return { success: false, message: 'Not signed in' };
    }

    if (!newNickname || newNickname.trim().length === 0) {
      return { success: false, message: 'Nickname cannot be empty' };
    }

    if (newNickname.length > 20) {
      return { success: false, message: 'Nickname too long (max 20 characters)' };
    }

    // Check cooldown period (30 days)
    if (this.userProfile.nicknameChangedAt) {
      const daysSinceLastChange = (Date.now() - this.userProfile.nicknameChangedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceLastChange < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceLastChange);
        return {
          success: false,
          message: `You can change your nickname in ${daysRemaining} days`,
        };
      }
    }

    try {
      // Update in Firebase if online
      if (!FirebaseService.isOffline() && this.currentUser) {
        await firestore().collection('users').doc(this.currentUser.uid).update({
          nickname: newNickname.trim(),
          nicknameChangedAt: Date.now(),
        });
      }

      // Update local profile
      this.userProfile.nickname = newNickname.trim();
      this.userProfile.nicknameChangedAt = Date.now();

      // Save to local storage
      await AsyncStorage.setItem('offline_user_profile', JSON.stringify(this.userProfile));

      console.log('[AuthService] ✓ Nickname updated:', newNickname);
      return { success: true };
    } catch (error) {
      console.error('[AuthService] ❌ Failed to update nickname:', error);
      return { success: false, message: 'Failed to update nickname' };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): FirebaseAuthTypes.User | null {
    return this.currentUser;
  }

  /**
   * Get user profile
   */
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  /**
   * Get user ID
   */
  getUserId(): string | null {
    // In offline mode, currentUser is null but userProfile has userId
    return this.currentUser?.uid || this.userProfile?.userId || null;
  }

  /**
   * Get user nickname
   */
  getNickname(): string {
    return this.userProfile?.nickname || 'Unknown Pilot';
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await auth().signOut();
      this.currentUser = null;
      this.userProfile = null;
      console.log('[AuthService] ✓ Signed out');
    } catch (error) {
      console.error('[AuthService] ❌ Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Clean up
   */
  cleanup(): void {
    if (this.authStateListener) {
      this.authStateListener();
      this.authStateListener = null;
    }
  }
}

export default AuthService.getInstance();
