/**
 * Store Screen
 * Displays IAP products and handles purchases
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import IAPService from '../services/IAPService';
import {PRODUCT_IDS, PRODUCT_INFO} from '../config/IAPConfig';

type RootStackParamList = {
  MainMenu: undefined;
  Store: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Store'>;
};

export default function StoreScreen({navigation}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [purchaseState, setPurchaseState] = useState({
    removeAds: false,
    premiumSkins: false,
    premiumThemes: false,
    acePilotBundle: false,
    nicknameFreedom: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPurchaseState();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      await IAPService.fetchProducts();
      refreshPurchaseState();
    } catch (error) {
      console.error('[StoreScreen] Failed to load store data:', error);
    }
    setIsLoading(false);
  };

  const refreshPurchaseState = () => {
    const state = IAPService.getPurchaseState();
    setPurchaseState({
      removeAds: state.removeAds,
      premiumSkins: state.premiumSkins,
      premiumThemes: state.premiumThemes,
      acePilotBundle: state.acePilotBundle,
      nicknameFreedom: state.nicknameFreedom,
    });
  };

  const getPrice = (productId: string): string => {
    const product = IAPService.getProduct(productId);
    if (product) {
      return product.localizedPrice || PRODUCT_INFO[productId]?.fallbackPrice || '';
    }
    return PRODUCT_INFO[productId]?.fallbackPrice || '';
  };

  const handlePurchase = async (productId: string) => {
    if (IAPService.isPurchased(productId)) return;

    const info = PRODUCT_INFO[productId];
    const price = getPrice(productId);

    Alert.alert(
      'Confirm Purchase',
      `Purchase ${info?.title} for ${price}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Purchase',
          onPress: async () => {
            setIsPurchasing(productId);
            try {
              await IAPService.purchaseProduct(productId);
              refreshPurchaseState();
            } catch (error: any) {
              if (error.message !== 'E_USER_CANCELLED') {
                Alert.alert(
                  'Purchase Failed',
                  'Unable to complete purchase. Please try again.',
                );
              }
            }
            setIsPurchasing(null);
          },
        },
      ],
    );
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const restored = await IAPService.restorePurchases();
      refreshPurchaseState();
      if (restored.length > 0) {
        Alert.alert('Restored', `Restored ${restored.length} purchase(s).`);
      } else {
        Alert.alert('No Purchases', 'No previous purchases found.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
    setIsRestoring(false);
  };

  const isPurchased = (productId: string) => IAPService.isPurchased(productId);

  const renderProductCard = (
    productId: string,
    highlight?: boolean,
  ) => {
    const info = PRODUCT_INFO[productId];
    if (!info) return null;

    const purchased = isPurchased(productId);
    const price = getPrice(productId);
    const purchasing = isPurchasing === productId;

    return (
      <View
        style={[
          styles.productCard,
          highlight && styles.productCardHighlight,
          purchased && styles.productCardPurchased,
        ]}
        key={productId}>
        {highlight && !purchased && (
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
        )}
        {purchased && (
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>OWNED</Text>
          </View>
        )}
        <View style={styles.productHeader}>
          <Text style={styles.productTitle}>{info.title}</Text>
          <Text style={[styles.productPrice, purchased && styles.productPricePurchased]}>
            {purchased ? 'Purchased' : price}
          </Text>
        </View>
        <Text style={styles.productDescription}>{info.description}</Text>
        {productId === PRODUCT_IDS.ACE_PILOT_BUNDLE && !purchased && (
          <Text style={styles.savingsText}>
            Save 37% vs. buying separately
          </Text>
        )}
        {!purchased && (
          <TouchableOpacity
            style={[
              styles.buyButton,
              highlight && styles.buyButtonHighlight,
              purchasing && styles.buyButtonDisabled,
            ]}
            onPress={() => handlePurchase(productId)}
            disabled={purchasing || purchased}>
            {purchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buyButtonText}>
                {highlight ? 'BUY NOW' : 'BUY'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading Store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Premium Shop</Text>
          <Text style={styles.subtitle}>Upgrade Your Experience</Text>
        </View>

        {/* Bundle (highlighted) */}
        {renderProductCard(PRODUCT_IDS.ACE_PILOT_BUNDLE, true)}

        {/* Individual products */}
        {renderProductCard(PRODUCT_IDS.REMOVE_ADS)}
        {renderProductCard(PRODUCT_IDS.PREMIUM_SKIN_PACK)}
        {renderProductCard(PRODUCT_IDS.PREMIUM_THEME_PACK)}
        {renderProductCard(PRODUCT_IDS.NICKNAME_FREEDOM)}

        {/* Restore Purchases */}
        <View style={styles.restoreSection}>
          <Text style={styles.restoreHint}>Already purchased?</Text>
          <TouchableOpacity
            style={[styles.restoreButton, isRestoring && styles.restoreButtonDisabled]}
            onPress={handleRestore}
            disabled={isRestoring}>
            {isRestoring ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  productCardHighlight: {
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  productCardPurchased: {
    opacity: 0.8,
    borderColor: '#4CAF50',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  ownedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ownedBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  productPricePurchased: {
    color: '#4CAF50',
    fontSize: 14,
  },
  productDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 12,
    lineHeight: 20,
  },
  savingsText: {
    fontSize: 13,
    color: '#FFD700',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  buyButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonHighlight: {
    backgroundColor: '#FFD700',
  },
  buyButtonDisabled: {
    opacity: 0.7,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  restoreSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#0f3460',
  },
  restoreHint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  restoreButton: {
    backgroundColor: '#607D8B',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  restoreButtonDisabled: {
    opacity: 0.7,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#607D8B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
