/**
 * AdMob Ad Configuration
 * Ad unit IDs and frequency settings
 */

import {Platform} from 'react-native';
import {TestIds} from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;

export const AD_UNIT_IDS = {
  BANNER_MAIN_MENU: IS_DEV
    ? TestIds.BANNER
    : Platform.select({
        android: 'ca-app-pub-3709728062444091/1039811274',
        ios: 'ca-app-pub-XXXXX/XXXXX',
      })!,

  BANNER_PROFILE: IS_DEV
    ? TestIds.BANNER
    : Platform.select({
        android: 'ca-app-pub-3709728062444091/1039811274',
        ios: 'ca-app-pub-XXXXX/XXXXX',
      })!,

  INTERSTITIAL_GAME_OVER: IS_DEV
    ? TestIds.INTERSTITIAL
    : Platform.select({
        android: 'ca-app-pub-3709728062444091/4686676158',
        ios: 'ca-app-pub-XXXXX/XXXXX',
      })!,
};

// Ad display frequency control
export const AD_FREQUENCY = {
  INTERSTITIAL_EVERY_N_GAMES: 3, // Show interstitial every 3 games
  MIN_INTERVAL_SECONDS: 60, // Minimum 60 seconds between interstitials
};
