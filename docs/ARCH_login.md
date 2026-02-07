# Google Sign-In Technical Architecture

## 1. Current Auth Architecture Analysis

### Existing Implementation
- **AuthService** (`src/services/AuthService.ts`): Singleton service, handles anonymous auth via `@react-native-firebase/auth`
- **FirebaseService** (`src/services/FirebaseService.ts`): Firebase initialization, offline mode detection
- **User data storage**: Firestore `users` collection, keyed by Firebase UID
- **Offline support**: AsyncStorage fallback with `offline_user_profile` key
- **UserProfile interface**: `{ userId, nickname, nicknameChangedAt, createdAt, selectedBackground? }`

### Data Dependencies on Auth UID
| Service | Firestore Path | Uses `AuthService.getUserId()` |
|---------|---------------|-------------------------------|
| StatisticsService | `users/{uid}` (merged) | Yes - read/write stats |
| StatisticsService | `gameHistory` (userId field) | Yes - save/query history |
| StatisticsService | `leaderboard_{type}` (local) | Yes - rank query |
| AchievementService | Local AsyncStorage only | No (local only) |
| SkinService | Local AsyncStorage only | No (local only) |
| RoomService/Multiplayer | `games/{gameId}` | Yes - online multiplayer |

### Key Observation
When user transitions from anonymous to Google Sign-In, the Firebase UID changes. All Firestore data associated with the old anonymous UID must be migrated to the new Google UID.

---

## 2. Library Selection

### Recommended: `@react-native-google-signin/google-signin` v13+

**Justification:**
- Official Google-maintained React Native library
- Built-in Firebase Auth integration via `GoogleSignin.getTokens()` + `firebase.auth.GoogleAuthProvider`
- Supports both Android and iOS
- Well-maintained, large community
- Compatible with `@react-native-firebase/auth` v23.x

**Alternative considered:** `expo-auth-session` -- rejected because project is bare React Native, not Expo.

### Installation
```bash
npm install @react-native-google-signin/google-signin
```

---

## 3. Firebase Console Configuration

### Prerequisites (to be done in Firebase Console)
1. **Enable Google Sign-In provider** in Firebase Console > Authentication > Sign-in method
2. **Android**: Download updated `google-services.json` (will contain OAuth client info)
3. **iOS**: Download `GoogleService-Info.plist` and add to Xcode project
4. **Get Web Client ID** from Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration > Web client ID

### Android Configuration

#### `android/app/build.gradle`
```gradle
// No additional dependencies needed - @react-native-google-signin handles this via autolinking
```

#### `android/app/google-services.json`
Must be re-downloaded from Firebase Console after enabling Google Sign-In. The `oauth_client` array (currently empty) needs to be populated with:
- Type 3 (Web client) OAuth client for `credential` usage
- Type 1 (Android client) with the SHA-1 fingerprint

#### SHA-1 Fingerprint Setup
```bash
# Debug keystore (existing at android/app/debug.keystore)
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android

# Release keystore (needs to be created for production)
keytool -list -v -keystore <release-keystore-path> -alias <alias>
```
Both SHA-1 fingerprints must be registered in Firebase Console.

### iOS Configuration

#### `ios/HeadshotAirBattle/Info.plist` -- Add URL Scheme
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.{REVERSED_CLIENT_ID}</string>
    </array>
  </dict>
</array>
```
The `REVERSED_CLIENT_ID` value comes from `GoogleService-Info.plist`.

#### `ios/Podfile` -- No changes needed
The library uses autolinking; `pod install` will pick it up.

---

## 4. Code Architecture Design

### 4.1 Updated AuthService

The existing `AuthService.ts` will be extended (not replaced) with Google Sign-In capabilities.

#### New UserProfile Interface
```typescript
interface UserProfile {
  userId: string;
  nickname: string;
  nicknameChangedAt: number | null;
  createdAt: number;
  selectedBackground?: string;
  // New fields for Google Sign-In
  authProvider: 'anonymous' | 'google';
  email?: string;
  displayName?: string;
  photoURL?: string;
}
```

#### New Methods to Add to AuthService

```typescript
// Google Sign-In
async signInWithGoogle(): Promise<FirebaseAuthTypes.User>

// Link anonymous account to Google (data migration)
async linkAnonymousToGoogle(): Promise<{ success: boolean; message?: string }>

// Sign out (enhanced to handle Google sign-out)
async signOut(): Promise<void>

// Check current auth provider type
getAuthProvider(): 'anonymous' | 'google' | 'offline'

// Check if user is linked to Google
isGoogleLinked(): boolean
```

### 4.2 Google Sign-In Flow

```
[User taps "Sign In with Google"]
         |
         v
[GoogleSignin.configure({ webClientId })]
         |
         v
[GoogleSignin.signIn()] -- Gets idToken
         |
         v
[Is user currently anonymous?]
    |              |
   Yes             No
    |              |
    v              v
[Link anonymous   [Sign in directly
 account to        with Google
 Google via        credential]
 linkWithCredential]
    |              |
    v              v
