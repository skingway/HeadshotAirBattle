# AdMob Ads Integration Technical Architecture

## 1. Overview

Integrate Google AdMob ads into the app using `react-native-google-mobile-ads`. Ad types: interstitial ads (between games) and banner ads (on menu screens). Ads must be removable via IAP "Remove Ads" purchase.

---

## 2. Library Selection

### Recommended: `react-native-google-mobile-ads` v14+

**Justification:**
- Official Invertase library (same team as `@react-native-firebase`)
- Seamless integration with existing Firebase setup
- Supports Banner, Interstitial, Rewarded, App Open ad formats
- Built-in consent management (UMP SDK) for GDPR
- Active maintenance, TypeScript support

### Installation
```bash
npm install react-native-google-mobile-ads
```

---

## 3. AdMob Account & Ad Unit Setup

### Firebase Console
1. Link AdMob account to Firebase project `airplane-battle-7a3fd`
2. Create AdMob app for Android (package: `com.headshotairbattle`)
3. Create AdMob app for iOS (bundle: matching Xcode bundle ID)

### Ad Unit IDs

| Ad Type | Placement | Android Test ID | iOS Test ID |
|---------|-----------|----------------|-------------|
| Banner | MainMenu bottom | `ca-app-pub-3940256099942544/6300978111` | `ca-app-pub-3940256099942544/2934735716` |
| Banner | Profile bottom | (same test ID) | (same test ID) |
| Interstitial | After game over | `ca-app-pub-3940256099942544/1033173712` | `ca-app-pub-3940256099942544/4411468910` |

> Note: Test IDs shown above are Google's official test ad unit IDs. Replace with real IDs before production release.

### Ad Unit Config File

**New file**: `src/config/AdConfig.ts`

```typescript
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;

export const AD_UNIT_IDS = {
  BANNER_MAIN_MENU: IS_DEV
    ? TestIds.BANNER
    : Platform.select({
        android: 'ca-app-pub-XXXXX/XXXXX',
        ios: 'ca-app-pub-XXXXX/XXXXX',
      })!,

  BANNER_PROFILE: IS_DEV
    ? TestIds.BANNER
    : Platform.select({
        android: 'ca-app-pub-XXXXX/XXXXX',
        ios: 'ca-app-pub-XXXXX/XXXXX',
      })!,

  INTERSTITIAL_GAME_OVER: IS_DEV
    ? TestIds.INTERSTITIAL
    : Platform.select({
        android: 'ca-app-pub-XXXXX/XXXXX',
        ios: 'ca-app-pub-XXXXX/XXXXX',
      })!,
};

// Ad display frequency control
export const AD_FREQUENCY = {
  INTERSTITIAL_EVERY_N_GAMES: 3,  // Show interstitial every 3 games
  MIN_INTERVAL_SECONDS: 60,        // Minimum 60 seconds between interstitials
};
```

---

## 4. Native Configuration

### 4.1 Android Configuration

#### `android/app/build.gradle`
No additional changes needed -- `react-native-google-mobile-ads` auto-links.

#### `android/app/src/main/AndroidManifest.xml`
```xml
<manifest>
  <application>
    <!-- AdMob App ID (required) -->
    <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
  </application>
</manifest>
```

Alternatively, add to `app.json`:
```json
{
  "react-native-google-mobile-ads": {
    "android_app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
    "ios_app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
  }
}
```

### 4.2 iOS Configuration

#### `ios/HeadshotAirBattle/Info.plist`
```xml
<!-- AdMob App ID -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>

<!-- SKAdNetwork IDs for ad attribution -->
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
  <!-- Additional network IDs as needed -->
</array>
```

#### App Tracking Transparency (ATT) -- iOS 14+

**Required** for personalized ads on iOS.

Add to `Info.plist`:
```xml
<key>NSUserTrackingUsageDescription</key>
<string>This app uses your data to provide personalized ads. You can choose to allow or deny tracking.</string>
```

