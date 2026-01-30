/**
 * Firebase Configuration for React Native
 *
 * NOTE: For React Native Firebase, the actual configuration is done in native files:
 * - Android: android/app/google-services.json
 * - iOS: ios/GoogleService-Info.plist
 *
 * This file serves as a reference and helper for Firebase initialization.
 *
 * To set up Firebase:
 * 1. Download google-services.json from Firebase Console
 * 2. Place it in android/app/google-services.json
 * 3. Download GoogleService-Info.plist for iOS
 * 4. Place it in ios/GoogleService-Info.plist
 * 5. Run: cd android && ./gradlew clean
 * 6. Run: cd ios && pod install
 */

/**
 * Firebase Project Configuration (Reference Only)
 * Actual config is loaded from native files
 */
export const FIREBASE_CONFIG = {
  projectId: 'airplane-battle-7a3fd',
  appId: '1:262233081033:web:9577f817602f735d1ab918',
  databaseURL: 'https://airplane-battle-7a3fd-default-rtdb.firebaseio.com',
  messagingSenderId: '262233081033',
};

/**
 * Firebase service instances will be imported from @react-native-firebase
 * Example usage:
 *
 * import auth from '@react-native-firebase/auth';
 * import firestore from '@react-native-firebase/firestore';
 * import database from '@react-native-firebase/database';
 *
 * // Use them directly:
 * auth().signInAnonymously();
 * firestore().collection('users').doc(userId).set(data);
 * database().ref('games').push(gameData);
 */

export default {
  config: FIREBASE_CONFIG,
};
