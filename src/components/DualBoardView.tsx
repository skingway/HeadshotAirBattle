/**
 * Dual Board View Component
 * Displays both player and opponent boards during battle
 * - Enemy board (large): Main attack target
 * - Player board (small): Defensive overview
 */

import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions} from 'react-native';
import BoardManager from '../core/BoardManager';
import SkinService from '../services/SkinService';
import {useOrientation} from '../hooks/useOrientation';
import {colors, fonts} from '../theme/colors';

interface DualBoardViewProps {
  playerBoard: BoardManager;
  enemyBoard: BoardManager;
  currentTurn: 'player' | 'ai';
  onCellPress: (row: number, col: number) => void;
  showEnemyAirplanes?: boolean; // For debugging
}

export default function DualBoardView({
  playerBoard,
  enemyBoard,
  currentTurn,
  onCellPress,
  showEnemyAirplanes = false,
}: DualBoardViewProps) {
  const orientation = useOrientation();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const boardSize = enemyBoard.size;

  // Listen to dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;
  const isLandscape = orientation === 'landscape';

  // Calculate cell sizes for responsive design
  let enemyCellSize: number;
  let playerCellSize: number;

  if (isLandscape) {
    // Landscape: boards side by side
    const availableWidth = (screenWidth - 60) / 2; // Split screen for two boards
    enemyCellSize = Math.floor((availableWidth - boardSize * 2) / boardSize);
    playerCellSize = Math.floor((availableWidth - boardSize * 2) / boardSize);
  } else {
    // Portrait: boards stacked vertically (original layout)
    const enemyBoardWidth = Math.min(screenWidth - 40, 380);
    enemyCellSize = Math.floor((enemyBoardWidth - boardSize * 2) / boardSize);

    const playerBoardWidth = Math.min(screenWidth * 0.45, 200);
    playerCellSize = Math.floor((playerBoardWidth - boardSize * 2) / boardSize);
  }

  // Helper: Check if a cell has an airplane
  const getAirplaneAtPosition = (board: BoardManager, row: number, col: number) => {
    for (const airplane of board.airplanes) {
      // Airplane has a 'cells' property directly
      for (const cell of airplane.cells) {
        if (cell.row === row && cell.col === col) {
          return {airplane, cellType: cell.type};
        }
      }
    }
    return null;
  };

  // Helper: Check if a cell was attacked
  const wasAttacked = (board: BoardManager, row: number, col: number) => {
    return board.attackedCells.has(`${row},${col}`);
  };

  const renderBoard = (
    board: BoardManager,
    cellSize: number,
    isEnemy: boolean,
    onPress?: (row: number, col: number) => void
  ) => {
    // Get current theme colors
    const themeColors = SkinService.getCurrentThemeColors();
    const airplaneColor = SkinService.getCurrentSkinColor();

    const rows = [];

    for (let row = 0; row < board.size; row++) {
      const cells = [];

      for (let col = 0; col < board.size; col++) {
        const cellKey = `${row}-${col}`;
        const airplaneInfo = getAirplaneAtPosition(board, row, col);
        const attacked = wasAttacked(board, row, col);

        let cellStyle = [styles.cell, {width: cellSize, height: cellSize}];
        let cellContent = '';
        let backgroundColor = themeColors.cellEmpty;

        if (isEnemy) {
          // Enemy board: only show attack results
          if (attacked) {
            if (airplaneInfo) {
              // Only show KILLED state for the head cell when airplane is destroyed
              if (airplaneInfo.airplane.isDestroyed && airplaneInfo.cellType === 'head') {
                backgroundColor = themeColors.cellKilled;
                cellContent = '💥';
              } else {
                backgroundColor = themeColors.cellHit;
                cellContent = '🔥';
              }
            } else {
              backgroundColor = themeColors.cellMiss;
              cellContent = '○';
            }
          } else {
            backgroundColor = themeColors.cellEmpty;
          }

          // Debug: show enemy airplanes
          if (showEnemyAirplanes && airplaneInfo && !attacked) {
            backgroundColor = airplaneColor;
          }
        } else {
          // Player board: show everything
          if (attacked) {
            if (airplaneInfo) {
              // Only show KILLED state for the head cell when airplane is destroyed
              if (airplaneInfo.airplane.isDestroyed && airplaneInfo.cellType === 'head') {
                backgroundColor = themeColors.cellKilled;
                cellContent = '💥';
              } else {
                backgroundColor = themeColors.cellHit;
                cellContent = '🔥';
              }
            } else {
              backgroundColor = themeColors.cellMiss;
              cellContent = '○';
            }
          } else if (airplaneInfo) {
            backgroundColor = airplaneColor;
            // Show airplane head direction
            if (airplaneInfo.cellType === 'head') {
              const directionArrows = {
                up: '↑',
                down: '↓',
                left: '←',
                right: '→',
              };
              cellContent = directionArrows[airplaneInfo.airplane.direction] || '✈';
            } else {
              cellContent = '✈';
            }
          } else {
            backgroundColor = themeColors.cellEmpty;
          }
        }

        cells.push(
          <TouchableOpacity
            key={cellKey}
            style={[cellStyle, {backgroundColor}]}
            onPress={() => onPress && onPress(row, col)}
            disabled={!onPress || currentTurn !== 'player'}
            activeOpacity={0.7}>
            <Text style={[styles.cellText, {fontSize: Math.max(8, cellSize * 0.5)}]}>
              {cellContent}
            </Text>
          </TouchableOpacity>
        );
      }

      rows.push(
        <View key={row} style={styles.row}>
          {cells}
        </View>
      );
    }

    return <View style={styles.board}>{rows}</View>;
  };

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      {/* Enemy Board - Main Attack Target */}
      <View style={[styles.enemyBoardContainer, isLandscape && styles.boardContainerLandscape]}>
        <Text style={[styles.boardTitle, isLandscape && styles.boardTitleLandscape]}>🎯 Enemy</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardScrollContent}>
          {renderBoard(enemyBoard, enemyCellSize, true, onCellPress)}
        </ScrollView>
      </View>

      {/* Player Board - Defensive Overview */}
      <View style={[styles.playerBoardContainer, isLandscape && styles.boardContainerLandscape]}>
        <Text style={[styles.playerBoardTitle, isLandscape && styles.boardTitleLandscape]}>🛡️ Defense</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardScrollContent}>
          {renderBoard(playerBoard, playerCellSize, false)}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  boardContainerLandscape: {
    flex: 1,
    marginHorizontal: 5,
  },
  boardTitleLandscape: {
    fontSize: 12,
  },
  enemyBoardContainer: {
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 20,
  },
  boardTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  boardScrollContent: {
    paddingHorizontal: 20,
  },
  playerBoardContainer: {
    backgroundColor: 'rgba(0, 30, 60, 0.4)',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  playerBoardTitle: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 12,
    color: colors.accent,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  playerBoardWrapper: {
    alignItems: 'center',
  },
  board: {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    padding: 5,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 2,
  },
  cellEmpty: {
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
  },
  cellAirplane: {
    backgroundColor: 'rgba(0, 212, 255, 0.25)',
  },
  cellHit: {
    backgroundColor: 'rgba(255, 152, 0, 0.6)',
  },
  cellMiss: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cellKilled: {
    backgroundColor: 'rgba(255, 40, 40, 0.7)',
  },
  cellText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
});
