/**
 * IAP Service
 * Handles in-app purchase flow, product listing, and purchase state management
 */

import {Platform} from 'react-native';
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import {
  ALL_PRODUCT_IDS,
  PRODUCT_IDS,
  IAP_STORAGE_KEY,
  PRODUCT_UNLOCKS,
  PREMIUM_SKIN_IDS,
  PREMIUM_THEME_IDS,
} from '../config/IAPConfig';
import AuthService from './AuthService';
import FirebaseService from './FirebaseService';

interface PurchaseState {
  removeAds: boolean;
  premiumSkins: boolean;
  premiumThemes: boolean;
  acePilotBundle: boolean;
  nicknameFreedom: boolean;
  purchaseHistory: PurchaseRecord[];
  lastSyncedAt: number;
}

interface PurchaseRecord {
  productId: string;
  purchasedAt: number;
  platform: 'android' | 'ios';
  transactionId: string;
}

class IAPServiceClass {
  private isConnected: boolean = false;
  private products: Product[] = [];
  private purchaseState: PurchaseState;
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private purchaseListeners: Array<(productId: string) => void> = [];

  constructor() {
    this.purchaseState = this.getDefaultState();
  }

  private getDefaultState(): PurchaseState {
    return {
      removeAds: false,
      premiumSkins: false,
      premiumThemes: false,
      acePilotBundle: false,
      nicknameFreedom: false,
      purchaseHistory: [],
      lastSyncedAt: 0,
    };
  }

  /**
   * Initialize IAP connection and load purchase state
   */
  async initialize(): Promise<void> {
    try {
      console.log('[IAPService] Initializing...');

      // Load local purchase state first
      await this.loadLocalState();

      // Initialize store connection
      const result = await initConnection();
      this.isConnected = true;
      console.log('[IAPService] Store connection established');

      // Set up purchase listeners
      this.setupListeners();

      // Fetch products from store
      await this.fetchProducts();

      // Sync with cloud if user is authenticated
      await this.syncFromCloud();

      console.log('[IAPService] Initialized successfully');
    } catch (error) {
      console.warn('[IAPService] Initialization failed:', error);
      // App can still work with local state
    }
  }

