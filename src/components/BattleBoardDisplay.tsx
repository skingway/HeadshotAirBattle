/**
 * Battle Board Display Component
 * Static display of a completed game board for battle reports
 * Shows airplane positions and attack results
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, fonts} from '../theme/colors';

interface AirplaneData {
  id: string;
  headRow: number;
  headCol: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

interface AttackData {
  row: number;
  col: number;
  result: 'hit' | 'miss' | 'kill';
  timestamp: number;
}

interface BoardData {
  airplanes: AirplaneData[];
  attacks: AttackData[];
}

interface BattleBoardDisplayProps {
  boardSize: number;
  boardData: BoardData | null;
  title: string;
  cellSize?: number;
}

export default function BattleBoardDisplay({
  boardSize,
  boardData,
  title,
  cellSize = 24,
}: BattleBoardDisplayProps) {
  if (!boardData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>No board data available</Text>
      </View>
    );
  }

  // Helper: Get all cells occupied by an airplane
  const getAirplaneCells = (airplane: AirplaneData): {row: number; col: number; type: string}[] => {
    const cells = [];
    const {headRow, headCol, direction} = airplane;

    // Rotation matrices - same as in GameConstants
    const rotationMatrices = {
      up: { rowMult: 1, colMult: 1, swap: false },
      down: { rowMult: -1, colMult: -1, swap: false },
      left: { rowMult: -1, colMult: 1, swap: true },
      right: { rowMult: 1, colMult: -1, swap: true }
    };

    const rotation = rotationMatrices[direction];

    // Transform function
    const transformCoord = (relRow: number, relCol: number) => {
      let r = relRow;
      let c = relCol;

      if (rotation.swap) {
        const temp = r;
        r = c;
        c = temp;
      }

      return {
        row: headRow + (r * rotation.rowMult),
        col: headCol + (c * rotation.colMult)
      };
    };

    // Head cell
    cells.push({row: headRow, col: headCol, type: 'head'});

    // Body cells (3 cells)
    const bodyPositions = [
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 }
    ];
    bodyPositions.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      cells.push({...transformed, type: 'body'});
    });

    // Wing cells (5 cells, center overlaps with body at row 1)
    const wingPositions = [
      { row: 1, col: -2 },
      { row: 1, col: -1 },
      { row: 1, col: 0 },  // Center - overlaps with body
      { row: 1, col: 1 },
      { row: 1, col: 2 }
    ];
    wingPositions.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      // Check if this cell already exists (center overlaps)
      const exists = cells.some(cell =>
        cell.row === transformed.row && cell.col === transformed.col
      );
      if (!exists) {
        cells.push({...transformed, type: 'wing'});
      }
    });

    // Tail cells (3 cells, center overlaps with body at row 3)
    const tailPositions = [
      { row: 3, col: -1 },
      { row: 3, col: 0 },  // Center - overlaps with body
      { row: 3, col: 1 }
    ];
    tailPositions.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      // Check if this cell already exists (center overlaps)
      const exists = cells.some(cell =>
        cell.row === transformed.row && cell.col === transformed.col
      );
      if (!exists) {
        cells.push({...transformed, type: 'tail'});
      }
    });

    return cells;
  };

  // Helper: Check if a cell has an airplane
  const getAirplaneAtPosition = (row: number, col: number) => {
    for (const airplane of boardData.airplanes) {
      const cells = getAirplaneCells(airplane);
      for (const cell of cells) {
        if (cell.row === row && cell.col === col) {
          return {airplane, cellType: cell.type};
        }
      }
    }
    return null;
  };

  // Helper: Check if a cell was attacked and get the result
  const getAttackResult = (row: number, col: number): AttackData | null => {
    return boardData.attacks.find(a => a.row === row && a.col === col) || null;
  };

  // Helper: Check if an airplane is destroyed
  const isAirplaneDestroyed = (airplane: AirplaneData): boolean => {
    const cells = getAirplaneCells(airplane);
    // An airplane is destroyed if all its cells were hit
    return cells.every(cell => {
      const attack = getAttackResult(cell.row, cell.col);
      return attack && attack.result !== 'miss';
    });
  };

  const renderBoard = () => {
    const rows = [];

    for (let row = 0; row < boardSize; row++) {
      const cells = [];

      for (let col = 0; col < boardSize; col++) {
        const cellKey = `${row}-${col}`;
        const airplaneInfo = getAirplaneAtPosition(row, col);
        const attack = getAttackResult(row, col);

        let cellStyle = [styles.cell, {width: cellSize, height: cellSize}];
        let cellContent = '';
        let attackMarker = '';

        // First, set base style based on whether there's an airplane
        if (airplaneInfo) {
          // Show airplane background and icon
          cellStyle.push(styles.cellAirplane);
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
          // Empty cell
          cellStyle.push(styles.cellEmpty);
        }

        // Then, overlay attack results
        if (attack) {
          if (attack.result === 'miss') {
            // Miss only on empty cells
            if (!airplaneInfo) {
              cellStyle.push(styles.cellMiss);
              cellContent = '○';
            }
          } else if (attack.result === 'hit') {
            // Hit on airplane body
            cellStyle.push(styles.cellHit);
            attackMarker = '🔥';
          } else if (attack.result === 'kill') {
            // Kill - show on airplane head
            if (airplaneInfo?.cellType === 'head') {
              cellStyle.push(styles.cellKilled);
              attackMarker = '💥';
            } else {
              // Other cells of killed airplane still show as hit
              cellStyle.push(styles.cellHit);
              attackMarker = '🔥';
            }
          }
        }

        cells.push(
          <View key={cellKey} style={cellStyle}>
            {cellContent && (
              <Text style={[styles.cellText, {fontSize: Math.max(8, cellSize * 0.45)}]}>
                {cellContent}
              </Text>
            )}
            {attackMarker && (
              <Text style={[styles.attackMarker, {fontSize: Math.max(10, cellSize * 0.5)}]}>
                {attackMarker}
              </Text>
            )}
          </View>
        );
      }

      rows.push(
        <View key={row} style={styles.row}>
          {cells}
        </View>
      );
    }

    return rows;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.board}>{renderBoard()}</View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>✈ Airplane  🔥 Hit  💥 Kill  ○ Miss</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.orbitronSemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  noData: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  board: {
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: colors.accentBorder,
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 212, 255, 0.12)',
  },
  cellEmpty: {
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
  },
  cellAirplane: {
    backgroundColor: 'rgba(0, 212, 255, 0.25)',
  },
  cellHit: {
    backgroundColor: 'rgba(255, 77, 77, 0.5)',
  },
  cellKilled: {
    backgroundColor: 'rgba(255, 40, 40, 0.7)',
  },
  cellMiss: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cellText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  attackMarker: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  legend: {
    marginTop: 8,
    alignItems: 'center',
  },
  legendText: {
    fontFamily: fonts.rajdhaniRegular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