ATT prompt must be shown BEFORE loading any ads on iOS.

---

## 5. Service Layer Architecture

### 5.1 New Service: AdService

**New file**: `src/services/AdService.ts`

```typescript
import { InterstitialAd, BannerAd, AdEventType, AdsConsent } from 'react-native-google-mobile-ads';

class AdService {
  private static instance: AdService;

  // State
  private adsRemoved: boolean = false;
  private interstitialAd: InterstitialAd | null = null;
  private interstitialLoaded: boolean = false;
  private gamesPlayedSinceLastAd: number = 0;
  private lastAdShownAt: number = 0;

  // Core methods
  async initialize(): Promise<void>
  // - Check PurchaseStateManager.hasRemoveAds()
  // - If ads not removed: request ATT consent (iOS), load first interstitial
  // - If ads removed: skip all ad initialization

  // ATT consent (iOS only)
  async requestTrackingPermission(): Promise<void>

  // Interstitial management
  async loadInterstitial(): Promise<void>
  async showInterstitialIfReady(): Promise<boolean>
  // - Check frequency limits (every N games, min interval)
  // - Check adsRemoved flag
  // - Show if loaded, then preload next

  // Banner visibility
  shouldShowBannerAd(): boolean
  // - Returns false if adsRemoved

  // IAP integration
  onAdsRemoved(): void
  // - Set adsRemoved = true
  // - Destroy loaded interstitial
  // - Notify banner components to hide

  // Game counter
  incrementGameCount(): void

  // Cleanup
  cleanup(): void
}
```

### 5.2 Ad Lifecycle Management

#### Interstitial Ad Lifecycle

```
[App starts / Game ends]
        |
        v
[AdService.initialize()]
  |-- Check adsRemoved -> if true, skip all
  |-- iOS: Request ATT permission
  |-- Load first interstitial
        |
        v
[Game Over Screen]
        |
        v
[AdService.incrementGameCount()]
[AdService.showInterstitialIfReady()]
  |-- Check: gamesPlayedSinceLastAd >= INTERSTITIAL_EVERY_N_GAMES
  |-- Check: (now - lastAdShownAt) >= MIN_INTERVAL_SECONDS
  |-- Check: interstitialLoaded == true
  |-- Check: adsRemoved == false
        |
    All pass?
   Yes    No
    |      |
    v      v
[Show ad] [Skip, preload next]
    |
    v
[Ad closed event]
    |
    v
[Preload next interstitial]
```

#### Banner Ad Lifecycle

```
[Component mounts (MainMenuScreen, ProfileScreen)]
        |
        v
[Check AdService.shouldShowBannerAd()]
  |-- false -> Render nothing
  |-- true  -> Render <BannerAd /> component
        |
        v
[Banner auto-refreshes every 30-60 seconds]
[Banner handles load/error internally]
```

---

## 6. UI Integration

### 6.1 Banner Ad Placement

#### MainMenuScreen (`src/screens/MainMenuScreen.tsx`)

```
[MainMenuScreen]
  |-- Title
  |-- Game mode buttons
  |-- Bottom buttons (Profile, Settings)
  |-- [BannerAd] <-- Fixed at bottom of screen
```

Implementation:
```tsx
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import AdService from '../services/AdService';
import { AD_UNIT_IDS } from '../config/AdConfig';

// In render:
{AdService.shouldShowBannerAd() && (
  <BannerAd
    unitId={AD_UNIT_IDS.BANNER_MAIN_MENU}
    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    requestOptions={{ requestNonPersonalizedAdsOnly: true }}
  />
)}
```

#### ProfileScreen (`src/screens/ProfileScreen.tsx`)

Same pattern, placed at the bottom of the ScrollView.

### 6.2 Interstitial Ad Placement

#### GameScreen (`src/screens/GameScreen.tsx`)

Show interstitial when game ends (game over phase begins):

