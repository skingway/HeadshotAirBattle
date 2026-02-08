import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import AudioManager from '../services/AudioManager';
import AuthService from '../services/AuthService';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  Game: {difficulty: string};
  Settings: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

export default function SettingsScreen({navigation}: Props) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>('anonymous');

  useEffect(() => {
    loadSettings();
    loadAuthStatus();
  }, []);

  const loadAuthStatus = () => {
    setAuthProvider(AuthService.getAuthProvider());
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await AuthService.signInWithGoogle();
      if (result.success) {
        Alert.alert('Success', 'Signed in with Google successfully!');
        loadAuthStatus();
      } else if (result.conflict) {
        Alert.alert(
          'Account Conflict',
          result.message || 'This Google account is already linked to another player profile.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Switch to that account',
              onPress: async () => {
                setIsSigningIn(true);
                const switchResult = await AuthService.switchToGoogleAccount();
                setIsSigningIn(false);
                if (switchResult.success) {
                  Alert.alert('Success', 'Switched to Google account!');
                  loadAuthStatus();
                } else {
                  Alert.alert('Error', switchResult.message || 'Failed to switch account.');
                }
              },
            },
          ],
        );
      } else if (result.message && result.message !== 'Sign-in cancelled.') {
        Alert.alert('Sign-In Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    }
    setIsSigningIn(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Sign out? You can sign in again anytime.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              loadAuthStatus();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out.');
            }
          },
        },
      ],
    );
  };

  const loadSettings = () => {
    const settings = AudioManager.getSettings();
    setAudioEnabled(settings.enabled);
    setBgmVolume(settings.bgmVolume);
    setSfxVolume(settings.sfxVolume);
  };

  const handleAudioToggle = async (value: boolean) => {
    setAudioEnabled(value);
    await AudioManager.setEnabled(value);
  };

  const handleBGMVolumeChange = async (direction: 'up' | 'down') => {
    const newVolume = direction === 'up'
      ? Math.min(1, bgmVolume + 0.1)
      : Math.max(0, bgmVolume - 0.1);
    setBgmVolume(newVolume);
    await AudioManager.setBGMVolume(newVolume);
  };

  const handleSFXVolumeChange = async (direction: 'up' | 'down') => {
    const newVolume = direction === 'up'
      ? Math.min(1, sfxVolume + 0.1)
      : Math.max(0, sfxVolume - 0.1);
    setSfxVolume(newVolume);
    await AudioManager.setSFXVolume(newVolume);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Audio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Enable Audio</Text>
            <Switch
              value={audioEnabled}
              onValueChange={handleAudioToggle}
              trackColor={{false: 'rgba(255,255,255,0.15)', true: colors.accent}}
              thumbColor={audioEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>BGM Volume</Text>
            <View style={styles.volumeControl}>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleBGMVolumeChange('down')}>
                <Text style={styles.volumeButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.volumeValue}>
                {Math.round(bgmVolume * 100)}%
              </Text>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleBGMVolumeChange('up')}>
                <Text style={styles.volumeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>SFX Volume</Text>
            <View style={styles.volumeControl}>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleSFXVolumeChange('down')}>
                <Text style={styles.volumeButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.volumeValue}>
                {Math.round(sfxVolume * 100)}%
              </Text>
              <TouchableOpacity
                style={styles.volumeButton}
                onPress={() => handleSFXVolumeChange('up')}>
                <Text style={styles.volumeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>


        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Status</Text>
            <Text style={[styles.accountStatus, authProvider === 'google' && styles.accountStatusGoogle]}>
              {authProvider === 'google' ? 'Google' : authProvider === 'offline' ? 'Offline' : 'Guest'}
            </Text>
          </View>
          {authProvider !== 'google' && authProvider !== 'offline' && (
            <TouchableOpacity
              style={[styles.signInButton, isSigningIn && styles.signInButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isSigningIn}>
              {isSigningIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign in with Google</Text>
              )}
            </TouchableOpacity>
          )}
          {authProvider === 'google' && (
            <TouchableOpacity
              style={styles.signOutSettingsButton}
              onPress={handleSignOut}>
              <Text style={styles.signOutSettingsButtonText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Name:</Text>
            <Text style={styles.infoValue}>Headshot Air Battle</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>v1.0</Text>
          </View>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://airplane-battle-7a3fd.web.app/privacy-policy.html')}>
            <Text style={styles.infoLabel}>Privacy Policy</Text>
            <Text style={styles.linkText}>View &gt;</Text>
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
    backgroundColor: colors.bgPrimary,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
  },
  sectionTitle: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 2,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingLabel: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeButtonText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 20,
    color: colors.accent,
  },
  volumeValue: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginHorizontal: 15,
    minWidth: 50,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  linkText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.accent,
  },
  infoLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  accountStatus: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  accountStatusGoogle: {
    color: '#4285F4',
  },
  signInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontFamily: fonts.rajdhaniSemiBold,
    color: colors.textPrimary,
    fontSize: 16,
  },
  signOutSettingsButton: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutSettingsButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.danger,
    fontSize: 13,
    letterSpacing: 1,
  },
  backButton: {
    margin: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
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
