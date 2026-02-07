/**
 * Headshot: Air Battle
 * Phase 2 - Firebase Integration
 */

import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import MainMenuScreen from './src/screens/MainMenuScreen';
import GameScreen from './src/screens/GameScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CustomModeScreen from './src/screens/CustomModeScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import GameHistoryScreen from './src/screens/GameHistoryScreen';
import BattleReportScreen from './src/screens/BattleReportScreen';
import SkinsScreen from './src/screens/SkinsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import OnlineModeScreen from './src/screens/OnlineModeScreen';
import MatchmakingScreen from './src/screens/MatchmakingScreen';
import RoomLobbyScreen from './src/screens/RoomLobbyScreen';
import OnlineGameScreen from './src/screens/OnlineGameScreen';
import StoreScreen from './src/screens/StoreScreen';

// Firebase Services
import FirebaseService from './src/services/FirebaseService';
import AuthService from './src/services/AuthService';
import StatisticsService from './src/services/StatisticsService';
import SkinService from './src/services/SkinService';
import {AchievementService} from './src/services/AchievementService';
import {configureGoogleSignIn} from './src/config/GoogleSignInConfig';
import IAPService from './src/services/IAPService';
import AdService from './src/services/AdService';

type RootStackParamList = {
  MainMenu: undefined;
  Game: {difficulty: string; mode: string; boardSize?: number; airplaneCount?: number};
  Settings: undefined;
  Profile: undefined;
  CustomMode: undefined;
  Leaderboard: undefined;
  GameHistory: undefined;
  BattleReport: {gameId: string; gameData: any};
  Skins: undefined;
  Achievements: undefined;
  OnlineMode: undefined;
  Matchmaking: {mode: string};
  RoomLobby: {gameId: string; roomCode?: string};
  OnlineGame: {gameId: string};
  Store: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();

    // Cleanup on unmount
    return () => {
      AuthService.cleanup();
      IAPService.cleanup();
      AdService.cleanup();
    };
  }, []);

  /**
   * Initialize Firebase and Auth services
   * Falls back to offline mode if Firebase is unavailable
   */
  const initializeApp = async () => {
    try {
      console.log('[App] Initializing application...');

      // Try to initialize Firebase
      try {
        await FirebaseService.initialize();
        console.log('[App] Firebase connected');
      } catch (firebaseError) {
        console.warn('[App] Firebase unavailable, running in OFFLINE MODE');
        console.warn('[App] Firebase error:', firebaseError);
      }

      // Configure Google Sign-In
      try {
        configureGoogleSignIn();
        console.log('[App] Google Sign-In configured');
      } catch (googleError) {
        console.warn('[App] Google Sign-In configuration failed:', googleError);
      }

      // Initialize Auth (supports offline mode)
      try {
        await AuthService.initialize();
      } catch (authError) {
        console.warn('[App] ⚠️ Auth initialization failed, using offline mode');
      }

      // Load user statistics (supports offline mode)
      try {
        await StatisticsService.loadStatistics();
      } catch (statsError) {
        console.warn('[App] ⚠️ Statistics loading failed, using defaults');
      }

      // Initialize Skin Service
      try {
        await SkinService.initialize();
      } catch (skinError) {
        console.warn('[App] ⚠️ Skin service initialization failed, using defaults');
      }

      // Initialize Achievement Service
      try {
        await AchievementService.initialize();
      } catch (achievementError) {
        console.warn('[App] Achievement service initialization failed, using defaults');
      }

      // Initialize IAP Service
      try {
        await IAPService.initialize();
        console.log('[App] IAP service initialized');
      } catch (iapError) {
        console.warn('[App] IAP service initialization failed:', iapError);
      }

      // Initialize Ad Service (non-blocking)
      AdService.initialize().catch(adError => {
        console.warn('[App] Ad service initialization failed:', adError);
      });

      console.log('[App] Application initialized successfully');
      setIsInitializing(false);
    } catch (error) {
      console.error('[App] ❌ Critical initialization error:', error);
      // Don't show error, just continue in offline mode
      console.log('[App] Continuing in offline mode...');
      setIsInitializing(false);
    }
  };

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  // Note: No longer showing error screen, app continues in offline mode

  // Main app
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainMenu"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="CustomMode" component={CustomModeScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="GameHistory" component={GameHistoryScreen} />
        <Stack.Screen name="BattleReport" component={BattleReportScreen} />
        <Stack.Screen name="Skins" component={SkinsScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="OnlineMode" component={OnlineModeScreen} />
        <Stack.Screen name="Matchmaking" component={MatchmakingScreen} />
        <Stack.Screen name="RoomLobby" component={RoomLobbyScreen} />
        <Stack.Screen name="OnlineGame" component={OnlineGameScreen} />
        <Stack.Screen name="Store" component={StoreScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  errorText: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 18,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default App;
