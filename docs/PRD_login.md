# PRD: Google Sign-In & User System

> Version: 1.0 | Date: 2026-02-07 | Author: Product Designer

---

## 1. Background & Goals

### 1.1 Current State
- The app uses **Firebase Anonymous Auth** as the sole authentication method
- Users get a random nickname (e.g. "SwiftPilot123") upon first launch
- User data is stored in Firestore `users` collection with fields: `userId`, `nickname`, `nicknameChangedAt`, `createdAt`, `selectedBackground`
- Statistics, game history, achievements, and skin preferences are stored both locally (AsyncStorage) and in Firestore
- Offline mode is supported: when Firebase is unavailable, a local-only profile is created with an `offline_` prefix userId
- Nickname can be changed once every 30 days, max 20 characters

### 1.2 Goals
1. Add Google Sign-In as the primary login method to provide persistent accounts across devices
2. Allow guest (anonymous) users to seamlessly upgrade to Google accounts with full data migration
3. Display Google profile info (avatar, display name) for logged-in users
4. Provide a clear and non-intrusive login flow that does not block game access

---

## 2. Login Flow Design

### 2.1 First Launch Flow
```
App Launch
  |
  v
Splash/Loading Screen (Firebase init, 5s timeout)
  |
  v
[Firebase Available?]
  |--- No --> Offline Mode (local profile, all features except online multiplayer)
  |--- Yes --> Anonymous Auth (current behavior)
  |
  v
Main Menu (with "Sign In" prompt banner at top)
```

**No change to current behavior**: The app still auto-creates an anonymous account on first launch. Google Sign-In is presented as an optional upgrade, never as a gate.

### 2.2 Google Sign-In Entry Points

| Entry Point | Location | Trigger | Priority |
|---|---|---|---|
| Main Menu Banner | Top of MainMenuScreen | Soft prompt, dismissible, shown until signed in or dismissed 3 times | P0 |
| Profile Screen Button | ProfileScreen, below avatar | "Sign in with Google" button, always visible for anonymous users | P0 |
| Settings Screen Link | SettingsScreen, Account section | "Sign in with Google" link | P1 |
| Pre-Online Match | OnlineModeScreen, before Quick Match / Create Room | Modal prompt: "Sign in for a better online experience" (skippable) | P1 |
| Post-Game Prompt | After 5th game, one-time modal | "Save your progress! Sign in with Google" | P2 |

### 2.3 Sign-In Flow (Step by Step)

```
User taps "Sign in with Google"
  |
  v
Google Sign-In SDK picker (native UI)
  |
  v
[User selects Google account / cancels]
  |--- Cancel --> Return to previous screen, no change
  |--- Success --> Get Google ID Token
  |
  v
Create Firebase GoogleAuthProvider credential
  |
  v
[Is current user anonymous?]
  |--- Yes --> Link anonymous account with Google credential (auth().currentUser.linkWithCredential)
  |            |
  |            v
  |            [Link successful?]
  |            |--- Yes --> Merge complete, update profile
  |            |--- No (credential already linked to another account) -->
  |            |       Show conflict dialog:
  |            |       "This Google account is already linked to another player profile."
  |            |       Options: [Switch to that account] [Cancel]
  |            |       If Switch: sign out anonymous, sign in with Google credential
  |            |                  (anonymous data is lost, target account data is loaded)
  |            |       If Cancel: return, no change
  |
  |--- No (already signed in with Google) --> Already signed in, show toast
```

### 2.4 Sign-Out Flow

```
User taps "Sign Out" (Profile Screen or Settings Screen)
  |
  v
Confirmation Dialog: "Sign out? You can sign in again anytime."
  |
  v
[Confirm]
  |
  v
Firebase auth().signOut()
  |
  v
Auto-create new anonymous account
  |
  v
Return to Main Menu with fresh anonymous profile
```

**Important**: Sign-out creates a NEW anonymous account. The old anonymous data is not accessible until the user signs back in with Google.

---

## 3. Guest-to-Google Data Merge Strategy

### 3.1 What Gets Merged

When an anonymous user successfully links their account with Google, the following data is preserved seamlessly because the Firebase UID remains the same:

| Data | Storage | Merge Behavior |
|---|---|---|
| Statistics (totalGames, wins, losses, winRate) | Firestore `users/{uid}` + AsyncStorage | **Kept as-is** - UID does not change on link |
| Game History | Firestore `gameHistory` + AsyncStorage | **Kept as-is** |
| Achievements | AsyncStorage | **Kept as-is** |
| Skin Preferences | AsyncStorage | **Kept as-is** |
| Nickname | Firestore `users/{uid}` | **Kept as-is** (user can keep or update) |

### 3.2 Profile Field Updates on Link

After successful Google account link, update the Firestore user document:

```typescript
{
  // Existing fields preserved:
  userId: string;           // Firebase UID (unchanged)
  nickname: string;         // Kept from anonymous profile
  nicknameChangedAt: number | null;
  createdAt: number;
  selectedBackground: string;

  // New fields added:
  authProvider: 'google';           // Auth method flag
  googleDisplayName: string;        // From Google profile
  googleEmail: string;              // From Google profile
  googlePhotoUrl: string | null;    // From Google profile (avatar)
  linkedAt: number;                 // Timestamp of account link
}
```

### 3.3 Conflict Resolution (Account Already Exists)