```typescript
// In the game over handler (both player win and AI win):
const handleGameOver = async (winner: string) => {
  // ... existing game over logic ...

  // Show interstitial ad (if not removed)
  AdService.incrementGameCount();
  await AdService.showInterstitialIfReady();
};
```

**Important**: The interstitial must NOT block the game over screen. Show it after the result is displayed, using a short delay:

```typescript
// After 1.5 seconds delay (let player see result first)
setTimeout(async () => {
  await AdService.showInterstitialIfReady();
}, 1500);
```

### 6.3 Ad-Free Purchase Integration

When user purchases "Remove Ads":

```typescript
// In IAPService after successful purchase verification:
if (productId === 'remove_ads' || productId === 'all_unlock_bundle') {
  AdService.onAdsRemoved();
  // All banner components will re-render and hide
  // Interstitials will no longer show
}
```

---

## 7. iOS App Tracking Transparency (ATT)

### ATT Flow

```
[App launches (first time on iOS 14+)]
        |
        v
[Check ATT status]
  |-- .authorized    -> Load ads normally (personalized)
  |-- .denied        -> Load ads with requestNonPersonalizedAdsOnly
  |-- .notDetermined -> Show ATT prompt
  |-- .restricted    -> Load ads with requestNonPersonalizedAdsOnly
        |
        v
[ATT prompt shown to user]
  "Allow HeadshotAirBattle to track your activity?"
  [Ask App Not to Track] / [Allow]
        |
        v
[Proceed with ad loading]
```

### Implementation

```typescript
import { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

async requestTrackingPermission(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const status = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
  if (status === RESULTS.DENIED) {
    await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
  }

  // Also handle UMP consent (GDPR)
  const consentInfo = await AdsConsent.requestInfoUpdate();
  if (consentInfo.isConsentFormAvailable) {
    await AdsConsent.showForm();
  }
}
```

### Note on `react-native-permissions`
If the project doesn't want an additional dependency for ATT, `react-native-google-mobile-ads` includes UMP consent handling via `AdsConsent` which can handle the ATT prompt automatically when configured properly. This is the simpler approach:

```typescript
// In AdService.initialize():
if (Platform.OS === 'ios') {
  const consentInfo = await AdsConsent.requestInfoUpdate();
  if (consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED) {
    await AdsConsent.showForm();
  }
}
```

---

## 8. GDPR / Consent Management

The `react-native-google-mobile-ads` library includes the Google User Messaging Platform (UMP) SDK.

### Consent Flow
```
[App starts]
  |-> AdsConsent.requestInfoUpdate()
  |   Returns: consent status + form availability
  |
  |-> If consent required (EU users):
  |   AdsConsent.showForm()
  |   User sees GDPR consent dialog
  |
  |-> Store consent status
  |-> Load ads accordingly:
  |   - Consent given: personalized ads
  |   - Consent denied: non-personalized ads only
```

---

## 9. Files to Modify and Create

### New Files

| File | Purpose |
|------|---------|
| `src/services/AdService.ts` | Core ad management service (interstitial, banner control, ATT) |
| `src/config/AdConfig.ts` | Ad unit IDs, frequency config, test/prod toggle |

### Modified Files

| File | Changes |
|------|---------|
| `src/screens/MainMenuScreen.tsx` | Add BannerAd at bottom |
| `src/screens/ProfileScreen.tsx` | Add BannerAd at bottom |
| `src/screens/GameScreen.tsx` | Show interstitial on game over (both win/lose) |
| `src/screens/SettingsScreen.tsx` | (Optional) Add "Ad Preferences" or link to consent settings |
| `App.tsx` | Initialize AdService in `initializeApp()`, cleanup on unmount |
| `package.json` | Add `react-native-google-mobile-ads` dependency |
| `app.json` | Add AdMob app IDs for Android and iOS |

### Platform Config

| File | Changes |
|------|---------|
| `android/app/src/main/AndroidManifest.xml` | Add AdMob APPLICATION_ID meta-data (or via app.json) |
| `ios/HeadshotAirBattle/Info.plist` | Add `GADApplicationIdentifier`, `SKAdNetworkItems`, `NSUserTrackingUsageDescription` |
| `ios/Podfile` | Run `pod install` (auto-linked) |

