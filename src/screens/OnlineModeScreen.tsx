/**
 * Online Mode Screen
 * Choose between Quick Match and Private Room
 */

import React, {useState} from 'react';
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
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MatchmakingService from '../services/MatchmakingService';
import RoomService from '../services/RoomService';

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

export default function OnlineModeScreen({navigation}: Props) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
      console.error('[OnlineModeScreen] Error creating room:', error);
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
      console.error('[OnlineModeScreen] Error joining room:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Online Multiplayer</Text>
          <Text style={styles.subtitle}>Play against real players</Text>
        </View>

        {/* Quick Match Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⚡</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Quick Match</Text>
              <Text style={styles.cardDescription}>
                Automatic matchmaking with online players
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleQuickMatch}>
            <Text style={styles.buttonText}>Find Match</Text>
          </TouchableOpacity>
        </View>

        {/* Private Room Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🏠</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Private Room</Text>
              <Text style={styles.cardDescription}>
                Create or join a room with friends
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCreateRoom}
            disabled={isCreating}>
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Room</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit room code"
            placeholderTextColor="#666"
            value={roomCodeInput}
            onChangeText={setRoomCodeInput}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              !roomCodeInput.trim() && styles.buttonDisabled,
            ]}
            onPress={handleJoinRoom}
            disabled={!roomCodeInput.trim() || isJoining}>
            {isJoining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Join Room</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Quick Match pairs you with players of similar skill level.
            Private Rooms let you play with specific friends using a room code.
          </Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#aaa',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0f3460',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 16,
  },
  input: {
    backgroundColor: '#0f3460',
    color: '#fff',
    fontSize: 18,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#2c2c3e',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#607D8B',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
