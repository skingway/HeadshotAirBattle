/**
 * Profile Screen
 * Displays user profile and statistics
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import AuthService from '../services/AuthService';
import StatisticsService from '../services/StatisticsService';

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
  const [statistics, setStatistics] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  // Refresh statistics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [])
  );

  const loadStatistics = async () => {
    console.log('[ProfileScreen] Loading statistics...');
    const stats = await StatisticsService.refresh();
    console.log('[ProfileScreen] Statistics loaded:', stats);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>✈️</Text>
          </View>
        </View>

        {/* Nickname Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nickname</Text>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.input}
                value={newNickname}
                onChangeText={setNewNickname}
                maxLength={20}
                placeholder="Enter nickname"
                placeholderTextColor="#666"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={handleCancelEdit}>
                  <Text style={styles.editButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveNickname}>
                  <Text style={styles.editButtonText}>Save</Text>
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
                <Text style={styles.editIcon}>✏️</Text>
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
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Created:</Text>
            <Text style={styles.infoValue}>{getTimeSinceCreation()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{profile?.userId?.slice(0, 12) || 'N/A'}...</Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{statistics.totalGames}</Text>
              <Text style={styles.statLabel}>Games Played</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statWins]}>{statistics.wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statLosses]}>{statistics.losses}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(statistics.winRate || 0).toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadStatistics}>
            <Text style={styles.refreshButtonText}>🔄 Refresh Statistics</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Achievements')}>
            <Text style={styles.actionButtonIcon}>🏅</Text>
            <Text style={styles.actionButtonText}>Achievements</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Skins')}>
            <Text style={styles.actionButtonIcon}>🎨</Text>
            <Text style={styles.actionButtonText}>Customize Skins</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={styles.actionButtonIcon}>🏆</Text>
            <Text style={styles.actionButtonText}>View Leaderboard</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('GameHistory')}>
            <Text style={styles.actionButtonIcon}>📜</Text>
            <Text style={styles.actionButtonText}>Game History</Text>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back to Menu</Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0f3460',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  avatarText: {
    fontSize: 48,
  },
  section: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  nicknameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nickname: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  editIconButton: {
    padding: 10,
  },
  editIcon: {
    fontSize: 24,
  },
  editContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#0f3460',
    color: '#fff',
    fontSize: 18,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#607D8B',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cooldownText: {
    color: '#FF9800',
    fontSize: 12,
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  infoLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statWins: {
    color: '#4CAF50',
  },
  statLosses: {
    color: '#F44336',
  },
  statLabel: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  actionButtonArrow: {
    fontSize: 24,
    color: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#607D8B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
