/**
 * Google Sign-In Configuration
 * Configures @react-native-google-signin/google-signin for Firebase Auth integration
 */

import {GoogleSignin} from '@react-native-google-signin/google-signin';

// Web Client ID from Firebase Console > Authentication > Sign-in method > Google
// This must be replaced with the actual Web Client ID from the Firebase project
const WEB_CLIENT_ID = '845158931534-q8pjkaamg6fkc551ppbfm4h2gjp7ctsi.apps.googleusercontent.com';

/**
 * Configure Google Sign-In
 * Must be called once during app initialization before any sign-in attempts
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  console.log('[GoogleSignIn] Configured');
};

export default {
  configureGoogleSignIn,
  WEB_CLIENT_ID,
};
