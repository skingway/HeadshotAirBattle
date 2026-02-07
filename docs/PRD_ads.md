# PRD: Ad Integration & Privacy Policy

> Version: 1.0 | Date: 2026-02-07 | Author: Product Designer

---

## 1. Background & Goals

### 1.1 Current State
- No ads in the app
- No privacy policy or terms of service
- App collects: Firebase anonymous UID, nickname, game statistics, game history
- App uses: Firebase Auth, Firestore, Realtime Database, AsyncStorage
- App version: v0.5.0

### 1.2 Goals
1. Integrate Google AdMob ads as the primary revenue source for free users
2. Design ad placements that do not disrupt gameplay
3. Support "Remove Ads" IAP (defined in PRD_iap.md)
4. Create privacy policy and terms of service compliant with Google Play requirements
5. Ensure GDPR / CCPA compliance for global distribution

---

## 2. Ad Types & Placements

### 2.1 Ad Format Overview

| Ad Format | Location | Frequency | Revenue Priority |
|---|---|---|---|
| Interstitial (full-screen) | Between games | Every 3rd game | High |
| Banner (320x50) | Main Menu, Profile Screen | Persistent | Medium |
| Rewarded Video | Post-game, Skins Screen | User-initiated | Medium |

### 2.2 Detailed Placement Specifications

#### 2.2.1 Interstitial Ads

**Trigger**: After a game ends (AI or Online), when navigating back from GameScreen/OnlineGameScreen to MainMenuScreen.

**Rules**:
- Show after every **3rd** game completion (not on 1st or 2nd)
- Counter resets per app session
- Do NOT show if the user has purchased "Remove Ads" or "Ace Pilot Bundle"
- Do NOT show if the game lasted less than 1 minute (user may have quit early)
- Do NOT show during online matchmaking or in-game
- Maximum 1 interstitial per 3 minutes (frequency cap)
- Preload the next interstitial after showing one

**UX Flow**:
```
Game Ends --> Battle Report Screen --> User taps "Back to Menu"
  |
  v
[Should show interstitial?]
  |--- gameCount % 3 == 0 AND not purchased remove_ads AND time > 3min since last ad
  |    --> Show interstitial --> after close/click --> navigate to MainMenu
  |--- Otherwise --> navigate to MainMenu directly
```

#### 2.2.2 Banner Ads

**Location**: Bottom of screen, anchored.

**Screens with banners**:
| Screen | Banner Position | Notes |
|---|---|---|
| MainMenuScreen | Bottom (above bottom buttons) | Always visible |
| ProfileScreen | Bottom | Always visible |
| SettingsScreen | Bottom | Always visible |
| LeaderboardScreen | Bottom | Always visible |
| GameHistoryScreen | Bottom | Always visible |
| AchievementsScreen | Bottom | Always visible |

**Screens WITHOUT banners** (never show banners here):
| Screen | Reason |
|---|---|
| GameScreen | Gameplay - no distractions |
| OnlineGameScreen | Gameplay - no distractions |
| MatchmakingScreen | Waiting for match - poor UX |
| RoomLobbyScreen | Waiting for opponent - poor UX |
| BattleReportScreen | Viewing detailed stats |
| SkinsScreen | Browsing shop-adjacent content |
| ShopScreen (new) | User is considering purchase |
| CustomModeScreen | Configuring game |

**Rules**:
- Do NOT show if user has purchased "Remove Ads" or "Ace Pilot Bundle"
- Banner refreshes every 60 seconds (AdMob default)
- Use adaptive banner size for best fit across devices

#### 2.2.3 Rewarded Video Ads

**Trigger**: User-initiated only. User explicitly taps a "Watch Ad" button to receive a reward.

**Reward Opportunities**:

| Location | Button Text | Reward | Notes |
|---|---|---|---|
| Post-game (Battle Report) | "Watch Ad for Bonus Stats" | Show detailed AI analysis of the game | Optional, free players only |
| Skins Screen (locked skin) | "Watch Ad to Preview" | Temporarily preview a locked skin for 1 game | 1 preview per session |
| Profile Screen | "Watch Ad for Nickname Change" | One free nickname change (bypass 30-day cooldown once) | Max 1 per 7 days |

**Rules**:
- Always available, even if user purchased "Remove Ads" (rewarded ads are user-chosen)
- Reward is granted only after full video completion
- If video fails to load, hide the button (do not show error)
- Preload rewarded video on screen mount

---

## 3. Ad-Free Logic

