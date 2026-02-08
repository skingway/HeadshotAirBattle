/**
 * Online Mode Screen
 * Choose between Quick Match and Private Room
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MatchmakingService from '../services/MatchmakingService';
import RoomService from '../services/RoomService';
import {colors, fonts} from '../theme/colors';

type RootStackParamList = {
  MainMenu: undefined;
  OnlineMode: undefined;
  Matchmaking: {mode: string};
  RoomLobby: {gameId: string; roomCode: string};
  OnlineGame: {gameId: string};
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnlineMode'>;
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

export default function OnlineModeScreen({navigation}: Props) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {toValue: 1, duration: 400, useNativeDriver: true}),
      Animated.timing(slideAnim, {toValue: 0, duration: 400, useNativeDriver: true}),
    ]).start();
  }, []);

  const handleQuickMatch = () => {
    navigation.navigate('Matchmaking', {mode: 'standard'});
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const result = await RoomService.createRoom({
        mode: 'standard',
        boardSize: 10,
        airplaneCount: 3,
      });
      if (result.success && result.roomCode && result.gameId) {
        navigation.navigate('RoomLobby', {
          gameId: result.gameId,
          roomCode: result.roomCode,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to create room');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmedCode = roomCodeInput.trim().toUpperCase();
    if (trimmedCode.length !== 6) {
      Alert.alert('Invalid Code', 'Room code must be 6 characters');
      return;
    }
    if (!RoomService.isValidRoomCode(trimmedCode)) {
      Alert.alert('Invalid Code', 'Room code can only contain letters and numbers');
      return;
    }
    setIsJoining(true);
    try {
      const result = await RoomService.joinRoom(trimmedCode);
      if (result.success && result.gameId) {
        navigation.navigate('RoomLobby', {
          gameId: result.gameId,
          roomCode: trimmedCode,
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to join room');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while joining room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>ONLINE MODE</Text>
            <Text style={styles.subtitle}>Play against real players</Text>
          </View>

          {/* Quick Match Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{'\u26A1'}</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>QUICK MATCH</Text>
                <Text style={styles.cardDescription}>
                  Automatic matchmaking with online players
                </Text>
              </View>
            </View>
            <AnimatedButton
              style={styles.btnPrimary}
              onPress={handleQuickMatch}>
              <Text style={styles.btnPrimaryText}>FIND MATCH</Text>
            </AnimatedButton>
          </View>

          {/* Private Room Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{'\uD83C\uDFE0'}</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>PRIVATE ROOM</Text>
                <Text style={styles.cardDescription}>
                  Create or join a room with friends
                </Text>
              </View>
            </View>

            <AnimatedButton
              style={styles.btnSecondary}
              onPress={handleCreateRoom}
              disabled={isCreating}>
              {isCreating ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.btnSecondaryText}>CREATE ROOM</Text>
              )}
            </AnimatedButton>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit room code"
              placeholderTextColor={colors.textDark}
              value={roomCodeInput}
              onChangeText={setRoomCodeInput}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <AnimatedButton
              style={[
                styles.btnTertiary,
                !roomCodeInput.trim() && styles.buttonDisabled,
              ]}
              onPress={handleJoinRoom}
              disabled={!roomCodeInput.trim() || isJoining}>
              {isJoining ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <Text style={styles.btnTertiaryText}>JOIN ROOM</Text>
              )}
            </AnimatedButton>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>{'\uD83D\uDCA1'}</Text>
            <Text style={styles.infoText}>
              Quick Match pairs you with players of similar skill level.
              Private Rooms let you play with specific friends using a room code.
            </Text>
          </View>

          {/* Back Button */}
          <AnimatedButton
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>BACK TO MENU</Text>
          </AnimatedButton>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontFamily: fonts.orbitronBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 16,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
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
    borderRadius: 12,
    alignItems: 'center',
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
    borderRadius: 12,
    alignItems: 'center',
  },
  btnTertiaryText: {
    fontFamily: fonts.orbitronBold,
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontFamily: fonts.rajdhaniSemiBold,
    color: colors.textDark,
    fontSize: 14,
    marginHorizontal: 16,
    letterSpacing: 2,
  },
  input: {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    color: colors.textPrimary,
    fontFamily: fonts.orbitronBold,
    fontSize: 18,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 30, 60, 0.3)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
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
