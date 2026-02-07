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
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import AudioManager from '../services/AudioManager';
import AuthService from '../services/AuthService';

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
              trackColor={{false: '#767577', true: '#4CAF50'}}
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

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => AudioManager.playSFX('hit')}>
            <Text style={styles.testButtonText}>Test Sound</Text>
          </TouchableOpacity>
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
            <Text style={styles.infoValue}>Airplane Battle</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>v0.5.0 RN</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform:</Text>
            <Text style={styles.infoValue}>React Native</Text>
          </View>
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
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    margin: 20,
    padding: 20,
    backgroundColor: '#16213e',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  volumeValue: {
    fontSize: 16,
    color: '#fff',
    marginHorizontal: 15,
    minWidth: 50,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  accountStatus: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: 'bold',
  },
  accountStatusGoogle: {
    color: '#4285F4',
  },
  signInButton: {
    backgroundColor: '#4285F4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutSettingsButton: {
    backgroundColor: '#D32F2F',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutSettingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#546e7a',
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
