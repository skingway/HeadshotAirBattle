# IAP In-App Purchase Technical Architecture

## 1. Current Unlock System Analysis

### Existing Skin/Theme Unlock Logic

**SkinConfig** (`src/config/SkinConfig.ts`):
- 12 Airplane Skins: unlocked by `totalGames` (0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 100)
- 9 Board Themes: unlocked by `totalWins` (0, 10, 20, 30, 40, 50, 100, 150, 200)
- Unlock check: `isSkinUnlocked(skinId, totalGames)` / `isThemeUnlocked(themeId, totalWins)`

**SkinService** (`src/services/SkinService.ts`):
- Stores current selection in AsyncStorage (`@airplane_skin`, `@board_theme`)
- No unlock state tracking -- relies on live stats comparison
- No cloud sync of selections

**SkinsScreen** (`src/screens/SkinsScreen.tsx`):
- Loads `totalGames` and `totalWins` from StatisticsService
- Checks unlock status at render time by comparing stats against `unlockRequirement`
- Locked items show lock icon and unlock text

**AchievementService** (`src/services/AchievementService.ts`):
- Separate system: stores unlocked achievement IDs in AsyncStorage
- Controls difficulty/mode unlocks (easy/medium/hard, 10x10/15x15/20x20)
- Local-only persistence

### Key Design Decision
The current system has NO persistent "unlock state" -- everything is derived from stats at runtime. IAP purchases need a persistent, verifiable unlock state that is independent of stats.

---

## 2. Library Selection

### Recommended: `react-native-iap` v12+

**Justification:**
- Most popular React Native IAP library with active maintenance
- Supports both Google Play Billing v7 and Apple StoreKit 2
- Unified API for Android and iOS
- Built-in purchase verification helpers
- Supports non-consumable (one-time), consumable, and subscription products

**Alternative considered:** `expo-in-app-purchases` -- rejected, requires Expo.

### Installation
```bash
npm install react-native-iap
```

---

## 3. IAP Product Design

### Product Categories

#### 3.1 Non-Consumable Products (One-time purchase, permanent unlock)

| Product ID | Name | Description | Price (USD) |
|-----------|------|-------------|-------------|
| `remove_ads` | Remove Ads | Remove all banner and interstitial ads permanently | $2.99 |
| `skin_pack_premium` | Premium Skin Pack | Unlock 4 premium airplane skins | $1.99 |
| `theme_pack_premium` | Premium Theme Pack | Unlock 4 premium board themes | $1.99 |
| `all_unlock_bundle` | All-In-One Bundle | Remove ads + all skins + all themes | $4.99 |

#### 3.2 Premium Skins (included in skin_pack_premium and all_unlock_bundle)

These 4 skins would be NEW additions to the existing 12, available only via purchase:
- Platinum Silver (premium exclusive)
- Dragon Fire (premium exclusive)
- Galaxy Nebula (premium exclusive)
- Diamond Crystal (premium exclusive)

#### 3.3 Premium Themes (included in theme_pack_premium and all_unlock_bundle)

These 4 themes would be NEW additions to the existing 9, available only via purchase:
- Cyber Neon (premium exclusive)
- Volcanic Magma (premium exclusive)
- Crystal Ice (premium exclusive)
- Sakura Bloom (premium exclusive)

### Product ID Convention
- Android: `com.headshotairbattle.remove_ads`, `com.headshotairbattle.skin_pack_premium`, etc.
- iOS: Same IDs (react-native-iap abstracts this)

---

## 4. Service Layer Architecture

### 4.1 New Service: IAPService

**New file**: `src/services/IAPService.ts`

```typescript
class IAPService {
  private static instance: IAPService;

  // Connection state
  private isConnected: boolean = false;
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;

  // Product catalog
  private products: Product[] = [];

  // Core methods
  async initialize(): Promise<void>
  async getProducts(): Promise<Product[]>
  async purchaseProduct(productId: string): Promise<boolean>
  async restorePurchases(): Promise<string[]>
  async finishTransaction(purchase: Purchase): Promise<void>

  // Purchase verification
  private async verifyPurchase(purchase: Purchase): Promise<boolean>

  // State queries
  isPurchased(productId: string): boolean
  isAdsRemoved(): boolean

  // Cleanup
  cleanup(): void
}
```

### 4.2 New Service: PurchaseStateManager

**New file**: `src/services/PurchaseStateManager.ts`

Manages persistent unlock state both locally and in Firestore.

