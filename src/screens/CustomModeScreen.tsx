/**
 * Custom Mode Configuration Screen
 * Allows users to customize board size and airplane count
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import GameConstants from '../config/GameConstants';

type RootStackParamList = {
  MainMenu: undefined;
  Game: {difficulty: string; mode: string; boardSize: number; airplaneCount: number};
  CustomMode: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomMode'>;
};

export default function CustomModeScreen({navigation}: Props) {
  const customMode = GameConstants.MODES.CUSTOM;

  const [boardSize, setBoardSize] = useState(customMode.defaultBoardSize);
  const [airplaneCount, setAirplaneCount] = useState(customMode.defaultAirplanes);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const handleBoardSizeChange = (value: number) => {
    const size = Math.round(value);
    setBoardSize(size);

    // Auto-adjust airplane count if it exceeds board capacity
    const validation = GameConstants.validateAirplaneCountForBoardSize(airplaneCount, size);
    if (!validation.valid) {
      const maxRecommended = Math.floor((size * size * 0.4) / GameConstants.AIRPLANE.TOTAL_CELLS);
      setAirplaneCount(Math.min(airplaneCount, maxRecommended));
    }
  };

  const handleAirplaneCountChange = (value: number) => {
    const count = Math.round(value);
    setAirplaneCount(count);
  };

  const validateAndStartGame = (difficulty: string) => {
    // Validate configuration
    const validation = GameConstants.validateAirplaneCountForBoardSize(airplaneCount, boardSize);

    if (!validation.valid) {
      Alert.alert(
        'Invalid Configuration',
        validation.reason + '\n\n' + validation.recommendation,
        [{text: 'OK'}]
      );
      return;
    }

    // Start game
    navigation.navigate('Game', {
      difficulty,
      mode: 'custom',
      boardSize,
      airplaneCount,
    });
  };

  const handleDifficultySelect = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
  };

  const handleStartGame = () => {
    if (!selectedDifficulty) {
      Alert.alert('Select Difficulty', 'Please choose an AI difficulty level');
      return;
    }
    validateAndStartGame(selectedDifficulty);
  };

  // Calculate occupancy rate for feedback
  const totalCells = boardSize * boardSize;
  const airplaneCells = airplaneCount * GameConstants.AIRPLANE.TOTAL_CELLS;
  const occupancyRate = (airplaneCells / totalCells * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Custom Mode</Text>
        <Text style={styles.subtitle}>Configure Your Game</Text>

        {/* Board Size Configuration */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>Board Size</Text>
          <Text style={styles.valueDisplay}>{boardSize} × {boardSize}</Text>
          <Slider
            style={styles.slider}
            minimumValue={customMode.minBoardSize}
            maximumValue={customMode.maxBoardSize}
            value={boardSize}
            onValueChange={handleBoardSizeChange}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#555"
            thumbTintColor="#2196F3"
            step={1}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{customMode.minBoardSize}×{customMode.minBoardSize}</Text>
            <Text style={styles.sliderLabel}>{customMode.maxBoardSize}×{customMode.maxBoardSize}</Text>
          </View>
        </View>

        {/* Airplane Count Configuration */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>Airplane Count</Text>
          <Text style={styles.valueDisplay}>{airplaneCount} Airplanes</Text>
          <Slider
            style={styles.slider}
            minimumValue={customMode.minAirplanes}
            maximumValue={customMode.maxAirplanes}
            value={airplaneCount}
            onValueChange={handleAirplaneCountChange}
            minimumTrackTintColor="#4CAF50"
            maximumTrackTintColor="#555"
            thumbTintColor="#4CAF50"
            step={1}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>{customMode.minAirplanes}</Text>
            <Text style={styles.sliderLabel}>{customMode.maxAirplanes}</Text>
          </View>
        </View>

        {/* Configuration Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Board Occupancy: {occupancyRate}%
          </Text>
          <Text style={styles.infoSubtext}>
            {airplaneCount} airplanes occupy {airplaneCells} of {totalCells} cells
          </Text>
        </View>

        {/* Difficulty Selection */}
        <View style={styles.difficultySection}>
          <Text style={styles.sectionTitle}>AI Difficulty</Text>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              styles.easyButton,
              selectedDifficulty === 'easy' && styles.selectedButton
            ]}
            onPress={() => handleDifficultySelect('easy')}
            activeOpacity={0.7}>
            <Text style={styles.difficultyButtonText}>Easy AI</Text>
            <Text style={styles.difficultyButtonSubtext}>Random attacks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              styles.mediumButton,
              selectedDifficulty === 'medium' && styles.selectedButton
            ]}
            onPress={() => handleDifficultySelect('medium')}
            activeOpacity={0.7}>
            <Text style={styles.difficultyButtonText}>Medium AI</Text>
            <Text style={styles.difficultyButtonSubtext}>Smart tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.difficultyButton,
              styles.hardButton,
              selectedDifficulty === 'hard' && styles.selectedButton
            ]}
            onPress={() => handleDifficultySelect('hard')}
            activeOpacity={0.7}>
            <Text style={styles.difficultyButtonText}>Hard AI</Text>
            <Text style={styles.difficultyButtonSubtext}>Lock Head Algorithm</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartGame}
            activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>Start Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
    flexGrow: 1,
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
    fontSize: 18,
    color: '#aaa',
    marginBottom: 30,
    textAlign: 'center',
  },
  configSection: {
    marginBottom: 30,
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  valueDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  infoSection: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 5,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#aaa',
  },
  difficultySection: {
    marginBottom: 30,
  },
  difficultyButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedButton: {
    borderColor: '#FFD700',
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
  difficultyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  difficultyButtonSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 3,
  },
  actionButtons: {
    gap: 15,
  },
  actionButton: {
    width: '100%',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#607D8B',
  },
  actionButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
