/**
 * Google Sign-In Configuration
 * Configures @react-native-google-signin/google-signin for Firebase Auth integration
 */

import {GoogleSignin} from '@react-native-google-signin/google-signin';

// Web Client ID from Firebase Console > Authentication > Sign-in method > Google
// IMPORTANT: This MUST be the Web Client ID (client_type: 3) from google-services.json,
// NOT the Android Client ID (client_type: 1).
// The project_number in google-services.json is 262233081033, so the Web Client ID
// must start with "262233081033-". The previous value "845158931534-..." was from a
// different project and caused "http error" on Android.
//
// To get the correct value:
// 1. Open Firebase Console > Project Settings > airplane-battle-7a3fd
// 2. Ensure SHA-1 fingerprint 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25 is added
// 3. Enable Google Sign-In in Authentication > Sign-in method
// 4. Re-download google-services.json and find the client_id with client_type: 3
// 5. Replace the placeholder below with that value
const WEB_CLIENT_ID = '262233081033-blhdfeq6bf3s614oa5r6fou47p0irct3.apps.googleusercontent.com';

/**
 * Configure Google Sign-In
 * Must be called once during app initialization before any sign-in attempts
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  console.log('[GoogleSignIn] Configured with webClientId:', WEB_CLIENT_ID);
};

export default {
  configureGoogleSignIn,
  WEB_CLIENT_ID,
};
