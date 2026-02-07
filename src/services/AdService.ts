/**
 * Ad Service
 * Manages interstitial and banner ad lifecycle, IAP integration
 */

import {
  InterstitialAd,
  AdEventType,
  AdsConsent,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';
import {AD_UNIT_IDS, AD_FREQUENCY} from '../config/AdConfig';
import IAPService from './IAPService';

class AdServiceClass {
  private adsRemoved: boolean = false;
  private interstitialAd: InterstitialAd | null = null;
  private interstitialLoaded: boolean = false;
  private gamesPlayedSinceLastAd: number = 0;
  private lastAdShownAt: number = 0;
  private interstitialUnsubscribe: (() => void) | null = null;
  private purchaseListenerBound: boolean = false;

  /**
   * Initialize ad service
   * Non-blocking - should not await in App initialization
   */
  async initialize(): Promise<void> {
    try {
      console.log('[AdService] Initializing...');

      // Check if ads are removed via IAP
      this.adsRemoved = IAPService.isAdsRemoved();

      if (this.adsRemoved) {
        console.log('[AdService] Ads removed via IAP, skipping initialization');
        return;
      }

      // Listen for IAP "remove ads" purchase
      if (!this.purchaseListenerBound) {
        IAPService.addPurchaseListener(this.handlePurchase);
        this.purchaseListenerBound = true;
      }

      // Handle GDPR consent (iOS ATT is handled via UMP)
      await this.handleConsent();

      // Preload first interstitial
      this.loadInterstitial();

      console.log('[AdService] Initialized successfully');
    } catch (error) {
      console.warn('[AdService] Initialization failed:', error);
      // Continue without ads - never crash
    }
  }

  /**
   * Handle GDPR/ATT consent via UMP SDK
   */
  private async handleConsent(): Promise<void> {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate();
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdsConsentStatus.REQUIRED
      ) {
        await AdsConsent.showForm();
      }
    } catch (error) {
      console.warn('[AdService] Consent handling failed:', error);
      // Continue with non-personalized ads
    }
  }

  /**
   * Load an interstitial ad
   */
  private loadInterstitial(): void {
    if (this.adsRemoved) return;

    try {
      // Clean up previous ad
      this.destroyInterstitial();

      const interstitial = InterstitialAd.createForAdRequest(
        AD_UNIT_IDS.INTERSTITIAL_GAME_OVER,
        {
          requestNonPersonalizedAdsOnly: true,
        },
      );

      const unsubscribeLoaded = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          this.interstitialLoaded = true;
          console.log('[AdService] Interstitial loaded');
        },
      );

      const unsubscribeClosed = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          this.interstitialLoaded = false;
          // Preload next interstitial
          this.loadInterstitial();
        },
      );

      const unsubscribeError = interstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.warn('[AdService] Interstitial load error:', error);
          this.interstitialLoaded = false;
          // Retry after 30 seconds
          setTimeout(() => {
            if (!this.adsRemoved) {
              this.loadInterstitial();
            }
          }, 30000);
        },
      );

      this.interstitialUnsubscribe = () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };

      this.interstitialAd = interstitial;
      interstitial.load();
    } catch (error) {
      console.warn('[AdService] Failed to create interstitial:', error);
    }
  }

  /**
   * Destroy current interstitial ad
   */
  private destroyInterstitial(): void {
    if (this.interstitialUnsubscribe) {
      this.interstitialUnsubscribe();
      this.interstitialUnsubscribe = null;
    }
    this.interstitialAd = null;
    this.interstitialLoaded = false;
  }

  /**
   * Increment the game counter (call after each game ends)
   */
  incrementGameCount(): void {
    this.gamesPlayedSinceLastAd++;
  }

  /**
   * Show interstitial ad if conditions are met
   * Returns true if ad was shown
   */
  async showInterstitialIfReady(): Promise<boolean> {
    if (this.adsRemoved) return false;
    if (!this.interstitialLoaded || !this.interstitialAd) return false;

    // Check frequency: every N games
    if (this.gamesPlayedSinceLastAd < AD_FREQUENCY.INTERSTITIAL_EVERY_N_GAMES) {
      return false;
    }

    // Check minimum interval
    const now = Date.now();
    const elapsed = (now - this.lastAdShownAt) / 1000;
    if (this.lastAdShownAt > 0 && elapsed < AD_FREQUENCY.MIN_INTERVAL_SECONDS) {
      return false;
    }

    try {
      this.interstitialAd.show();
      this.gamesPlayedSinceLastAd = 0;
      this.lastAdShownAt = Date.now();
      return true;
    } catch (error) {
      console.warn('[AdService] Failed to show interstitial:', error);
      return false;
    }
  }

  /**
   * Check if banner ads should be shown
   */
  shouldShowBannerAd(): boolean {
    return !this.adsRemoved;
  }

  /**
   * Handle IAP purchase - check if ads should be removed
   */
  private handlePurchase = (productId: string): void => {
    if (IAPService.isAdsRemoved()) {
      this.onAdsRemoved();
    }
  };

  /**
   * Called when user purchases "Remove Ads" or bundle
   * Immediately stops all ads
   */
  onAdsRemoved(): void {
    console.log('[AdService] Ads removed - stopping all ads');
    this.adsRemoved = true;
    this.destroyInterstitial();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.destroyInterstitial();
    if (this.purchaseListenerBound) {
      IAPService.removePurchaseListener(this.handlePurchase);
      this.purchaseListenerBound = false;
    }
    console.log('[AdService] Cleaned up');
  }
}

const AdService = new AdServiceClass();
export default AdService;