### 3.1 Remove Ads Behavior

When the user purchases "Remove Ads" ($2.99) or "Ace Pilot Bundle" ($4.99):

| Ad Type | Behavior |
|---|---|
| Interstitial | Completely removed, never shown |
| Banner | Completely removed from all screens |
| Rewarded Video | **Still available** (user-initiated, provides rewards) |

### 3.2 Implementation Check

Every ad display point checks:

```typescript
function shouldShowAds(): boolean {
  const purchases = getPurchaseCache(); // from AsyncStorage
  return !purchases.remove_ads && !purchases.ace_bundle;
}
```

### 3.3 Ad Removal is Immediate

- As soon as purchase is confirmed, ads stop showing
- No app restart required
- Use a global event/state to notify all ad components

---

## 4. AdMob Configuration

### 4.1 Required Setup

| Item | Details |
|---|---|
| AdMob Account | Create at admob.google.com (use same Google account as Play Console) |
| App Registration | Register Android app in AdMob with package name |
| Ad Unit IDs | Create 3 ad units: Banner, Interstitial, Rewarded |
| App ID | AdMob App ID added to `AndroidManifest.xml` |
| Test Mode | Use test ad unit IDs during development |

### 4.2 Ad Unit IDs Structure

```
Banner:       ca-app-pub-XXXXXXX/BANNER_ID
Interstitial: ca-app-pub-XXXXXXX/INTERSTITIAL_ID
Rewarded:     ca-app-pub-XXXXXXX/REWARDED_ID
```

*Actual IDs will be generated after AdMob app registration.*

### 4.3 Test Ad IDs (Development Only)

Use Google's official test IDs during development to avoid policy violations:

```
Banner:       ca-app-pub-3940256099942544/6300978111
Interstitial: ca-app-pub-3940256099942544/1033173712
Rewarded:     ca-app-pub-3940256099942544/5224354917
```

### 4.4 Required NPM Package

```
react-native-google-mobile-ads
```

This is the official Google Mobile Ads SDK wrapper for React Native.

### 4.5 Information Needed from User

1. **AdMob Account** - needs to be created at admob.google.com
2. **AdMob App ID** - generated after registering the app in AdMob
3. **Ad Unit IDs** - generated after creating ad units in AdMob (banner, interstitial, rewarded)
4. **GDPR Consent Decision** - whether to target EU users and implement UMP consent

---

## 5. Privacy Policy

### 5.1 Privacy Policy Requirements

A privacy policy is required by:
- Google Play Store (mandatory for all apps)
- Google AdMob (mandatory for ad-serving apps)
- Google Sign-In OAuth (mandatory for consent screen)
- GDPR (if serving EU users)
- CCPA (if serving California users)

### 5.2 Privacy Policy Content Outline

The privacy policy document must cover the following sections. It should be hosted at a publicly accessible URL.

---

**PRIVACY POLICY for Headshot: Air Battle**

**Last updated: [Date]**

**1. Introduction**
- App name: Headshot: Air Battle
- Developer: [Developer Name]
- Contact: [Email]
- This policy explains how we collect, use, and protect your information.

**2. Information We Collect**

| Data Type | What | How | Purpose |
|---|---|---|---|
| Account Data | Firebase anonymous UID, Google account info (name, email, profile photo) if signed in | Automatically on first launch / when user signs in with Google | User identification, data sync across devices |
| Game Data | Game statistics (wins, losses, games played, win rate), game history, achievements | Generated during gameplay | Game features, leaderboard |
| Device Data | Device model, OS version, screen size | Automatically by Firebase/AdMob SDKs | App optimization, ad serving |
| Usage Data | App session duration, screens visited, feature usage | Automatically by Firebase Analytics (if enabled) | App improvement |
| Ad Data | Ad interaction data (impressions, clicks) | Automatically by Google AdMob SDK | Ad serving, revenue |
| Preferences | Nickname, selected skin, selected theme, audio settings | User-configured | Personalization |

**3. How We Use Your Information**
- Provide and maintain the game service
- Save your game progress and statistics
- Display your profile to other players (nickname, stats in leaderboard)
- Serve relevant ads (via Google AdMob)
- Process in-app purchases
- Improve the app experience

