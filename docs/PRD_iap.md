# PRD: In-App Purchase (IAP) & Monetization

> Version: 1.0 | Date: 2026-02-07 | Author: Product Designer

---

## 1. Background & Goals

### 1.1 Current State
- The app is completely free with no monetization
- 12 airplane skins unlocked by playing games (0-100 games threshold)
- 9 board themes unlocked by winning games (0-200 wins threshold)
- 3 AI difficulty levels (Easy free, Medium unlock at 3 wins, Hard unlock at 10 wins)
- 3 game modes (Standard 10x10, Extended 15x15, Custom)
- Online multiplayer (Quick Match + Private Room)
- Achievement system with badges and titles

### 1.2 Goals
1. Introduce a sustainable monetization model that respects free players
2. Offer premium content that provides cosmetic value (no pay-to-win)
3. Create a "remove ads" purchase as the primary revenue driver
4. Design IAP products for Google Play Store listing

### 1.3 Monetization Principles
- **No pay-to-win**: All gameplay-affecting content remains free and earnable through play
- **Cosmetic-only premium**: Paid items are exclusive skins, themes, and convenience features
- **Generous free tier**: Free players have full access to all game modes, AI difficulties, and a good selection of cosmetics
- **Clear value proposition**: Premium purchases should feel worthwhile, not exploitative

---

## 2. Free vs. Premium Content Division

### 2.1 Always Free (No Change)

| Category | Content | Unlock Method |
|---|---|---|
| Game Modes | Standard 10x10, Extended 15x15, Custom | Play games |
| AI Difficulty | Easy, Medium, Hard | Win games |
| Online Multiplayer | Quick Match, Private Room | Available immediately |
| Airplane Skins | 8 skins (blue, red, green, purple, orange, pink, cyan, yellow) | Play 0-40 games |
| Board Themes | 4 themes (Ocean Blue, Dark Mode, Pink Gradient, Sunset Sky) | Win 0-30 games |
| Achievements | All achievements | Earn through gameplay |
| Statistics | Full statistics tracking | Automatic |
| Leaderboard | View and compete | Automatic |

### 2.2 Premium-Only Content (New)

| Category | Content | Acquisition |
|---|---|---|
| Exclusive Airplane Skins | 4 premium skins (see Section 3) | Purchase only |
| Exclusive Board Themes | 3 premium themes (see Section 3) | Purchase only |
| Remove Ads | Remove all interstitial and banner ads | Purchase |
| Nickname Freedom | Remove 30-day nickname change cooldown | Purchase |

### 2.3 Dual-Path Content (Earnable OR Purchasable)

| Content | Free Unlock | Purchase Shortcut |
|---|---|---|
| Teal Wave skin | Play 50 games | Included in Skin Pack |
| Deep Indigo skin | Play 60 games | Included in Skin Pack |
| Neon Lime skin | Play 70 games | Included in Skin Pack |
| Rose Gold skin | Play 100 games | Included in Skin Pack |
| Forest Green theme | Win 40 games | Included in Theme Pack |
| Purple Dream theme | Win 50 games | Included in Theme Pack |
| Arctic White theme | Win 100 games | Included in Theme Pack |
| Golden Hour theme | Win 150 games | Included in Theme Pack |
| Nebula Space theme | Win 200 games | Included in Theme Pack |

---

## 3. IAP Product Catalog

### 3.1 Product List

| # | Product ID | Product Name | Type | Price (USD) | Price (CNY) | Description |
|---|---|---|---|---|---|---|
| 1 | `remove_ads` | Remove Ads | Non-consumable | $2.99 | 19 CNY | Permanently remove all ads |
| 2 | `premium_skin_pack` | Premium Skin Pack | Non-consumable | $1.99 | 12 CNY | 4 exclusive skins + instant unlock all earnable skins |
| 3 | `premium_theme_pack` | Premium Theme Pack | Non-consumable | $1.99 | 12 CNY | 3 exclusive themes + instant unlock all earnable themes |
| 4 | `ace_pilot_bundle` | Ace Pilot Bundle | Non-consumable | $4.99 | 30 CNY | Remove Ads + All Skins + All Themes + Nickname Freedom |
| 5 | `nickname_freedom` | Nickname Freedom | Non-consumable | $0.99 | 6 CNY | Remove 30-day nickname change cooldown |

### 3.2 Product Details

#### Product 1: Remove Ads ($2.99 / 19 CNY)
- Permanently removes all interstitial ads (between games)
- Permanently removes banner ads (main menu, profile)
- Does NOT affect rewarded video ads (user-initiated)
- Immediate effect upon purchase
- Restores across devices via Google Play purchase restore