If the Google account is already linked to a different Firebase UID:
1. Show a dialog explaining the situation
2. Option A: **Switch accounts** - sign out current anonymous user, sign in with Google. The Google account's existing data is loaded. The anonymous account's data becomes orphaned.
3. Option B: **Cancel** - stay on current anonymous account, do nothing.

No automatic data merging between two different UIDs is performed. This avoids complex merge conflicts (e.g., which statistics are "correct").

---

## 4. User Information Display

### 4.1 Profile Screen Updates

**Anonymous User View:**
```
+---------------------------+
|       [Airplane Icon]     |
|      SwiftPilot123        |
|   [Sign in with Google]   |
+---------------------------+
| Account Type: Guest       |
| Account Created: 5 days   |
| User ID: abc123...        |
+---------------------------+
| Statistics...             |
| Quick Actions...          |
+---------------------------+
```

**Google User View:**
```
+---------------------------+
|   [Google Avatar Image]   |
|      SwiftPilot123        |
|   john@gmail.com          |
+---------------------------+
| Account Type: Google      |
| Google Name: John Doe     |
| Account Created: 5 days   |
| User ID: abc123...        |
+---------------------------+
| Statistics...             |
| Quick Actions...          |
| [Sign Out]                |
+---------------------------+
```

### 4.2 Main Menu Updates

**Anonymous User:**
- Small banner at the top: "Sign in with Google to save progress" + [Sign In] button
- Banner can be dismissed; after 3 dismissals, it hides permanently (stored in AsyncStorage)

**Google User:**
- Small avatar circle in top-right corner (Google profile photo or default airplane icon)
- Tapping it navigates to Profile Screen

### 4.3 Online Mode Updates

- If Google-signed-in: show Google display name in match lobby alongside nickname
- If anonymous: show nickname only, with a subtle "Guest" badge

### 4.4 Leaderboard Updates

- Add Google avatar (small circle) next to player name on leaderboard
- Anonymous users show default airplane icon

---

## 5. UserProfile Interface Update

```typescript
interface UserProfile {
  userId: string;
  nickname: string;
  nicknameChangedAt: number | null;
  createdAt: number;
  selectedBackground?: string;

  // New fields for Google Sign-In
  authProvider: 'anonymous' | 'google';
  googleDisplayName?: string;
  googleEmail?: string;
  googlePhotoUrl?: string | null;
  linkedAt?: number;
}
```

---

## 6. Configuration Requirements

### 6.1 Google Cloud Console Setup

The following must be configured by the developer in the **Google Cloud Console** (tied to Firebase project `airplane-battle-7a3fd`):

| Item | Details |
|---|---|
| OAuth 2.0 Client ID (Android) | Type: Android. Package name from `android/app/build.gradle` (`applicationId`). SHA-1 fingerprint of signing key. |
| OAuth 2.0 Client ID (iOS) | Type: iOS. Bundle ID from Xcode project. |
| OAuth 2.0 Client ID (Web) | Type: Web application. Required by `@react-native-google-signin/google-signin` as `webClientId`. |
| OAuth Consent Screen | App name, support email, privacy policy URL, terms of service URL. |

### 6.2 Firebase Console Setup

| Item | Details |
|---|---|
| Authentication > Sign-in method | Enable "Google" provider. Set Web Client ID and Web Client Secret (auto-populated from Google Cloud). |
| Authentication > Sign-in method | Keep "Anonymous" enabled (current). |

### 6.3 Information Needed from User

To proceed with implementation, the following information/actions are needed:

1. **Android signing key SHA-1 fingerprint**
   - Debug key: `cd android && ./gradlew signingReport`
   - Release key: from the keystore used for APK signing
2. **iOS Bundle ID** (if iOS build is planned)
3. **Web Client ID** - generated after creating OAuth credentials in Google Cloud Console
4. **Privacy Policy URL** - required for Google OAuth consent screen and Play Store listing
5. **Terms of Service URL** - required for OAuth consent screen
6. **Support Email** - for OAuth consent screen

### 6.4 Required NPM Package

```
@react-native-google-signin/google-signin
```

This is the standard community package for React Native Google Sign-In, compatible with Firebase Auth.

---

## 7. Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| Google Sign-In cancelled by user | Toast: "Sign-in cancelled". No state change. |
| Network error during sign-in | Alert: "Unable to sign in. Please check your connection and try again." |
| Google Play Services not available (Android) | Alert: "Google Play Services required. Please update." |
| Firebase link fails (unknown error) | Alert: "Sign-in failed. Please try again later." + log error |
| User signs in on new device with Google | Load Firestore profile data, overwrite local AsyncStorage cache |
| User uninstalls and reinstalls app | Anonymous sign-in creates new UID. User can sign in with Google to restore old account. |
| Offline mode + sign-in attempt | Alert: "Sign-in requires internet connection." |

---

## 8. Analytics Events (Optional, for future)

| Event | Trigger |
|---|---|
| `sign_in_prompt_shown` | Sign-in banner or modal displayed |
| `sign_in_prompt_dismissed` | User dismisses sign-in prompt |
| `sign_in_started` | User taps "Sign in with Google" |
| `sign_in_success` | Google Sign-In + Firebase link successful |
| `sign_in_cancelled` | User cancels Google picker |
| `sign_in_error` | Sign-in flow fails |
| `sign_out` | User signs out |
| `account_conflict` | Link fails due to existing account |

---

## 9. Out of Scope (v1)

- Apple Sign-In (can be added later for iOS)
- Email/password authentication
- Account deletion (can be added for GDPR compliance later)
- Multi-account switching
- Social features (friends list, chat)
