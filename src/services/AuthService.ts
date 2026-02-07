/**
 * Authentication Service
 * Handles user authentication and profile management
 * Supports: Anonymous Auth, Google Sign-In, Offline Mode
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import FirebaseService from './FirebaseService';

interface UserProfile {
  userId: string;
  nickname: string;
  nicknameChangedAt: number | null;
  createdAt: number;
  selectedBackground?: string;
  // Google Sign-In fields
  authProvider: 'anonymous' | 'google';
  googleDisplayName?: string;
  googleEmail?: string;
  googlePhotoUrl?: string | null;
  linkedAt?: number;
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
        console.log('[AuthService] Loaded offline profile:', this.userProfile?.nickname);
      } else {
        // Create new offline profile
        const nickname = this.generateNickname();
        const offlineUserId = 'offline_' + Date.now();

        this.userProfile = {
          userId: offlineUserId,
          nickname,
          nicknameChangedAt: null,
          createdAt: Date.now(),
          authProvider: 'anonymous',
        };

        await AsyncStorage.setItem('offline_user_profile', JSON.stringify(this.userProfile));
        console.log('[AuthService] Created offline profile:', nickname);
      }
    } catch (error) {
      console.error('[AuthService] Offline initialization failed:', error);
      // Create minimal profile in memory
      this.userProfile = {
        userId: 'offline_temp',
        nickname: 'OfflinePilot',
        nicknameChangedAt: null,
        createdAt: Date.now(),
        authProvider: 'anonymous',
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

      console.log('[AuthService] Signed in anonymously:', user.uid);
      this.currentUser = user;

      // Create user profile if doesn't exist
      await this.createUserProfileIfNeeded(user.uid);

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign in with Google
   * If current user is anonymous, attempts to link the accounts to preserve data.
   * If linking fails (account already linked elsewhere), offers to switch accounts.
   */
  async signInWithGoogle(): Promise<{
    success: boolean;
    message?: string;
    conflict?: boolean;
  }> {
    if (FirebaseService.isOffline()) {
      return {success: false, message: 'Sign-in requires internet connection.'};
    }

    try {
      // Check if Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

      // Trigger Google Sign-In picker
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        return {success: false, message: 'Failed to get Google credentials.'};
      }

      // Create Firebase credential from Google ID token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      const currentUser = auth().currentUser;

      // If user is currently anonymous, try to link accounts
      if (currentUser && currentUser.isAnonymous) {
        return await this.linkAnonymousToGoogle(googleCredential);
      }

      // Otherwise, sign in directly with Google
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;
      this.currentUser = user;

      // Update profile with Google info
      await this.updateProfileWithGoogleInfo(user);

      console.log('[AuthService] Google Sign-In successful:', user.uid);
      return {success: true};
    } catch (error: any) {
      // Handle Google Sign-In specific errors
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {success: false, message: 'Sign-in cancelled.'};
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        return {success: false, message: 'Sign-in already in progress.'};
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          message: 'Google Play Services required. Please update.',
        };
      }

      console.error('[AuthService] Google Sign-In failed:', error);
      return {
        success: false,
        message: 'Sign-in failed. Please try again later.',
      };
    }
  }

  /**
   * Link anonymous account with Google credential
   * Preserves UID and all associated data
   */
  private async linkAnonymousToGoogle(
    googleCredential: FirebaseAuthTypes.AuthCredential,
  ): Promise<{success: boolean; message?: string; conflict?: boolean}> {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return {success: false, message: 'No current user to link.'};
    }

    try {
      // Attempt to link anonymous account with Google
      const userCredential = await currentUser.linkWithCredential(googleCredential);
      const user = userCredential.user;
      this.currentUser = user;

      // UID is preserved, update profile with Google info
      await this.updateProfileWithGoogleInfo(user);

      console.log('[AuthService] Anonymous account linked to Google:', user.uid);
      return {success: true};
    } catch (error: any) {
      // credential-already-in-use: Google account is linked to a different Firebase user
      if (
        error.code === 'auth/credential-already-in-use' ||
        error.code === 'auth/email-already-in-use'
      ) {
        console.warn(
          '[AuthService] Google account already linked to another user',
        );
        return {
          success: false,
          message:
            'This Google account is already linked to another player profile.',
          conflict: true,
        };
      }

      console.error('[AuthService] Account linking failed:', error);
      return {
        success: false,
        message: 'Failed to link account. Please try again.',
      };
    }
  }

  /**
   * Switch to existing Google account (when conflict detected)
   * Signs out current anonymous user and signs in with Google
   * The anonymous account data will be lost
   */
  async switchToGoogleAccount(): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      // Re-trigger Google Sign-In to get fresh credentials
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        return {success: false, message: 'Failed to get Google credentials.'};
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign out current anonymous user
      await auth().signOut();

      // Sign in with Google credential
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;
      this.currentUser = user;

      // Load the existing Google account's profile
      await this.loadUserProfile(user.uid);

      // Update with latest Google info
      await this.updateProfileWithGoogleInfo(user);

      console.log('[AuthService] Switched to Google account:', user.uid);
      return {success: true};
    } catch (error) {
      console.error('[AuthService] Switch to Google account failed:', error);
      return {
        success: false,
        message: 'Failed to switch account. Please try again.',
      };
    }
  }

  /**
   * Update user profile with Google account information
   */
  private async updateProfileWithGoogleInfo(
    user: FirebaseAuthTypes.User,
  ): Promise<void> {
    const googleInfo = user.providerData.find(
      (p) => p.providerId === 'google.com',
    );

    const updates: Partial<UserProfile> = {
      authProvider: 'google',
      googleDisplayName: googleInfo?.displayName || user.displayName || undefined,
      googleEmail: googleInfo?.email || user.email || undefined,
      googlePhotoUrl: googleInfo?.photoURL || user.photoURL || null,
      linkedAt: Date.now(),
    };

    try {
      // Update Firestore
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set(updates, {merge: true});

      // Update local profile
      if (this.userProfile) {
        this.userProfile = {...this.userProfile, ...updates};
      }

      // Save to local storage
      await AsyncStorage.setItem(
        'offline_user_profile',
        JSON.stringify(this.userProfile),
      );

      console.log('[AuthService] Profile updated with Google info');
    } catch (error) {
      console.error(
        '[AuthService] Failed to update profile with Google info:',
        error,
      );
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
        const user = auth().currentUser;
        const isGoogle =
          user?.providerData.some((p) => p.providerId === 'google.com') ??
          false;

        const profile: UserProfile = {
          userId,
          nickname,
          nicknameChangedAt: null,
          createdAt: Date.now(),
          authProvider: isGoogle ? 'google' : 'anonymous',
        };

        // If Google user, add Google info
        if (isGoogle && user) {
          const googleInfo = user.providerData.find(
            (p) => p.providerId === 'google.com',
          );
          profile.googleDisplayName =
            googleInfo?.displayName || user.displayName || undefined;
          profile.googleEmail =
            googleInfo?.email || user.email || undefined;
          profile.googlePhotoUrl =
            googleInfo?.photoURL || user.photoURL || null;
          profile.linkedAt = Date.now();
        }

        await firestore().collection('users').doc(userId).set(profile);
        console.log('[AuthService] User profile created:', nickname);

        this.userProfile = profile;
      } else {
        console.log('[AuthService] Profile exists, loading...');
        await this.loadUserProfile(userId);
      }
    } catch (error) {
      console.error('[AuthService] Failed to create user profile:', error);
      // Don't throw, allow app to continue with offline mode
      console.log('[AuthService] Creating fallback offline profile...');
      const nickname = this.generateNickname();
      this.userProfile = {
        userId,
        nickname,
        nicknameChangedAt: null,
        createdAt: Date.now(),
        authProvider: 'anonymous',
      };
      console.log('[AuthService] Fallback profile created:', nickname);
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
          this.userProfile = {
            ...data,
            authProvider: data.authProvider || 'anonymous',
          } as UserProfile;
          console.log(
            '[AuthService] User profile loaded:',
            this.userProfile.nickname,
          );
        } else {
          // Profile exists but is incomplete, recreate it
          console.log('[AuthService] Profile incomplete, recreating...');
          const nickname = this.generateNickname();
          const profile: UserProfile = {
            userId,
            nickname,
            nicknameChangedAt: null,
            createdAt: Date.now(),
            authProvider: 'anonymous',
          };
          await firestore().collection('users').doc(userId).set(profile);
          this.userProfile = profile;
          console.log('[AuthService] User profile recreated:', nickname);
        }

        // Sync to local storage
        await AsyncStorage.setItem(
          'offline_user_profile',
          JSON.stringify(this.userProfile),
        );
      }
    } catch (error) {
      console.error('[AuthService] Failed to load user profile:', error);
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

      console.log('[AuthService] Nickname updated:', newNickname);
      return { success: true };
    } catch (error) {
      console.error('[AuthService] Failed to update nickname:', error);
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
   * Get auth provider type
   */
  getAuthProvider(): 'anonymous' | 'google' | 'offline' {
    if (FirebaseService.isOffline() || !this.currentUser) {
      return 'offline';
    }
    return this.userProfile?.authProvider || 'anonymous';
  }

  /**
   * Check if user is linked to Google
   */
  isGoogleLinked(): boolean {
    if (!this.currentUser) {
      return false;
    }
    return this.currentUser.providerData.some(
      (p) => p.providerId === 'google.com',
    );
  }

  /**
   * Sign out (handles both Google and anonymous sign-out)
   * After sign-out, creates a new anonymous account
   */
  async signOut(): Promise<void> {
    try {
      // Sign out from Google if signed in with Google
      if (this.isGoogleLinked()) {
        try {
          await GoogleSignin.signOut();
        } catch (googleError) {
          console.warn('[AuthService] Google sign-out warning:', googleError);
        }
      }

      // Sign out from Firebase
      await auth().signOut();
      this.currentUser = null;
      this.userProfile = null;

      // Clear local profile cache
      await AsyncStorage.removeItem('offline_user_profile');

      console.log('[AuthService] Signed out');

      // Create new anonymous account
      try {
        await this.signInAnonymously();
        console.log('[AuthService] New anonymous account created after sign-out');
      } catch (anonError) {
        console.warn(
          '[AuthService] Failed to create anonymous account after sign-out:',
          anonError,
        );
        await this.initializeOfflineMode();
      }
    } catch (error) {
      console.error('[AuthService] Sign out failed:', error);
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