```typescript
interface PurchaseState {
  removeAds: boolean;
  premiumSkins: boolean;
  premiumThemes: boolean;
  allUnlockBundle: boolean;
  purchaseHistory: PurchaseRecord[];
  lastSyncedAt: number;
}

interface PurchaseRecord {
  productId: string;
  purchasedAt: number;
  platform: 'android' | 'ios';
  transactionId: string;
}

class PurchaseStateManager {
  // Load from AsyncStorage + Firestore sync
  async initialize(): Promise<void>

  // Record a verified purchase
  async recordPurchase(productId: string, transactionId: string): Promise<void>

  // Check unlock status
  hasRemoveAds(): boolean
  hasPremiumSkins(): boolean
  hasPremiumThemes(): boolean
  isSkinUnlocked(skinId: string): boolean
  isThemeUnlocked(themeId: string): boolean

  // Sync with Firestore (for cross-device)
  async syncToCloud(userId: string): Promise<void>
  async syncFromCloud(userId: string): Promise<void>
}
```

### 4.3 Storage Design

#### Local Storage (AsyncStorage)
```
Key: 'iap_purchase_state'
Value: JSON PurchaseState object
```

#### Cloud Storage (Firestore)
```
Collection: users/{uid}
Fields (merged):
  purchases: {
    removeAds: boolean,
    premiumSkins: boolean,
    premiumThemes: boolean,
    allUnlockBundle: boolean,
    purchaseHistory: PurchaseRecord[]
  }
```

---

## 5. Updated Unlock Logic

### Current Flow (stats-based):
```
SkinsScreen -> StatisticsService.loadStatistics()
            -> Compare totalGames vs skin.unlockRequirement
            -> Show locked/unlocked
```

### New Flow (stats + IAP):
```
SkinsScreen -> StatisticsService.loadStatistics()
            -> PurchaseStateManager.isSkinUnlocked(skinId)
            -> If premium skin: check IAP state
            -> If regular skin: check stats (unchanged)
            -> Show locked/unlocked/purchasable
```

### SkinConfig Changes

```typescript
// Updated AirplaneSkin interface
export interface AirplaneSkin {
  id: string;
  name: string;
  description: string;
  unlockRequirement: number;
  unlockText: string;
  color: string;
  // New fields
  isPremium?: boolean;       // true = IAP only
  premiumPackId?: string;    // Which IAP product unlocks this
}

// Updated BoardTheme interface
export interface BoardTheme {
  // ... existing fields ...
  isPremium?: boolean;
  premiumPackId?: string;
}
```

---

## 6. Store UI Architecture

### 6.1 New Screen: StoreScreen

**New file**: `src/screens/StoreScreen.tsx`

```
[Store Screen]
  |-- Header: "Store"
  |
  |-- Featured Bundle Section
  |   |-- "All-In-One Bundle" card ($4.99) -- highlighted
  |   |-- "Save XX%" badge
  |
  |-- Remove Ads Section
  |   |-- "Remove Ads" card ($2.99)
  |   |-- Description: "Remove all ads permanently"
  |
  |-- Premium Skins Section
  |   |-- "Premium Skin Pack" card ($1.99)
  |   |-- Preview of 4 premium skins
  |
  |-- Premium Themes Section
  |   |-- "Premium Theme Pack" card ($1.99)
  |   |-- Preview of 4 premium themes
  |
  |-- Restore Purchases Button
  |   |-- "Restore Purchases" -- for users who reinstall
  |
  |-- Back Button
```

### 6.2 Updated SkinsScreen

**Modified file**: `src/screens/SkinsScreen.tsx`

Changes:
- Premium skins show price badge instead of stats requirement
- Tapping locked premium skin offers purchase or navigates to Store
- "Go to Store" button in header
- Premium items have distinct visual styling (gold border, "PREMIUM" tag)

### 6.3 Purchase Flow UI

```
[User taps premium item]
        |
        v
[Show purchase confirmation dialog]
  "Purchase Premium Skin Pack for $1.99?"
  [Cancel] [Purchase]
        |
        v (Purchase)
[Show loading indicator]
        |
        v
[Native purchase dialog (Google Play / App Store)]
        |
   Success / Failure
        |
        v
[If success: unlock items, show success toast]
[If failure: show error message]
```

---

## 7. Purchase Verification

### Client-Side Verification (MVP)

For initial release, use client-side receipt validation:

```typescript
// Android: Verify purchase token exists and is valid
// iOS: Verify receipt with local validation

async verifyPurchase(purchase: Purchase): Promise<boolean> {
  if (Platform.OS === 'android') {
    return purchase.purchaseStateAndroid === PurchaseStateAndroid.PURCHASED;
  } else {
    return purchase.transactionReceipt !== undefined;
  }
}
```

### Server-Side Verification (Future Enhancement)

