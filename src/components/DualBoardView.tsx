/**
 * Dual Board View Component
 * Displays both player and opponent boards during battle
 * - Enemy board (large): Main attack target
 * - Player board (small): Defensive overview
 */

import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import BoardManager from '../core/BoardManager';
import SkinService from '../services/SkinService';
import {useOrientation} from '../hooks/useOrientation';
import {colors, fonts} from '../theme/colors';
import {generateCellEffects, hexToRgba} from '../utils/ColorUtils';

interface DualBoardViewProps {
  playerBoard: BoardManager;
  enemyBoard: BoardManager;
  currentTurn: 'player' | 'ai';
  onCellPress: (row: number, col: number, pageX?: number, pageY?: number) => void;
  showEnemyAirplanes?: boolean; // For debugging
}

// Pulsing glow component for hit cells
function PulsingCell({children, glowColor, cellSize}: {children: React.ReactNode; glowColor: string; cellSize: number}) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 800, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.6, duration: 800, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={{opacity, width: cellSize, height: cellSize}}>
      {children}
    </Animated.View>
  );
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
    const effects = generateCellEffects(themeColors);

    const rows = [];

    for (let row = 0; row < board.size; row++) {
      const cells = [];

      for (let col = 0; col < board.size; col++) {
        const cellKey = `${row}-${col}`;
        const airplaneInfo = getAirplaneAtPosition(board, row, col);
        const attacked = wasAttacked(board, row, col);

        let cellState: 'empty' | 'airplane' | 'head' | 'hit' | 'killed' | 'miss' = 'empty';
        let cellContent = '';

        if (isEnemy) {
          // Enemy board: only show attack results
          if (attacked) {
            if (airplaneInfo) {
              if (airplaneInfo.airplane.isDestroyed && airplaneInfo.cellType === 'head') {
                cellState = 'killed';
                cellContent = '💥';
              } else {
                cellState = 'hit';
                cellContent = '🔥';
              }
            } else {
              cellState = 'miss';
              cellContent = '○';
            }
          } else {
            cellState = 'empty';
          }

          // Debug: show enemy airplanes
          if (showEnemyAirplanes && airplaneInfo && !attacked) {
            cellState = 'airplane';
          }
        } else {
          // Player board: show everything
          if (attacked) {
            if (airplaneInfo) {
              if (airplaneInfo.airplane.isDestroyed && airplaneInfo.cellType === 'head') {
                cellState = 'killed';
                cellContent = '💥';
              } else {
                cellState = 'hit';
                cellContent = '🔥';
              }
            } else {
              cellState = 'miss';
              cellContent = '○';
            }
          } else if (airplaneInfo) {
            if (airplaneInfo.cellType === 'head') {
              cellState = 'head';
              const directionArrows: Record<string, string> = {
                up: '↑',
                down: '↓',
                left: '←',
                right: '→',
              };
              cellContent = directionArrows[airplaneInfo.airplane.direction] || '✈';
            } else {
              cellState = 'airplane';
              cellContent = '✈';
            }
          } else {
            cellState = 'empty';
          }
        }

        // Render cell based on state
        let cellInner: React.ReactNode;

        if (cellState === 'empty') {
          cellInner = (
            <View style={[
              styles.cellInner,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: effects.empty.bg,
                borderWidth: 0.5,
                borderColor: effects.empty.border,
              },
            ]} />
          );
        } else if (cellState === 'airplane') {
          cellInner = (
            <LinearGradient
              colors={[effects.airplane.gradientStart, effects.airplane.gradientEnd]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={[styles.cellInner, {width: cellSize, height: cellSize}]}>
              {/* Wing detail line */}
              <View style={[
                styles.wingLine,
                {backgroundColor: effects.airplane.wingLine, width: cellSize * 0.6, height: 1},
              ]} />
              <Text style={[styles.cellText, {fontSize: Math.max(8, cellSize * 0.45)}]}>
                {cellContent}
              </Text>
            </LinearGradient>
          );
        } else if (cellState === 'head') {
          cellInner = (
            <LinearGradient
              colors={[effects.head.gradientStart, effects.head.gradientEnd]}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={[styles.cellInner, {width: cellSize, height: cellSize}]}>
              {/* Reticle circle */}
              <View style={[
                styles.reticle,
                {
                  width: cellSize * 0.7,
                  height: cellSize * 0.7,
                  borderRadius: cellSize * 0.35,
                  borderColor: effects.head.reticle,
                },
              ]}>
                {/* Center dot */}
                <View style={[
                  styles.centerDot,
                  {
                    width: cellSize * 0.15,
                    height: cellSize * 0.15,
                    borderRadius: cellSize * 0.075,
                    backgroundColor: effects.head.centerDot,
                  },
                ]} />
              </View>
              <Text style={[styles.cellTextOverlay, {fontSize: Math.max(7, cellSize * 0.35)}]}>
                {cellContent}
              </Text>
            </LinearGradient>
          );
        } else if (cellState === 'hit') {
          cellInner = (
            <PulsingCell glowColor={effects.hit.glow} cellSize={cellSize}>
              <LinearGradient
                colors={[effects.hit.gradientStart, effects.hit.gradientEnd]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.cellInner, {width: cellSize, height: cellSize}]}>
                <Text style={[styles.cellText, {fontSize: Math.max(8, cellSize * 0.5)}]}>
                  {cellContent}
                </Text>
              </LinearGradient>
            </PulsingCell>
          );
        } else if (cellState === 'killed') {
          cellInner = (
            <LinearGradient
              colors={[effects.killed.gradientStart, effects.killed.gradientEnd]}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={[styles.cellInner, {width: cellSize, height: cellSize}]}>
              {/* X overlay */}
              <View style={styles.xContainer}>
                <View style={[
                  styles.xLine,
                  {
                    backgroundColor: effects.killed.xOverlay,
                    width: cellSize * 0.6,
                    height: 2,
                    transform: [{rotate: '45deg'}],
                  },
                ]} />
                <View style={[
                  styles.xLine,
                  {
                    backgroundColor: effects.killed.xOverlay,
                    width: cellSize * 0.6,
                    height: 2,
                    transform: [{rotate: '-45deg'}],
                  },
                ]} />
              </View>
              <Text style={[styles.cellText, {fontSize: Math.max(8, cellSize * 0.5)}]}>
                {cellContent}
              </Text>
            </LinearGradient>
          );
        } else if (cellState === 'miss') {
          cellInner = (
            <View style={[
              styles.cellInner,
              {
                width: cellSize,
                height: cellSize,
                backgroundColor: effects.miss.bg,
              },
            ]}>
              {/* Small centered dot */}
              <View style={[
                styles.missDot,
                {
                  width: cellSize * 0.2,
                  height: cellSize * 0.2,
                  borderRadius: cellSize * 0.1,
                  backgroundColor: effects.miss.dot,
                },
              ]} />
            </View>
          );
        }

        cells.push(
          <TouchableOpacity
            key={cellKey}
            onPress={(e) => onPress && onPress(row, col, e.nativeEvent.pageX, e.nativeEvent.pageY)}
            disabled={!onPress || currentTurn !== 'player'}
            activeOpacity={0.7}
            style={{margin: 1, borderRadius: 2, overflow: 'hidden'}}>
            {cellInner}
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
  board: {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    padding: 5,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
  },
  cellInner: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
  },
  cellText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  cellTextOverlay: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    position: 'absolute',
  },
  wingLine: {
    position: 'absolute',
    top: '50%',
    opacity: 0.5,
  },
  reticle: {
    position: 'absolute',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    // dimensions set inline
  },
  xContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xLine: {
    position: 'absolute',
  },
  missDot: {
    // dimensions set inline
  },
});