**4. Third-Party Services**
- **Google Firebase**: Authentication, Cloud Firestore database, Realtime Database, Analytics
- **Google AdMob**: Advertising (see Google's privacy policy)
- **Google Play Services**: In-app purchases, Google Sign-In
- Each third-party service has its own privacy policy that applies to data they process.

**5. Data Sharing**
- We do NOT sell your personal data
- We share data with Google services as described above (necessary for app functionality)
- Game statistics (nickname, win rate) are visible to other players on the leaderboard
- We may disclose data if required by law

**6. Data Retention**
- Account data is retained as long as the account exists
- Game history: last 10 games stored locally, up to 100 games in cloud
- Anonymous accounts with no activity for 180 days may be automatically deleted

**7. Children's Privacy**
- This app is not directed to children under 13
- We do not knowingly collect data from children under 13
- If we discover such data, we will delete it
- Ad content is set to non-personalized for users who do not consent to personalized ads

**8. Your Rights**
- **Access**: Request a copy of your data by contacting us
- **Deletion**: Delete your account and all associated data through the app (Settings > Delete Account) or by contacting us
- **Opt-out of personalized ads**: Adjust your ad preferences in device settings or decline consent when prompted
- **Data portability**: Request your data in a machine-readable format

**9. GDPR Compliance (EU Users)**
- Legal basis: Consent (for personalized ads), Legitimate interest (for game functionality)
- Data controller: [Developer Name], [Address]
- Users can withdraw consent at any time
- Right to lodge a complaint with a supervisory authority

**10. CCPA Compliance (California Users)**
- Right to know what data is collected
- Right to delete personal data
- Right to opt-out of data sale (we do not sell data)
- Non-discrimination for exercising rights

**11. Security**
- Data transmitted over HTTPS/TLS
- Firebase security rules restrict data access
- Local data stored in app sandbox

**12. Changes to This Policy**
- We may update this policy. Changes will be posted at this URL.
- Continued use after changes constitutes acceptance.

**13. Contact Us**
- Email: [Developer Email]

---

### 5.3 Privacy Policy Hosting

The privacy policy must be hosted at a public URL. Options:
- GitHub Pages (free, easy to update)
- Firebase Hosting (already have Firebase project)
- Any static website host

**Recommended**: Host on Firebase Hosting under the existing project.
URL: `https://airplane-battle-7a3fd.web.app/privacy-policy`

### 5.4 Where Privacy Policy Links Appear

| Location | Format |
|---|---|
| Google Play Store listing | URL in store listing |
| Google OAuth Consent Screen | URL in OAuth config |
| App Settings Screen | Tappable "Privacy Policy" link (opens in-app browser) |
| App Settings Screen | Tappable "Terms of Service" link (opens in-app browser) |
| GDPR Consent Dialog (EU) | Link in consent text |
| First-launch consent (if applicable) | Link in consent banner |

---

## 6. Terms of Service

### 6.1 Terms of Service Content Outline

**TERMS OF SERVICE for Headshot: Air Battle**

**1. Acceptance of Terms**
- By using the app, you agree to these terms

**2. User Accounts**
- Anonymous accounts are created automatically
- Google Sign-In is optional
- Users are responsible for their account security
- One account per person

**3. In-App Purchases**
- All purchases are final (unless required by law)
- Purchases are non-consumable and restorable
- Prices are set in Google Play and may vary by region
- Refunds are handled through Google Play's refund policy

**4. User Conduct**
- No cheating, hacking, or exploiting bugs
- No offensive or inappropriate nicknames
- No harassment of other players in online mode
- Violation may result in account suspension

**5. Intellectual Property**
- All game content, graphics, and code are owned by [Developer Name]
- Users retain no rights to the app content

**6. Disclaimers**
- App provided "as is" without warranties
- We are not liable for data loss, service interruptions, or damages

**7. Modifications**
- We may update the app and these terms at any time
- Continued use constitutes acceptance

**8. Governing Law**
- [Applicable jurisdiction]

**9. Contact**
- Email: [Developer Email]

---

## 7. GDPR Consent Flow (EU Users)

### 7.1 Consent Requirements

Google AdMob requires GDPR consent for personalized ads in the EU/EEA. Google provides the **User Messaging Platform (UMP)** SDK for this.

### 7.2 Consent Flow

```
App Launch (EU user detected by UMP SDK)
  |
  v
[Has user given consent before?]
  |--- Yes --> Use stored consent, proceed
  |--- No --> Show Google UMP consent form
  |
  v
Google UMP Consent Dialog:
  "We use cookies and data to:
   - Deliver and maintain services
   - Show personalized ads
   ..."
  [Consent] [Manage Options] [Reject]
  |
  v
[User choice]
  |--- Consent --> Serve personalized ads
  |--- Manage --> Show granular options (Google's UI)
  |--- Reject --> Serve non-personalized ads only
```

### 7.3 Implementation Notes

- Use `react-native-google-mobile-ads` which includes UMP SDK support
- Call `AdsConsent.requestInfoUpdate()` on app launch
- If consent is required, show `AdsConsent.showForm()`
- Store consent status and respect it for all ad requests
- Non-EU users skip the consent flow entirely

---

## 8. Ad Revenue Optimization

### 8.1 Mediation (Future)

For v1, use Google AdMob only (single ad network). In future versions, consider:
- AdMob Mediation with Meta Audience Network, Unity Ads, AppLovin
- This increases fill rate and eCPM

### 8.2 Expected Revenue Estimates

| Metric | Conservative | Moderate |
|---|---|---|
| Banner eCPM | $0.30 | $0.80 |
| Interstitial eCPM | $3.00 | $8.00 |
| Rewarded eCPM | $8.00 | $15.00 |
| Daily sessions / user | 2 | 3 |
| Games / session | 3 | 5 |

---

## 9. Compliance Checklist

### 9.1 Google Play Store Requirements

- [x] Privacy policy URL in store listing
- [ ] Privacy policy hosted and accessible
- [ ] App does not target children under 13 (declare in Play Console)
- [ ] Content rating questionnaire completed in Play Console
- [ ] Ad content declaration (app contains ads) in Play Console
- [ ] In-app purchases declaration in Play Console

### 9.2 AdMob Requirements

- [ ] AdMob account created
- [ ] App registered in AdMob
- [ ] Ad units created (banner, interstitial, rewarded)
- [ ] AdMob App ID in AndroidManifest.xml
- [ ] Test ads used during development
- [ ] GDPR consent implemented (UMP SDK)
- [ ] No ad fraud: no self-clicking, no incentivized invalid clicks

### 9.3 Google Sign-In Requirements

- [ ] OAuth consent screen configured with privacy policy URL
- [ ] OAuth consent screen configured with terms of service URL
- [ ] Minimum scopes requested (email, profile only)
- [ ] App verification (if requesting sensitive scopes - not needed for basic profile)

### 9.4 Data Safety Section (Play Store)

Google Play requires a "Data safety" section. Declare:

| Data Type | Collected | Shared | Purpose |
|---|---|---|---|
| Email address | Yes (Google Sign-In) | No | Account management |
| Name | Yes (Google Sign-In) | No | Account management |
| User IDs | Yes (Firebase UID) | No | App functionality |
| Game progress | Yes | No | App functionality |
| App interactions | Yes | No | Analytics |
| Device info | Yes | Yes (AdMob) | Advertising |
| Ad data | Yes | Yes (AdMob) | Advertising |

---

## 10. Settings Screen Updates

Add the following to SettingsScreen.tsx:

```
+-- Account --+
| Sign in with Google     (if anonymous)
| or
| Signed in as: john@...  (if Google)
| [Sign Out]              (if Google)
+--------------+

+-- Premium --+
| [Go to Shop]
| Restore Purchases
+--------------+

+-- Legal --+
| Privacy Policy   -->  (opens URL)
| Terms of Service -->  (opens URL)
+--------------+

+-- About --+
| App Name: Airplane Battle
| Version: v1.0.0
| Platform: React Native
+--------------+
```

---

## 11. Implementation Priority

| Priority | Item | Dependency |
|---|---|---|
| P0 | Privacy Policy (write and host) | None (needed for store listing) |
| P0 | Terms of Service (write and host) | None |
| P0 | AdMob account + ad unit creation | None (manual setup) |
| P0 | Banner ads on Main Menu | AdMob setup |
| P0 | Interstitial ads between games | AdMob setup |
| P1 | GDPR consent (UMP SDK) | AdMob setup |
| P1 | Rewarded video ads | AdMob setup |
| P1 | Remove Ads IAP integration | IAP system (PRD_iap.md) |
| P2 | Settings screen legal links | Privacy policy hosted |
| P2 | Data Safety declaration | Privacy policy finalized |

---

## 12. Out of Scope (v1)

- Ad mediation (multiple ad networks)
- Custom consent dialog (use Google UMP)
- COPPA compliance for child-directed content (app is not child-directed)
- App Tracking Transparency (iOS only, not needed for Android)
- Cookie consent banner (mobile app, not web)
- In-app GDPR data export tool (email-based requests are sufficient for v1)