[UID preserved!   [New UID, fresh
 All data kept]    account]
         |
         v
[Update UserProfile in Firestore]
[Update local AsyncStorage]
```

### 4.3 Anonymous-to-Google Account Linking (Data Migration)

**Critical path**: When an anonymous user signs in with Google, we use Firebase's `linkWithCredential` to preserve the same UID. This means:
- All Firestore data (stats, game history) remains valid
- No data migration needed if linking succeeds

**Fallback**: If `linkWithCredential` fails (e.g., Google account already linked to another Firebase account):
1. Record the old anonymous UID's data
2. Sign in with Google (new UID)
3. Migrate data from old UID to new UID in Firestore
4. Delete old anonymous user data

```typescript
async migrateAnonymousData(oldUid: string, newUid: string): Promise<void> {
  // 1. Copy users/{oldUid} -> users/{newUid} (merge)
  // 2. Update gameHistory documents where userId == oldUid
  // 3. Copy offline local data (AsyncStorage) to new keys
  // 4. Delete users/{oldUid} document
}
```

### 4.4 Google Sign-In Configuration Module

**New file**: `src/config/GoogleSignInConfig.ts`

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '<WEB_CLIENT_ID_FROM_FIREBASE>', // Must match Firebase project
    offlineAccess: false,
  });
};
```

---

## 5. UI Changes

### 5.1 ProfileScreen (`src/screens/ProfileScreen.tsx`)

**Changes:**
- Add Google Sign-In button (shown when user is anonymous)
- Show Google account info (email, avatar) when signed in with Google
- Add "Sign Out" button (only for Google users; anonymous users don't sign out)
- Replace placeholder avatar with Google profile picture

```
[Profile Screen]
  |-- Avatar Section
  |   |-- If Google: Show Google profile picture
  |   |-- If Anonymous: Show default airplane icon
  |
  |-- Account Section
  |   |-- If Anonymous: Show "Sign in with Google" button
  |   |-- If Google: Show email, "Linked with Google" badge
  |
  |-- Nickname Section (unchanged)
  |-- Statistics Section (unchanged)
  |-- Quick Actions (unchanged)
  |
  |-- If Google: "Sign Out" button
```

### 5.2 SettingsScreen (`src/screens/SettingsScreen.tsx`)

**Changes:**
- Add "Account" section with login status
- Add Sign In / Sign Out button

### 5.3 MainMenuScreen (`src/screens/MainMenuScreen.tsx`)

**Changes:**
- No changes required for MVP
- (Optional) Show user avatar in corner if Google-signed-in

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `src/services/AuthService.ts` | Add Google Sign-In methods, account linking, enhanced UserProfile |
| `src/services/FirebaseService.ts` | No changes needed |
| `src/config/GoogleSignInConfig.ts` | **NEW** - Google Sign-In configuration |
| `src/screens/ProfileScreen.tsx` | Add Google Sign-In button, Google profile display, Sign Out |
| `src/screens/SettingsScreen.tsx` | Add Account section with sign-in status |
| `App.tsx` | Initialize Google Sign-In config in `initializeApp()` |
| `package.json` | Add `@react-native-google-signin/google-signin` dependency |
| `android/app/google-services.json` | Re-download from Firebase Console with Google provider enabled |
| `ios/HeadshotAirBattle/Info.plist` | Add URL scheme for Google Sign-In callback |
| `ios/Podfile` | Run `pod install` (auto-linked) |

---

## 7. Android vs iOS Configuration Differences

| Item | Android | iOS |
|------|---------|-----|
| Config file | `google-services.json` | `GoogleService-Info.plist` |
| SHA-1 fingerprint | Required (debug + release) | Not needed |
| URL Scheme | Not needed | Required in Info.plist |
| Native setup | Automatic via google-services plugin | `pod install` |
| Special permissions | None | None |

---

## 8. Error Handling & Edge Cases

1. **No network**: Google Sign-In requires network. Show "No internet connection" alert.
2. **User cancels**: `GoogleSignin.signIn()` throws `SIGN_IN_CANCELLED` -- silently ignore.
3. **Account already linked**: If Google account is already used by another Firebase user, fall back to data migration flow.
4. **Offline mode users**: Google Sign-In button hidden when `FirebaseService.isOffline()` is true.
5. **Sign out**: Clear Google sign-in state + Firebase sign out + optionally re-create anonymous account.

---

## 9. Testing Checklist

- [ ] Fresh install -> anonymous login works as before
- [ ] Anonymous user -> Google Sign-In -> data preserved (linkWithCredential)
- [ ] Google Sign-In -> Sign Out -> re-creates anonymous account
- [ ] Google Sign-In with account already linked to another user -> data migration
- [ ] Offline mode -> Google Sign-In button hidden
- [ ] Nickname, statistics, game history all preserved after linking
- [ ] Android and iOS both work
- [ ] Online multiplayer continues to work after Google Sign-In
