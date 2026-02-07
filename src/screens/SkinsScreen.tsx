/**
 * Skins Screen
 * Allows users to select airplane skins and board themes
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  AIRPLANE_SKINS,
  BOARD_THEMES,
  type AirplaneSkin,
  type BoardTheme,
} from '../config/SkinConfig';
import SkinService from '../services/SkinService';
import StatisticsService from '../services/StatisticsService';
import IAPService from '../services/IAPService';

type RootStackParamList = {
  MainMenu: undefined;
  Skins: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Skins'>;
};

export default function SkinsScreen({navigation}: Props) {
  const [selectedTab, setSelectedTab] = useState<'airplane' | 'theme'>('airplane');
  const [currentSkin, setCurrentSkin] = useState<string>(SkinService.getCurrentSkin());
  const [currentTheme, setCurrentTheme] = useState<string>(SkinService.getCurrentTheme());
  const [totalGames, setTotalGames] = useState(0);
  const [totalWins, setTotalWins] = useState(0);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    const stats = await StatisticsService.loadStatistics();
    setTotalGames(stats.totalGames);
    setTotalWins(stats.wins);
  };

  const getSkinLockHint = (skin: AirplaneSkin): string => {
    if (skin.isPremium) {
      return 'Get Premium Skin Pack';
    }
    const gamesNeeded = skin.unlockRequirement - totalGames;
    return `Need ${gamesNeeded} more game${gamesNeeded > 1 ? 's' : ''} or Premium Skin Pack`;
  };

  const getThemeLockHint = (theme: BoardTheme): string => {
    if (theme.isPremium) {
      return 'Get Premium Theme Pack';
    }
    const winsNeeded = theme.unlockRequirement - totalWins;
    return `Need ${winsNeeded} more win${winsNeeded > 1 ? 's' : ''} or Premium Theme Pack`;
  };

  const handleSelectSkin = async (skin: AirplaneSkin) => {
    // Check if premium skin requires purchase
    if (skin.isPremium && !IAPService.hasPremiumSkins()) {
      Alert.alert('Locked', getSkinLockHint(skin), [{text: 'OK'}]);
      return;
    }
    // Check if unlocked by game count (or by purchasing skin pack)
    if (!skin.isPremium && totalGames < skin.unlockRequirement && !IAPService.areAllEarnableSkinsUnlocked()) {
      Alert.alert('Locked', getSkinLockHint(skin), [{text: 'OK'}]);
      return;
    }

    const success = await SkinService.setAirplaneSkin(skin.id);
    if (success) {
      setCurrentSkin(skin.id);
      Alert.alert('Success', `Equipped ${skin.name}!`);
    }
  };

  const handleSelectTheme = async (theme: BoardTheme) => {
    // Check if premium theme requires purchase
    if (theme.isPremium && !IAPService.hasPremiumThemes()) {
      Alert.alert('Locked', getThemeLockHint(theme), [{text: 'OK'}]);
      return;
    }
    // Check if unlocked by win count (or by purchasing theme pack)
    if (!theme.isPremium && totalWins < theme.unlockRequirement && !IAPService.areAllEarnableThemesUnlocked()) {
      Alert.alert('Locked', getThemeLockHint(theme), [{text: 'OK'}]);
      return;
    }

    const success = await SkinService.setBoardTheme(theme.id);
    if (success) {
      setCurrentTheme(theme.id);
      Alert.alert('Success', `Equipped ${theme.name}!`);
    }
  };

  const renderAirplaneSkin = (skin: AirplaneSkin) => {
    const isLocked = skin.isPremium
      ? !IAPService.hasPremiumSkins()
      : totalGames < skin.unlockRequirement && !IAPService.areAllEarnableSkinsUnlocked();
    const isSelected = skin.id === currentSkin;

    return (
      <TouchableOpacity
        key={skin.id}
        style={[
          styles.skinCard,
          isSelected && styles.skinCardSelected,
          isLocked && styles.skinCardLocked,
        ]}
        onPress={() => handleSelectSkin(skin)}>
        <View style={[styles.skinPreview, {backgroundColor: skin.color}]}>
          {isSelected && <Text style={styles.selectedIcon}>✓</Text>}
          {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
        </View>
        <Text style={[styles.skinName, isLocked && styles.lockedText]}>{skin.name}</Text>
        <Text style={[styles.skinUnlock, isLocked && styles.lockedText]}>
          {isLocked ? getSkinLockHint(skin) : '✓ Unlocked'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBoardTheme = (theme: BoardTheme) => {
    const isLocked = theme.isPremium
      ? !IAPService.hasPremiumThemes()
      : totalWins < theme.unlockRequirement && !IAPService.areAllEarnableThemesUnlocked();
    const isSelected = theme.id === currentTheme;

    return (
      <TouchableOpacity
        key={theme.id}
        style={[
          styles.themeCard,
          isSelected && styles.themeCardSelected,
          isLocked && styles.themeCardLocked,
        ]}
        onPress={() => handleSelectTheme(theme)}>
        <View style={styles.themePreview}>
          <Text style={styles.themeIcon}>{theme.icon}</Text>
          {isSelected && <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>ACTIVE</Text></View>}
          {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
        </View>
        <View style={styles.themeColorRow}>
          <View style={[styles.themeColorSample, {backgroundColor: theme.colors.cellAirplane}]} />
          <View style={[styles.themeColorSample, {backgroundColor: theme.colors.cellHit}]} />
          <View style={[styles.themeColorSample, {backgroundColor: theme.colors.cellMiss}]} />
        </View>
        <Text style={[styles.themeName, isLocked && styles.lockedText]}>{theme.name}</Text>
        <Text style={[styles.themeUnlock, isLocked && styles.lockedText]}>
          {isLocked ? getThemeLockHint(theme) : '✓ Unlocked'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Customize</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'airplane' && styles.tabActive]}
          onPress={() => setSelectedTab('airplane')}>
          <Text style={[styles.tabText, selectedTab === 'airplane' && styles.tabTextActive]}>
            ✈️ Airplanes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'theme' && styles.tabActive]}
          onPress={() => setSelectedTab('theme')}>
          <Text style={[styles.tabText, selectedTab === 'theme' && styles.tabTextActive]}>
            🎨 Themes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>Games: {totalGames}</Text>
        <Text style={styles.statsText}>Wins: {totalWins}</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedTab === 'airplane' ? (
          <View style={styles.grid}>
            {AIRPLANE_SKINS.map(skin => renderAirplaneSkin(skin))}
          </View>
        ) : (
          <View style={styles.themeGrid}>
            {BOARD_THEMES.map(theme => renderBoardTheme(theme))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#4a90e2',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 60,
  },
  tabs: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  tab: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#16213e',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4a90e2',
  },
  tabText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fff',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 10,
    backgroundColor: '#16213e',
    marginHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  skinCard: {
    width: '30%',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  skinCardSelected: {
    borderColor: '#4CAF50',
  },
  skinCardLocked: {
    opacity: 0.5,
  },
  skinPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    fontSize: 32,
    color: '#fff',
  },
  lockIcon: {
    fontSize: 24,
  },
  skinName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skinUnlock: {
    color: '#aaa',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  lockedText: {
    color: '#666',
  },
  themeGrid: {
    gap: 15,
  },
  themeCard: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    borderColor: '#4CAF50',
  },
  themeCardLocked: {
    opacity: 0.5,
  },
  themePreview: {
    alignItems: 'center',
    marginBottom: 10,
  },
  themeIcon: {
    fontSize: 48,
  },
  selectedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  themeColorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  themeColorSample: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  themeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  themeUnlock: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