For stronger security, implement Firebase Cloud Functions to verify:
- Android: Google Play Developer API verification
- iOS: App Store Server API verification

This is recommended for production but not required for initial launch.

---

## 8. Restore Purchases

Critical for App Store review compliance (Apple requires "Restore Purchases" button).

```typescript
async restorePurchases(): Promise<string[]> {
  const purchases = await getAvailablePurchases();

  for (const purchase of purchases) {
    const verified = await this.verifyPurchase(purchase);
    if (verified) {
      await PurchaseStateManager.recordPurchase(
        purchase.productId,
        purchase.transactionId
      );
    }
  }

  // Sync to cloud if user is authenticated
  const userId = AuthService.getUserId();
  if (userId && !FirebaseService.isOffline()) {
    await PurchaseStateManager.syncToCloud(userId);
  }

  return purchases.map(p => p.productId);
}
```

---

## 9. Files to Modify and Create

### New Files

| File | Purpose |
|------|---------|
| `src/services/IAPService.ts` | IAP purchase flow, product listing, restore |
| `src/services/PurchaseStateManager.ts` | Persistent unlock state management |
| `src/screens/StoreScreen.tsx` | Store UI for purchasing IAP products |
| `src/config/IAPConfig.ts` | Product IDs, premium skin/theme definitions |

### Modified Files

| File | Changes |
|------|---------|
| `src/config/SkinConfig.ts` | Add `isPremium` and `premiumPackId` fields, add 4 premium skins and 4 premium themes |
| `src/services/SkinService.ts` | Integrate with PurchaseStateManager for unlock checks |
| `src/screens/SkinsScreen.tsx` | Premium item rendering, purchase buttons, "Go to Store" link |
| `src/screens/MainMenuScreen.tsx` | Add "Store" button to navigation |
| `src/screens/ProfileScreen.tsx` | Show purchase status, "Store" quick action |
| `App.tsx` | Initialize IAPService in `initializeApp()`, add Store to navigator, cleanup on unmount |
| `package.json` | Add `react-native-iap` dependency |

### Platform Config

| File | Changes |
|------|---------|
| `android/app/build.gradle` | Add billing dependency (auto-linked by react-native-iap) |
| `ios/Podfile` | Run `pod install` (auto-linked) |

---

## 10. Integration with Existing Services

### StatisticsService
- No changes needed. Free skins still use stats-based unlock.
- IAP skins bypass stats entirely.

### AchievementService
- No changes needed. Achievements are separate from IAP.
- (Optional future: "Big Spender" achievement for first IAP purchase)

### AuthService
- PurchaseStateManager syncs to Firestore using the user's UID.
- When user signs in with Google, purchase state syncs to cloud.
- Cross-device restoration works via Firestore sync + platform restore.

### SkinService
- Modified to check PurchaseStateManager for premium items.
- Free item unlock logic unchanged.

---

## 11. Android vs iOS Differences

| Item | Android (Google Play) | iOS (App Store) |
|------|----------------------|-----------------|
| Billing Library | Google Play Billing v7 | StoreKit 2 |
| Product Setup | Google Play Console | App Store Connect |
| Restore Purchases | `getAvailablePurchases()` | `getAvailablePurchases()` |
| Restore Button | Optional (but recommended) | **Required** (App Store Review) |
| Review requirement | None specific | "Restore Purchases" must be visible |
| Tax handling | Google handles | Apple handles |
| Revenue split | 85/15 (after $1M) or 70/30 | 85/15 (Small Business) or 70/30 |

---

## 12. Error Handling

1. **Purchase cancelled by user**: Silently ignore, return to previous state.
2. **Network error during purchase**: Show retry dialog. Platform handles transaction recovery.
3. **Purchase verification failed**: Do NOT unlock. Show "Purchase could not be verified" error.
4. **Restore finds no purchases**: Show "No previous purchases found" message.
5. **Product not found in store**: Skip display of that product, log warning.
6. **Pending purchase (Android)**: Show "Purchase pending" state, check on next app launch.

---

## 13. Testing Checklist

- [ ] All IAP products load correctly from store
- [ ] Purchase flow completes and items unlock
- [ ] Purchased items persist across app restart
- [ ] Restore Purchases recovers all previously purchased items
- [ ] Premium skins/themes show correctly in SkinsScreen
- [ ] Free skins still unlock via stats (no regression)
- [ ] Remove Ads hides all ad placements
- [ ] Bundle purchase unlocks all included items
- [ ] Purchase state syncs to Firestore (when logged in with Google)
- [ ] Cross-device purchase restoration works
- [ ] Android and iOS both function correctly
- [ ] Sandbox/test purchase mode works for development