#### Product 2: Premium Skin Pack ($1.99 / 12 CNY)
- Instantly unlocks ALL 12 earnable airplane skins (regardless of games played)
- Adds 4 exclusive premium-only skins:
  - **Diamond Blue** - Sparkling diamond gradient (id: `diamond`)
  - **Stealth Black** - Matte black stealth (id: `stealth`)
  - **Flame Red** - Animated flame pattern (id: `flame`)
  - **Aurora Green** - Northern lights shimmer (id: `aurora`)
- Exclusive skins are not available through gameplay

#### Product 3: Premium Theme Pack ($1.99 / 12 CNY)
- Instantly unlocks ALL 9 earnable board themes (regardless of wins)
- Adds 3 exclusive premium-only themes:
  - **Neon City** - Cyberpunk neon colors (id: `neon_city`)
  - **Cherry Blossom** - Soft pink sakura theme (id: `cherry_blossom`)
  - **Midnight Gold** - Black and gold luxury theme (id: `midnight_gold`)
- Exclusive themes are not available through gameplay

#### Product 4: Ace Pilot Bundle ($4.99 / 30 CNY)
- Includes EVERYTHING from Products 1, 2, 3, and 5
- Best value: saves $2.97 vs. buying individually
- Show "BEST VALUE" badge on store page
- Show crossed-out original total price ($7.96) next to bundle price

#### Product 5: Nickname Freedom ($0.99 / 6 CNY)
- Removes the 30-day cooldown on nickname changes
- User can change nickname anytime after purchase
- Other nickname rules still apply (max 20 chars, non-empty)

---

## 4. Store Page Design

### 4.1 Entry Point

Add a new navigation item accessible from:
- **Main Menu**: "Shop" button (between Profile and Settings in bottom buttons row)
- **Profile Screen**: "Shop" quick action item
- **Skins Screen**: "Get Premium Skins" button at top of locked items
- **Settings Screen**: "Premium" section with "Go to Shop" link

### 4.2 Shop Screen Layout

```
+================================+
|          Premium Shop          |
|     "Upgrade Your Experience"  |
+================================+

+--------------------------------+
| [BEST VALUE Badge]             |
| Ace Pilot Bundle     $4.99     |
| Everything included!           |
| - Remove all ads               |
| - All skins (16 total)         |
| - All themes (12 total)        |
| - Nickname freedom             |
| Was $7.96   Save 37%           |
|        [BUY NOW]               |
+--------------------------------+

+--------------------------------+
| Remove Ads            $2.99    |
| No more interruptions!         |
| Removes all interstitial and   |
| banner ads permanently.        |
|        [BUY]                   |
+--------------------------------+

+--------------------------------+
| Premium Skin Pack     $1.99    |
| 4 Exclusive + All 12 Skins    |
| [preview of 4 exclusive skins] |
|        [BUY]                   |
+--------------------------------+

+--------------------------------+
| Premium Theme Pack    $1.99    |
| 3 Exclusive + All 9 Themes    |
| [preview of 3 exclusive themes]|
|        [BUY]                   |
+--------------------------------+

+--------------------------------+
| Nickname Freedom      $0.99    |
| Change your name anytime!      |
|        [BUY]                   |
+--------------------------------+

+-- Restore Purchases -----------+
| Already purchased?             |
| [Restore Purchases]            |
+--------------------------------+
```

