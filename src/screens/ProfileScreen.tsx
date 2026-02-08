/**
 * Profile Screen
 * Displays user profile and statistics
 * Supports Google Sign-In and account management
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import AuthService from '../services/AuthService';
import StatisticsService from '../services/StatisticsService';
import AdService from '../services/AdService';
import {AD_UNIT_IDS} from '../config/AdConfig';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  Profile: undefined;
  Leaderboard: undefined;
  GameHistory: undefined;
  Skins: undefined;
  Achievements: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Profile'>;
};

export default function ProfileScreen({navigation}: Props) {
  const [nickname, setNickname] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statistics, setStatistics] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadProfile();
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
      loadProfile();
    }, [])
  );

  const loadStatistics = async () => {
    const stats = await StatisticsService.refresh();
    setStatistics({
      totalGames: stats.totalGames,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
    });
  };

  const loadProfile = () => {
    const userProfile = AuthService.getUserProfile();
    if (userProfile) {
      setProfile(userProfile);
      setNickname(userProfile.nickname);
      setNewNickname(userProfile.nickname);
    }
  };

  const handleSaveNickname = async () => {
    if (!newNickname || newNickname.trim().length === 0) {
      Alert.alert('Error', 'Nickname cannot be empty');
      return;
    }
    if (newNickname === nickname) {
      setIsEditing(false);
      return;
    }
    const result = await AuthService.updateNickname(newNickname);
    if (result.success) {
      Alert.alert('Success', 'Nickname updated successfully!');
      setNickname(newNickname);
      setIsEditing(false);
      loadProfile();
    } else {
      Alert.alert('Error', result.message || 'Failed to update nickname');
    }
  };

  const handleCancelEdit = () => {
    setNewNickname(nickname);
    setIsEditing(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await AuthService.signInWithGoogle();
      if (result.success) {
        Alert.alert('Success', 'Signed in with Google successfully!');
        loadProfile();
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
                  loadProfile();
                } else {
                  Alert.alert('Error', switchResult.message || 'Failed to switch account.');
                }
              },
            },
          ],
        );
      } else if (result.message) {
        if (result.message !== 'Sign-in cancelled.') {
          Alert.alert('Sign-In Failed', result.message);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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
              loadProfile();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out.');
            }
          },
        },
      ],
    );
  };

  const getTimeSinceCreation = () => {
    if (!profile?.createdAt) return 'Unknown';
    const now = Date.now();
    const diff = now - profile.createdAt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const canChangeNickname = () => {
    if (!profile?.nicknameChangedAt) return true;
    const now = Date.now();
    const diff = now - profile.nicknameChangedAt;
    const daysSinceChange = diff / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 30;
  };

  const getDaysUntilNicknameChange = () => {
    if (!profile?.nicknameChangedAt) return 0;
    const now = Date.now();
    const diff = now - profile.nicknameChangedAt;
    const daysSinceChange = diff / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.ceil(30 - daysSinceChange);
    return Math.max(0, daysRemaining);
  };

  const isGoogleUser = profile?.authProvider === 'google';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>PROFILE</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            {isGoogleUser && profile?.googlePhotoUrl ? (
              <Image
                source={{uri: profile.googlePhotoUrl}}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{'\u2708\uFE0F'}</Text>
              </View>
            )}
            {isGoogleUser && profile?.googleEmail && (
              <Text style={styles.emailText}>{profile.googleEmail}</Text>
            )}
          </View>

          {/* Google Sign-In Section (for anonymous users) */}
          {!isGoogleUser && (
            <View style={styles.signInSection}>
              <TouchableOpacity
                style={[styles.googleButton, isSigningIn && styles.googleButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isSigningIn}>
                {isSigningIn ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.googleButtonIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.signInHint}>
                Save your progress across devices
              </Text>
            </View>
          )}

          {/* Nickname Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NICKNAME</Text>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.input}
                  value={newNickname}
                  onChangeText={setNewNickname}
                  maxLength={20}
                  placeholder="Enter nickname"
                  placeholderTextColor={colors.textDark}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}>
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveNickname}>
                    <Text style={styles.saveButtonText}>SAVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nicknameContainer}>
                <Text style={styles.nickname}>{nickname}</Text>
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={() => {
                    if (canChangeNickname()) {
                      setIsEditing(true);
                    } else {
                      Alert.alert(
                        'Cannot Change Nickname',
                        `You can change your nickname in ${getDaysUntilNicknameChange()} days.`,
                      );
                    }
                  }}
                  disabled={!canChangeNickname()}>
                  <Text style={styles.editNicknameText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
            {!canChangeNickname() && (
              <Text style={styles.cooldownText}>
                Nickname can be changed in {getDaysUntilNicknameChange()} days
              </Text>
            )}
          </View>

          {/* Account Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={[styles.infoValue, isGoogleUser && {color: '#4285F4'}]}>
                {isGoogleUser ? 'Google' : 'Guest'}
              </Text>
            </View>
            <View style={styles.divider} />
            {isGoogleUser && profile?.googleDisplayName && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Google Name</Text>
                  <Text style={styles.infoValue}>{profile.googleDisplayName}</Text>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>{getTimeSinceCreation()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{profile?.userId?.slice(0, 12) || 'N/A'}...</Text>
            </View>
          </View>

          {/* Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STATISTICS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{statistics.totalGames}</Text>
                <Text style={styles.statLabel}>GAMES</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, {color: colors.success}]}>{statistics.wins}</Text>
                <Text style={styles.statLabel}>WINS</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, {color: colors.danger}]}>{statistics.losses}</Text>
                <Text style={styles.statLabel}>LOSSES</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, {color: colors.accent}]}>
                  {(statistics.winRate || 0).toFixed(1)}%
                </Text>
                <Text style={styles.statLabel}>WIN RATE</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadStatistics}>
              <Text style={styles.refreshButtonText}>REFRESH STATISTICS</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            {[
              {label: 'Achievements', nav: 'Achievements' as const},
              {label: 'Customize Skins', nav: 'Skins' as const},
              {label: 'View Leaderboard', nav: 'Leaderboard' as const},
              {label: 'Game History', nav: 'GameHistory' as const},
            ].map((item, idx) => (
              <React.Fragment key={item.nav}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate(item.nav)}>
                  <Text style={styles.actionButtonText}>{item.label}</Text>
                  <Text style={styles.actionButtonArrow}>{'>'}</Text>
                </TouchableOpacity>
                {idx < 3 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Sign Out Button */}
          {isGoogleUser && (
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>SIGN OUT</Text>
            </TouchableOpacity>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>BACK TO MENU</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      {AdService.shouldShowBannerAd() && (
        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={AD_UNIT_IDS.BANNER_PROFILE}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accentGlow,
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.accentGlow,
  },
  avatarText: {
    fontSize: 48,
  },
  emailText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  signInSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 12,
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    textAlign: 'center',
    lineHeight: 28,
    borderRadius: 4,
    overflow: 'hidden',
  },
  googleButtonText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  signInHint: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  section: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 2,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginBottom: 16,
  },
  nicknameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nickname: {
    fontFamily: fonts.orbitronBold,
    fontSize: 22,
    color: colors.textPrimary,
    flex: 1,
  },
  editIconButton: {
    padding: 10,
  },
  editNicknameText: {
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 14,
    color: colors.accent,
  },
  editContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    color: colors.textPrimary,
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 18,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1,
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textPrimary,
    fontSize: 12,
    letterSpacing: 1,
  },
  cooldownText: {
    fontFamily: fonts.rajdhaniRegular,
    color: colors.warning,
    fontSize: 12,
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  infoLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 15,
    color: colors.textMuted,
  },
  infoValue: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.1)',
  },
  statValue: {
    fontFamily: fonts.orbitronExtraBold,
    fontSize: 28,
    color: colors.accent,
    marginBottom: 5,
  },
  statLabel: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
  },
  refreshButton: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionButtonText: {
    flex: 1,
    fontFamily: fonts.rajdhaniSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  actionButtonArrow: {
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    color: colors.accent,
  },
  signOutButton: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.danger,
    fontSize: 13,
    letterSpacing: 2,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  backButtonText: {
    fontFamily: fonts.orbitronBold,
    color: colors.textSecondary,
    fontSize: 13,
    letterSpacing: 2,
  },
  bannerContainer: {
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
});