---

## 10. Integration with IAP (Remove Ads)

### How Remove Ads Works

```
[User purchases "Remove Ads" or "All-In-One Bundle"]
        |
        v
[IAPService verifies purchase]
[PurchaseStateManager.recordPurchase('remove_ads')]
        |
        v
[AdService.onAdsRemoved()]
  |-- Sets adsRemoved = true
  |-- Destroys loaded interstitial
  |-- Unsubscribes from ad events
        |
        v
[All BannerAd components check AdService.shouldShowBannerAd()]
  |-- Returns false -> Banners unmount/hide
        |
        v
[GameScreen interstitial check]
  |-- AdService.showInterstitialIfReady() returns false
  |-- No more interstitials ever shown
```

### On App Restart (After Purchase)

```
[App starts]
  |-> AdService.initialize()
  |   |-> PurchaseStateManager.hasRemoveAds()
  |   |   Returns: true
  |   |
  |   |-> Skip ATT prompt
  |   |-> Skip ad loading
  |   |-> Set adsRemoved = true
  |   |-> Done (no ads loaded, no resources used)
```

---

## 11. Android vs iOS Differences

| Item | Android | iOS |
|------|---------|-----|
| SDK | Google Mobile Ads SDK | Google Mobile Ads SDK |
| App ID location | `app.json` or `AndroidManifest.xml` | `app.json` or `Info.plist` |
| ATT prompt | Not needed | **Required** (iOS 14+) |
| SKAdNetwork | Not applicable | Required in `Info.plist` |
| Consent (GDPR) | UMP SDK (both platforms) | UMP SDK (both platforms) |
| Test device | `RequestConfiguration.testDeviceIdentifiers` | Same |
| Ad format support | All formats | All formats |

---

## 12. Performance Considerations

1. **Lazy loading**: Don't load ads until after app initialization completes
2. **Preload interstitials**: Load next interstitial immediately after showing one
3. **Banner lifecycle**: Only mount BannerAd components when screen is focused
4. **Memory**: Destroy interstitial references when not needed
5. **Battery**: Banner auto-refresh is handled by SDK (30-60s intervals)
6. **App startup**: Ad initialization should NOT block app startup; run in background

### Ad Loading Timeline
```
[App.tsx initializeApp()]
  |-- Firebase init (await)
  |-- Auth init (await)
  |-- Stats init (await)
  |-- Skin init (await)
  |-- Achievement init (await)
  |-- IAP init (await)
  |-- Ad init (NO await - run in background)  <-- Non-blocking
```

---

## 13. Error Handling

1. **Ad fails to load**: Silently retry after 30 seconds. Never crash the app.
2. **Network unavailable**: Skip ad loading, retry when network returns.
3. **ATT denied**: Load non-personalized ads only. Never block the app.
4. **Invalid ad unit ID**: Log error, skip that ad placement.
5. **Ad SDK initialization failure**: Continue without ads. Log to analytics.
6. **User leaves app during interstitial**: SDK handles this automatically.

---

## 14. Testing Checklist

- [ ] Banner ads show on MainMenuScreen and ProfileScreen
- [ ] Banner ads do NOT show during gameplay (GameScreen)
- [ ] Interstitial shows after every 3rd game (configurable)
- [ ] Interstitial has minimum 60-second cooldown between shows
- [ ] "Remove Ads" purchase immediately hides all ads
- [ ] After "Remove Ads", no ads show on app restart
- [ ] iOS ATT prompt shows before first ad load
- [ ] ATT denial still allows app to function (non-personalized ads)
- [ ] GDPR consent form shows for EU users
- [ ] Test ads show in development mode
- [ ] No crashes when ad network is unreachable
- [ ] Ad loading does not block app startup
- [ ] Android and iOS both display ads correctly