### 4.3 Visual Design
- Dark theme consistent with app (#1a1a2e background, #16213e cards)
- Premium items have a subtle gold/amber accent (#FFD700)
- Bundle card has a distinct border/glow effect to stand out
- Each product shows a preview of what's included
- Purchased items show a green checkmark and "OWNED" badge
- Price shown in user's local currency (Google Play handles conversion)

### 4.4 Purchase States

| State | Display |
|---|---|
| Not purchased | Price button: "BUY $X.XX" |
| Processing | Button shows loading spinner |
| Purchased | Green checkmark + "OWNED" badge, button disabled |
| Already included in bundle | "Included in Ace Pilot Bundle" note, button disabled |
| Purchase failed | Alert dialog with error and retry option |
| Restore in progress | Full-screen loading with "Restoring purchases..." |

---

## 5. Purchase Triggers & Guidance

### 5.1 Contextual Purchase Prompts

These are non-intrusive suggestions shown at strategic moments:

| Trigger | Location | Message | Frequency |
|---|---|---|---|
| After 3rd interstitial ad | Post-game screen | "Tired of ads? Remove them for just $2.99" [Remove Ads] [Later] | Once per session, max 3 times total |
| Viewing locked skin (play-gated) | Skins Screen | "Unlock instantly with Premium Skin Pack" link below lock text | Always shown for locked items |
| Viewing locked theme (win-gated) | Skins Screen | "Unlock instantly with Premium Theme Pack" link below lock text | Always shown for locked items |
| Trying to change nickname during cooldown | Profile Screen | "Want to change anytime? Get Nickname Freedom!" [Get It] [Wait X days] | Each time cooldown is hit |
| After 10th game session | Main Menu | One-time soft modal: "Enjoying the game? Check out premium upgrades!" [Visit Shop] [No thanks] | One time only |

### 5.2 Never-Interrupt Principle

- Purchase prompts NEVER appear during gameplay
- Purchase prompts NEVER block the user from accessing any feature
- All prompts are dismissible with a single tap
- Frequency caps are enforced per-prompt (stored in AsyncStorage)

---

## 6. Purchase Persistence & Restore

### 6.1 Storage Strategy

```
Purchase Records:
  - Google Play: Source of truth (server-side receipt verification)
  - AsyncStorage: Local cache for quick access
    Key: '@iap_purchases'
    Value: { remove_ads: boolean, premium_skins: boolean, premium_themes: boolean, ace_bundle: boolean, nickname_freedom: boolean }
  - Firestore: Backup record in user document
    Field: purchases: { productId: string, purchasedAt: number, orderId: string }[]
```

### 6.2 Restore Purchases Flow

```
User taps "Restore Purchases"
  |
  v
Query Google Play for purchase history
  |
  v
For each valid purchase:
  - Update AsyncStorage cache
  - Update Firestore user document
  - Apply effects (remove ads, unlock skins, etc.)
  |
  v
Show summary: "Restored X purchases"
  or "No purchases found"
```

### 6.3 Cross-Device Sync

- When user signs in with Google on a new device, restore purchases automatically
- Query Google Play purchases on sign-in
- Merge purchase records into Firestore user document

---

## 7. Google Play Store Requirements

### 7.1 IAP Setup in Play Console

For each product, create an "In-app product" (not subscription) in Google Play Console:

| Product ID | Title (max 55 chars) | Description (max 80 chars) |
|---|---|---|
| `remove_ads` | Remove Ads | Permanently remove all ads from the game |
| `premium_skin_pack` | Premium Skin Pack | 4 exclusive airplane skins + unlock all skins |
| `premium_theme_pack` | Premium Theme Pack | 3 exclusive board themes + unlock all themes |
| `ace_pilot_bundle` | Ace Pilot Bundle | All premium content: no ads, all skins & themes |
| `nickname_freedom` | Nickname Freedom | Change your nickname anytime, no cooldown |

### 7.2 Required NPM Package

```
react-native-iap
```

This is the standard cross-platform IAP library for React Native. Handles Google Play Billing on Android.

### 7.3 Compliance Notes

- All prices shown must come from Google Play (use localized prices from the store, not hardcoded)
- Restore purchases button must be accessible (required by Google Play policy)
- Non-consumable products must be restorable across devices
- No real-money gambling or loot boxes (we have none)

---

## 8. Impact on Existing Features

### 8.1 SkinConfig.ts Changes

- Add 4 new premium skins to `AIRPLANE_SKINS` array with `isPremium: true` flag
- Add 3 new premium themes to `BOARD_THEMES` array with `isPremium: true` flag
- Add `isPremium` field to `AirplaneSkin` and `BoardTheme` interfaces

### 8.2 SkinService.ts Changes

- Check purchase status before allowing premium skin/theme selection
- Method: `isPremiumUnlocked(skinId: string): boolean`
- Premium skins show "Premium" badge instead of unlock requirement text

### 8.3 SkinsScreen.tsx Changes

- Premium skins/themes show a gold border and "Premium" badge
- Locked premium items show "Buy Premium Pack" button instead of play requirement
- If user owns the pack, premium items are unlocked regardless of play count

### 8.4 ProfileScreen.tsx Changes

- Show "Premium" badge next to avatar if user owns Ace Pilot Bundle
- Nickname edit bypasses cooldown if Nickname Freedom is purchased

### 8.5 New Screen: ShopScreen.tsx

- New screen added to navigation stack
- Displays all IAP products with purchase buttons
- Handles purchase flow, error handling, and restoration

---

## 9. Revenue Projections (Reference)

| Scenario | Remove Ads Conv. | Bundle Conv. | Est. Monthly Revenue / 10K MAU |
|---|---|---|---|
| Conservative | 2% | 0.5% | ~$800 |
| Moderate | 5% | 1% | ~$2,000 |
| Optimistic | 8% | 2% | ~$4,000 |

*Note: These are rough estimates. Actual revenue depends on user acquisition, retention, and ad revenue baseline.*

---

## 10. Out of Scope (v1)

- Subscription model (monthly/yearly premium)
- Consumable items (coins, gems, lives)
- Season pass / battle pass
- Gifting / code redemption
- iOS App Store IAP (can be added when iOS build is ready)
- Real-money tournament entry fees
- Loot boxes or gacha mechanics
