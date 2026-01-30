/**
 * Dual Board View Component
 * Displays both player and opponent boards during battle
 * - Enemy board (large): Main attack target
 * - Player board (small): Defensive overview
 */

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions} from 'react-native';
import BoardManager from '../core/BoardManager';
import SkinService from '../services/SkinService';

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
  const screenWidth = Dimensions.get('window').width;
  const boardSize = enemyBoard.size;

  // Calculate cell sizes for responsive design
  // Enemy board: larger, main interaction area
  const enemyBoardWidth = Math.min(screenWidth - 40, 380);
  const enemyCellSize = Math.floor((enemyBoardWidth - boardSize * 2) / boardSize);

  // Player board: smaller defensive overview
  const playerBoardWidth = Math.min(screenWidth * 0.45, 200);
  const playerCellSize = Math.floor((playerBoardWidth - boardSize * 2) / boardSize);

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
    <View style={styles.container}>
      {/* Enemy Board (Large) - Main Attack Target */}
      <View style={styles.enemyBoardContainer}>
        <Text style={styles.boardTitle}>🎯 Enemy Board (Attack Here)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.boardScrollContent}>
          {renderBoard(enemyBoard, enemyCellSize, true, onCellPress)}
        </ScrollView>
      </View>

      {/* Player Board (Smaller) - Defensive Overview - Below Enemy Board */}
      <View style={styles.playerBoardContainer}>
        <Text style={styles.playerBoardTitle}>🛡️ Your Defense</Text>
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
  enemyBoardContainer: {
    alignItems: 'center',
    paddingTop: 10,
    marginBottom: 20,
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  boardScrollContent: {
    paddingHorizontal: 20,
  },
  playerBoardContainer: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  playerBoardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
    textAlign: 'center',
  },
  playerBoardWrapper: {
    alignItems: 'center',
  },
  board: {
    backgroundColor: '#0f3460',
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
    backgroundColor: '#1a4d7a',
  },
  cellAirplane: {
    backgroundColor: '#4CAF50',
  },
  cellHit: {
    backgroundColor: '#FF9800',
  },
  cellMiss: {
    backgroundColor: '#607D8B',
  },
  cellKilled: {
    backgroundColor: '#F44336',
  },
  cellText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
