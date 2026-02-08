import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import AdService from '../services/AdService';
import {AD_UNIT_IDS} from '../config/AdConfig';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  Game: {difficulty: string; mode: string; boardSize?: number; airplaneCount?: number};
  Settings: undefined;
  Profile: undefined;
  CustomMode: undefined;
  OnlineMode: undefined;
  Store: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainMenu'>;
};

function AnimatedButton({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() => {
        Animated.spring(scaleAnim, {toValue: 0.97, useNativeDriver: true}).start();
      }}
      onPressOut={() => {
        Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true}).start();
      }}
      onPress={onPress}>
      <Animated.View style={[style, {transform: [{scale: scaleAnim}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function MainMenuScreen({navigation}: Props) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
    ]).start();
  }, []);

  const startGame = (difficulty: string) => {
    if (selectedMode === 'standard') {
      navigation.navigate('Game', {difficulty, mode: 'standard', boardSize: 10, airplaneCount: 3});
    } else if (selectedMode === 'extended') {
      navigation.navigate('Game', {difficulty, mode: 'extended', boardSize: 15, airplaneCount: 6});
    }
  };

  const handleModeSelect = (mode: string) => {
    if (mode === 'custom') {
      navigation.navigate('CustomMode');
    } else {
      setSelectedMode(mode);
    }
  };

  const goBack = () => {
    setSelectedMode(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}], width: '100%', alignItems: 'center'}}>
          {/* Logo Area */}
          <View style={styles.logoArea}>
            <Animated.Text
              style={[styles.logoPlane, {transform: [{translateY: floatAnim}]}]}>
              {'✈️'}
            </Animated.Text>
            <Text style={styles.title}>HEADSHOT</Text>
            <Text style={styles.titleSub}>AIR BATTLE</Text>
          </View>

          {!selectedMode ? (
            <>
              <Text style={styles.subtitle}>CHOOSE GAME MODE</Text>

              <AnimatedButton
                style={[styles.button, styles.btnPrimary]}
                onPress={() => handleModeSelect('standard')}>
                <Text style={styles.btnPrimaryText}>STANDARD MODE</Text>
                <Text style={styles.buttonSubtext}>10x10 -- 3 Airplanes</Text>
              </AnimatedButton>

              <AnimatedButton
                style={[styles.button, styles.btnSecondary]}
                onPress={() => handleModeSelect('extended')}>
                <Text style={styles.btnSecondaryText}>EXTENDED MODE</Text>
                <Text style={[styles.buttonSubtext, {color: colors.accent}]}>15x15 -- 6 Airplanes</Text>
              </AnimatedButton>

              <AnimatedButton
                style={[styles.button, styles.btnTertiary]}
                onPress={() => handleModeSelect('custom')}>
                <Text style={styles.btnTertiaryText}>CUSTOM MODE</Text>
                <Text style={styles.buttonSubtext}>Custom Size -- Custom Count</Text>
              </AnimatedButton>

              <AnimatedButton
                style={[styles.button, styles.btnSecondary]}
                onPress={() => navigation.navigate('OnlineMode')}>
                <Text style={styles.btnSecondaryText}>ONLINE MULTIPLAYER</Text>
                <Text style={[styles.buttonSubtext, {color: colors.accent}]}>Play with real players</Text>
              </AnimatedButton>

              <View style={styles.bottomButtons}>
                <AnimatedButton
                  style={styles.smallButton}
                  onPress={() => navigation.navigate('Profile')}>
                  <Text style={styles.smallButtonText}>PROFILE</Text>
                </AnimatedButton>

                <AnimatedButton
                  style={[styles.smallButton, styles.smallButtonGold]}
                  onPress={() => navigation.navigate('Store')}>
                  <Text style={[styles.smallButtonText, {color: colors.gold}]}>SHOP</Text>
                </AnimatedButton>

                <AnimatedButton
                  style={styles.smallButton}
                  onPress={() => navigation.navigate('Settings')}>
                  <Text style={styles.smallButtonText}>SETTINGS</Text>
                </AnimatedButton>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                {selectedMode === 'standard' ? 'STANDARD MODE (10x10)' : 'EXTENDED MODE (15x15)'}
              </Text>
              <Text style={styles.modeHint}>Choose AI Difficulty</Text>

              <AnimatedButton
                style={[styles.button, styles.btnPrimary]}
                onPress={() => startGame('easy')}>
                <Text style={styles.btnPrimaryText}>EASY AI</Text>
                <Text style={styles.buttonSubtext}>Random attacks</Text>
              </AnimatedButton>

              <AnimatedButton
                style={[styles.button, styles.btnSecondary]}
                onPress={() => startGame('medium')}>
                <Text style={styles.btnSecondaryText}>MEDIUM AI</Text>
                <Text style={[styles.buttonSubtext, {color: colors.accent}]}>Smart tracking</Text>
              </AnimatedButton>

              <AnimatedButton
                style={[styles.button, styles.btnDanger]}
                onPress={() => startGame('hard')}>
                <Text style={styles.btnDangerText}>HARD AI (ULTRA V2)</Text>
                <Text style={[styles.buttonSubtext, {color: colors.danger}]}>Lock Head Algorithm</Text>
              </AnimatedButton>

              <AnimatedButton
                style={[styles.button, styles.btnTertiary, {marginTop: 20}]}
                onPress={goBack}>
                <Text style={styles.btnTertiaryText}>BACK TO MODES</Text>
              </AnimatedButton>
            </>
          )}
        </Animated.View>
      </ScrollView>
      {AdService.shouldShowBannerAd() && (
        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={AD_UNIT_IDS.BANNER_MAIN_MENU}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{requestNonPersonalizedAdsOnly: true}}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoPlane: {
    fontSize: 80,
    textShadowColor: colors.accentGlow,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 20,
  },
  title: {
    fontFamily: fonts.orbitronBlack,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 3,
    marginTop: 10,
  },
  titleSub: {
    fontFamily: fonts.orbitronRegular,
    fontSize: 10,
    color: 'rgba(0, 212, 255, 0.6)',
    letterSpacing: 6,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  modeHint: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 30,
  },
  button: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 12,
    marginVertical: 6,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  btnPrimaryText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  btnSecondary: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  btnSecondaryText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.accent,
    letterSpacing: 2,
  },
  btnTertiary: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  btnTertiaryText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  btnDanger: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  btnDangerText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.danger,
    letterSpacing: 2,
  },
  buttonSubtext: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  bottomButtons: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 300,
    justifyContent: 'space-between',
    marginTop: 30,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonGold: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  smallButtonText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  bannerContainer: {
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
});