  /**
   * Set up purchase update and error listeners
   */
  private setupListeners(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('[IAPService] Purchase updated:', purchase.productId);

        try {
          // Verify purchase
          const verified = this.verifyPurchase(purchase);
          if (verified) {
            // Record purchase
            await this.recordPurchase(
              purchase.productId,
              purchase.transactionId || `txn_${Date.now()}`,
            );

            // Finish transaction
            await finishTransaction({purchase, isConsumable: false});

            // Notify listeners
            this.notifyPurchaseListeners(purchase.productId);

            console.log('[IAPService] Purchase completed:', purchase.productId);
          }
        } catch (error) {
          console.error('[IAPService] Error processing purchase:', error);
        }
      },
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        if (error.code !== 'E_USER_CANCELLED') {
          console.error('[IAPService] Purchase error:', error);
        }
      },
    );
  }

  /**
   * Fetch products from store
   */
  async fetchProducts(): Promise<Product[]> {
    if (!this.isConnected) {
      console.warn('[IAPService] Not connected to store');
      return [];
    }

    try {
      const products = await getProducts({skus: ALL_PRODUCT_IDS});
      this.products = products;
      console.log('[IAPService] Fetched', products.length, 'products');
      return products;
    } catch (error) {
      console.error('[IAPService] Failed to fetch products:', error);
      return [];
    }
  }

  /**
   * Get cached products
   */
  getProducts(): Product[] {
    return this.products;
  }

  /**
   * Get product by ID
   */
  getProduct(productId: string): Product | undefined {
    return this.products.find((p) => p.productId === productId);
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Store not connected');
    }

    if (this.isPurchased(productId)) {
      return true; // Already purchased
    }

    try {
      console.log('[IAPService] Requesting purchase:', productId);
      await requestPurchase({skus: [productId]});
      // Purchase result will come through the listener
      return true;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        return false;
      }
      console.error('[IAPService] Purchase request failed:', error);
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<string[]> {
    if (!this.isConnected) {
      throw new Error('Store not connected');
    }

    try {
      console.log('[IAPService] Restoring purchases...');
      const purchases = await getAvailablePurchases();
      const restoredIds: string[] = [];

      for (const purchase of purchases) {
        const verified = this.verifyPurchase(purchase);
        if (verified) {
          await this.recordPurchase(
            purchase.productId,
            purchase.transactionId || `restored_${Date.now()}`,
          );
          restoredIds.push(purchase.productId);
        }
      }

      // Sync to cloud
      await this.syncToCloud();

      console.log('[IAPService] Restored', restoredIds.length, 'purchases');
      return restoredIds;
    } catch (error) {
      console.error('[IAPService] Restore failed:', error);
      throw error;
    }
  }

  /**
   * Verify a purchase (client-side)
   */
  private verifyPurchase(purchase: Purchase): boolean {
    if (Platform.OS === 'android') {
      return purchase.purchaseStateAndroid === 1; // PURCHASED
    }
    return purchase.transactionReceipt !== undefined;
  }

  /**
   * Record a verified purchase
   */
  private async recordPurchase(
    productId: string,
    transactionId: string,
  ): Promise<void> {
    // Update purchase state flags
    switch (productId) {
      case PRODUCT_IDS.REMOVE_ADS:
        this.purchaseState.removeAds = true;
        break;
      case PRODUCT_IDS.PREMIUM_SKIN_PACK:
        this.purchaseState.premiumSkins = true;
        break;
      case PRODUCT_IDS.PREMIUM_THEME_PACK:
        this.purchaseState.premiumThemes = true;
        break;
      case PRODUCT_IDS.ACE_PILOT_BUNDLE:
        this.purchaseState.acePilotBundle = true;
        this.purchaseState.removeAds = true;
        this.purchaseState.premiumSkins = true;
        this.purchaseState.premiumThemes = true;
        this.purchaseState.nicknameFreedom = true;
        break;
      case PRODUCT_IDS.NICKNAME_FREEDOM:
        this.purchaseState.nicknameFreedom = true;
        break;
    }

    // Add to history
    this.purchaseState.purchaseHistory.push({
      productId,
      purchasedAt: Date.now(),
      platform: Platform.OS as 'android' | 'ios',
      transactionId,
    });

    // Save locally
    await this.saveLocalState();

    // Sync to cloud
    await this.syncToCloud();
  }

  /**
   * Check if a product is purchased
   */
  isPurchased(productId: string): boolean {
    switch (productId) {
      case PRODUCT_IDS.REMOVE_ADS:
        return this.purchaseState.removeAds || this.purchaseState.acePilotBundle;
      case PRODUCT_IDS.PREMIUM_SKIN_PACK:
        return this.purchaseState.premiumSkins || this.purchaseState.acePilotBundle;
      case PRODUCT_IDS.PREMIUM_THEME_PACK:
        return this.purchaseState.premiumThemes || this.purchaseState.acePilotBundle;
      case PRODUCT_IDS.ACE_PILOT_BUNDLE:
        return this.purchaseState.acePilotBundle;
      case PRODUCT_IDS.NICKNAME_FREEDOM:
        return this.purchaseState.nicknameFreedom || this.purchaseState.acePilotBundle;
      default:
        return false;
    }
  }

  /**
   * Check if ads are removed
   */
  isAdsRemoved(): boolean {
    return this.purchaseState.removeAds || this.purchaseState.acePilotBundle;
  }

  /**
   * Check if premium skins are unlocked
   */
  hasPremiumSkins(): boolean {
    return this.purchaseState.premiumSkins || this.purchaseState.acePilotBundle;
  }

  /**
   * Check if premium themes are unlocked
   */
  hasPremiumThemes(): boolean {
    return this.purchaseState.premiumThemes || this.purchaseState.acePilotBundle;
  }

  /**
   * Check if nickname freedom is purchased
   */
  hasNicknameFreedom(): boolean {
    return this.purchaseState.nicknameFreedom || this.purchaseState.acePilotBundle;
  }

  /**
   * Check if a specific skin is unlocked via IAP
   */
  isSkinUnlockedByIAP(skinId: string): boolean {
    if (!PREMIUM_SKIN_IDS.includes(skinId)) {
      return false;
    }
    return this.hasPremiumSkins();
  }

  /**
   * Check if a specific theme is unlocked via IAP
   */
  isThemeUnlockedByIAP(themeId: string): boolean {
    if (!PREMIUM_THEME_IDS.includes(themeId)) {
      return false;
    }
    return this.hasPremiumThemes();
  }

  /**
   * Check if all earnable skins are unlocked via IAP purchase
   */
  areAllEarnableSkinsUnlocked(): boolean {
    return this.purchaseState.premiumSkins || this.purchaseState.acePilotBundle;
  }

  /**
   * Check if all earnable themes are unlocked via IAP purchase
   */
  areAllEarnableThemesUnlocked(): boolean {
    return this.purchaseState.premiumThemes || this.purchaseState.acePilotBundle;
  }

  /**
   * Load purchase state from local storage
   */
  private async loadLocalState(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(IAP_STORAGE_KEY);
      if (saved) {
        this.purchaseState = {...this.getDefaultState(), ...JSON.parse(saved)};
        console.log('[IAPService] Loaded local purchase state');
      }
    } catch (error) {
      console.error('[IAPService] Failed to load local state:', error);
    }
  }

  /**
   * Save purchase state to local storage
   */
  private async saveLocalState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        IAP_STORAGE_KEY,
        JSON.stringify(this.purchaseState),
      );
    } catch (error) {
      console.error('[IAPService] Failed to save local state:', error);
    }
  }

  /**
   * Sync purchase state to Firestore
   */
  private async syncToCloud(): Promise<void> {
    if (FirebaseService.isOffline()) return;

    const userId = AuthService.getUserId();
    if (!userId) return;

    try {
      await firestore().collection('users').doc(userId).set(
        {
          purchases: {
            removeAds: this.purchaseState.removeAds,
            premiumSkins: this.purchaseState.premiumSkins,
            premiumThemes: this.purchaseState.premiumThemes,
            acePilotBundle: this.purchaseState.acePilotBundle,
            nicknameFreedom: this.purchaseState.nicknameFreedom,
            purchaseHistory: this.purchaseState.purchaseHistory,
          },
        },
        {merge: true},
      );
      this.purchaseState.lastSyncedAt = Date.now();
      await this.saveLocalState();
      console.log('[IAPService] Synced to cloud');
    } catch (error) {
      console.warn('[IAPService] Cloud sync failed:', error);
    }
  }

  /**
   * Sync purchase state from Firestore
   */
  private async syncFromCloud(): Promise<void> {
    if (FirebaseService.isOffline()) return;

    const userId = AuthService.getUserId();
    if (!userId) return;

    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.purchases) {
          // Merge cloud state with local (take the "most purchased" state)
          this.purchaseState.removeAds =
            this.purchaseState.removeAds || data.purchases.removeAds || false;
          this.purchaseState.premiumSkins =
            this.purchaseState.premiumSkins ||
            data.purchases.premiumSkins ||
            false;
          this.purchaseState.premiumThemes =
            this.purchaseState.premiumThemes ||
            data.purchases.premiumThemes ||
            false;
          this.purchaseState.acePilotBundle =
            this.purchaseState.acePilotBundle ||
            data.purchases.acePilotBundle ||
            false;
          this.purchaseState.nicknameFreedom =
            this.purchaseState.nicknameFreedom ||
            data.purchases.nicknameFreedom ||
            false;

          await this.saveLocalState();
          console.log('[IAPService] Synced from cloud');
        }
      }
    } catch (error) {
      console.warn('[IAPService] Cloud sync from failed:', error);
    }
  }

  /**
   * Add purchase listener
   */
  addPurchaseListener(callback: (productId: string) => void): void {
    this.purchaseListeners.push(callback);
  }

  /**
   * Remove purchase listener
   */
  removePurchaseListener(callback: (productId: string) => void): void {
    const index = this.purchaseListeners.indexOf(callback);
    if (index > -1) {
      this.purchaseListeners.splice(index, 1);
    }
  }

  /**
   * Notify purchase listeners
   */
  private notifyPurchaseListeners(productId: string): void {
    this.purchaseListeners.forEach((listener) => {
      try {
        listener(productId);
      } catch (error) {
        console.error('[IAPService] Listener error:', error);
      }
    });
  }

  /**
   * Get purchase state (for display purposes)
   */
  getPurchaseState(): PurchaseState {
    return {...this.purchaseState};
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    if (this.isConnected) {
      endConnection();
      this.isConnected = false;
    }
    console.log('[IAPService] Cleaned up');
  }
}

const IAPService = new IAPServiceClass();
export default IAPService;
