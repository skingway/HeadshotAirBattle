import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import AdService from '../services/AdService';
import {AD_UNIT_IDS} from '../config/AdConfig';

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

export default function MainMenuScreen({navigation}: Props) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const startGame = (difficulty: string) => {
    if (selectedMode === 'standard') {
      navigation.navigate('Game', {difficulty, mode: 'standard', boardSize: 10, airplaneCount: 3});
    } else if (selectedMode === 'extended') {
      navigation.navigate('Game', {difficulty, mode: 'extended', boardSize: 15, airplaneCount: 6});
    }
  };

  const handleModeSelect = (mode: string) => {
    if (mode === 'custom') {
      // Navigate to custom mode configuration screen
      navigation.navigate('CustomMode');
    } else {
      // Set mode and show difficulty selection
      setSelectedMode(mode);
    }
  };

  const goBack = () => {
    setSelectedMode(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Headshot: Air Battle</Text>

        {!selectedMode ? (
          // Mode Selection Screen
          <>
            <Text style={styles.subtitle}>Choose Game Mode</Text>

            <TouchableOpacity
              style={[styles.button, styles.standardButton]}
              onPress={() => handleModeSelect('standard')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Standard Mode</Text>
              <Text style={styles.buttonSubtext}>10×10 · 3 Airplanes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.extendedButton]}
              onPress={() => handleModeSelect('extended')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Extended Mode</Text>
              <Text style={styles.buttonSubtext}>15×15 · 6 Airplanes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.customButton]}
              onPress={() => handleModeSelect('custom')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Custom Mode</Text>
              <Text style={styles.buttonSubtext}>Custom Size · Custom Count</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.onlineButton]}
              onPress={() => navigation.navigate('OnlineMode')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>🌐 Online Multiplayer</Text>
              <Text style={styles.buttonSubtext}>Play with real players</Text>
            </TouchableOpacity>

            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={[styles.smallButton, styles.profileButton]}
                onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.smallButtonText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, styles.shopButton]}
                onPress={() => navigation.navigate('Store')}>
                <Text style={styles.smallButtonText}>Shop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, styles.settingsButton]}
                onPress={() => navigation.navigate('Settings')}>
                <Text style={styles.smallButtonText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Difficulty Selection Screen
          <>
            <Text style={styles.subtitle}>
              {selectedMode === 'standard' ? 'Standard Mode (10×10)' : 'Extended Mode (15×15)'}
            </Text>
            <Text style={styles.modeHint}>Choose AI Difficulty</Text>

            <TouchableOpacity
              style={[styles.button, styles.easyButton]}
              onPress={() => startGame('easy')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Easy AI</Text>
              <Text style={styles.buttonSubtext}>Random attacks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.mediumButton]}
              onPress={() => startGame('medium')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Medium AI</Text>
              <Text style={styles.buttonSubtext}>Smart tracking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.hardButton]}
              onPress={() => startGame('hard')}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Hard AI (Ultra V2)</Text>
              <Text style={styles.buttonSubtext}>Lock Head Algorithm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={goBack}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>← Back to Modes</Text>
            </TouchableOpacity>
          </>
        )}
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
    backgroundColor: '#1a1a2e',
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  modeHint: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 30,
  },
  button: {
    width: '100%',
    maxWidth: 300,
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },
  standardButton: {
    backgroundColor: '#2196F3',
  },
  extendedButton: {
    backgroundColor: '#9C27B0',
  },
  customButton: {
    backgroundColor: '#FF5722',
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#66BB6A',
  },
  easyButton: {
    backgroundColor: '#4CAF50',
  },
  mediumButton: {
    backgroundColor: '#FF9800',
  },
  hardButton: {
    backgroundColor: '#F44336',
  },
  backButton: {
    backgroundColor: '#607D8B',
    marginTop: 20,
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
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  profileButton: {
    backgroundColor: '#2196F3',
  },
  shopButton: {
    backgroundColor: '#FFD700',
  },
  settingsButton: {
    backgroundColor: '#607D8B',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  smallButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  bannerContainer: {
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
});
