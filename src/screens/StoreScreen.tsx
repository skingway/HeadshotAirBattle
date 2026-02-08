/**
 * Store Screen
 * Displays IAP products and handles purchases
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import IAPService from '../services/IAPService';
import {PRODUCT_IDS, PRODUCT_INFO} from '../config/IAPConfig';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  Store: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Store'>;
};

function AnimatedButton({
  onPress,
  style,
  children,
  disabled,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) Animated.spring(scaleAnim, {toValue: 0.97, useNativeDriver: true}).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true}).start();
      }}
      onPress={disabled ? undefined : onPress}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
    ]).start();
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
                Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
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

  const renderProductCard = (productId: string, highlight?: boolean) => {
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
          <AnimatedButton
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
              <Text style={[styles.buyButtonText, highlight && styles.buyButtonTextHighlight]}>
                {highlight ? 'BUY NOW' : 'BUY'}
              </Text>
            )}
          </AnimatedButton>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Loading Store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>STORE</Text>
            <Text style={styles.headerSubtitle}>Enhance Your Arsenal</Text>
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
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.restoreButtonText}>RESTORE PURCHASES</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>BACK TO MENU</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
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
    fontFamily: fonts.rajdhaniRegular,
    color: colors.textPrimary,
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: fonts.orbitronBlack,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  productCard: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
  },
  productCardHighlight: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  productCardPurchased: {
    opacity: 0.8,
    borderColor: colors.successBorder,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestValueText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 8,
    color: colors.bgPrimary,
    letterSpacing: 1,
  },
  ownedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ownedBadgeText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 8,
    color: colors.bgPrimary,
    letterSpacing: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    letterSpacing: 1,
  },
  productPrice: {
    fontFamily: fonts.orbitronBold,
    fontSize: 16,
    color: colors.gold,
  },
  productPricePurchased: {
    color: colors.success,
    fontSize: 12,
  },
  productDescription: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  savingsText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 13,
    color: colors.gold,
    marginBottom: 12,
  },
  buyButton: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  buyButtonHighlight: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  buyButtonDisabled: {
    opacity: 0.7,
  },
  buyButtonText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 2,
  },
  buyButtonTextHighlight: {
    color: colors.bgPrimary,
  },
  restoreSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  restoreHint: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  restoreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  restoreButtonDisabled: {
    opacity: 0.7,
  },
  restoreButtonText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 2,
  },
});
