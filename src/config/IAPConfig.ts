/**
 * IAP Configuration
 * Product IDs and IAP-related constants
 */

import {Platform} from 'react-native';

// Product IDs (must match Google Play Console / App Store Connect)
export const PRODUCT_IDS = {
  REMOVE_ADS: 'remove_ads',
  PREMIUM_SKIN_PACK: 'premium_skin_pack',
  PREMIUM_THEME_PACK: 'premium_theme_pack',
  ACE_PILOT_BUNDLE: 'ace_pilot_bundle',
  NICKNAME_FREEDOM: 'nickname_freedom',
} as const;

// All product IDs as an array for fetching from store
export const ALL_PRODUCT_IDS = [
  PRODUCT_IDS.REMOVE_ADS,
  PRODUCT_IDS.PREMIUM_SKIN_PACK,
  PRODUCT_IDS.PREMIUM_THEME_PACK,
  PRODUCT_IDS.ACE_PILOT_BUNDLE,
  PRODUCT_IDS.NICKNAME_FREEDOM,
];

// Product display info (fallback when store data is unavailable)
export const PRODUCT_INFO = {
  [PRODUCT_IDS.REMOVE_ADS]: {
    title: 'Remove Ads',
    description: 'Permanently remove all interstitial and banner ads.',
    fallbackPrice: '$2.99',
  },
  [PRODUCT_IDS.PREMIUM_SKIN_PACK]: {
    title: 'Premium Skin Pack',
    description: '4 exclusive airplane skins + unlock all earnable skins.',
    fallbackPrice: '$1.99',
  },
  [PRODUCT_IDS.PREMIUM_THEME_PACK]: {
    title: 'Premium Theme Pack',
    description: '3 exclusive board themes + unlock all earnable themes.',
    fallbackPrice: '$1.99',
  },
  [PRODUCT_IDS.ACE_PILOT_BUNDLE]: {
    title: 'Ace Pilot Bundle',
    description: 'All premium content: no ads, all skins & themes, nickname freedom.',
    fallbackPrice: '$4.99',
    isBestValue: true,
  },
  [PRODUCT_IDS.NICKNAME_FREEDOM]: {
    title: 'Nickname Freedom',
    description: 'Change your nickname anytime, no 30-day cooldown.',
    fallbackPrice: '$0.99',
  },
} as const;

// Premium skin IDs (only unlockable via purchase)
export const PREMIUM_SKIN_IDS = ['diamond', 'stealth', 'flame', 'aurora'];

// Premium theme IDs (only unlockable via purchase)
export const PREMIUM_THEME_IDS = ['neon_city', 'cherry_blossom', 'midnight_gold'];

// Which products unlock which features
export const PRODUCT_UNLOCKS: Record<string, string[]> = {
  [PRODUCT_IDS.REMOVE_ADS]: ['remove_ads'],
  [PRODUCT_IDS.PREMIUM_SKIN_PACK]: ['premium_skins', 'all_earnable_skins'],
  [PRODUCT_IDS.PREMIUM_THEME_PACK]: ['premium_themes', 'all_earnable_themes'],
  [PRODUCT_IDS.ACE_PILOT_BUNDLE]: [
    'remove_ads',
    'premium_skins',
    'all_earnable_skins',
    'premium_themes',
    'all_earnable_themes',
    'nickname_freedom',
  ],
  [PRODUCT_IDS.NICKNAME_FREEDOM]: ['nickname_freedom'],
};

// AsyncStorage key for purchase state
export const IAP_STORAGE_KEY = '@iap_purchases';

export default {
  PRODUCT_IDS,
  ALL_PRODUCT_IDS,
  PRODUCT_INFO,
  PREMIUM_SKIN_IDS,
  PREMIUM_THEME_IDS,
  PRODUCT_UNLOCKS,
  IAP_STORAGE_KEY,
};
