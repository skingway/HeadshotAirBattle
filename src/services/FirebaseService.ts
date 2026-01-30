/**
 * Firebase Service - Firebase initialization and utilities
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';

class FirebaseService {
  private static instance: FirebaseService;
  private isInitialized: boolean = false;
  private offlineMode: boolean = false;

  private constructor() {}

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Initialize Firebase
   * Falls back to offline mode if network/Firebase unavailable
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[FirebaseService] Already initialized');
      return;
    }

    try {
      console.log('[FirebaseService] Initializing...');

      // Firebase is automatically initialized by @react-native-firebase
      // We just need to verify the services are available

      // Test Auth
      const authInstance = auth();
      console.log('[FirebaseService] ✓ Auth available');

      // Test Firestore
      const firestoreInstance = firestore();
      console.log('[FirebaseService] ✓ Firestore available');

      // Test Realtime Database
      const databaseInstance = database();
      console.log('[FirebaseService] ✓ Realtime Database available');

      this.isInitialized = true;
      this.offlineMode = false;
      console.log('[FirebaseService] ✅ Firebase initialized successfully');
    } catch (error) {
      console.error('[FirebaseService] ❌ Firebase initialization failed:', error);
      console.log('[FirebaseService] 🔄 Switching to OFFLINE MODE');
      this.offlineMode = true;
      this.isInitialized = true; // Mark as initialized in offline mode
      // Don't throw error, allow app to continue in offline mode
    }
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth() {
    return auth();
  }

  /**
   * Get Firestore instance
   */
  getFirestore() {
    return firestore();
  }

  /**
   * Get Realtime Database instance
   */
  getDatabase() {
    return database();
  }

  /**
   * Check if Firebase is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if running in offline mode
   */
  isOffline(): boolean {
    return this.offlineMode;
  }
}

export default FirebaseService.getInstance();
