/**
 * Draggable Airplane Component
 * Displays a draggable airplane template that users can place on the board
 */

import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import GameConstants from '../config/GameConstants';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Props {
  direction: Direction;
  onDragEnd: (x: number, y: number) => void;
  onDragStart: () => void;
  onDragMove?: (x: number, y: number) => void; // 新增：拖拽移动回调
  color?: string;
}

const {width, height} = Dimensions.get('window');

const MINI_CELL_SIZE = 8; // 迷你格子大小

export default function DraggableAirplane({
  direction,
  onDragEnd,
  onDragStart,
  onDragMove,
  color = '#2196F3',
}: Props) {
  console.log('[DraggableAirplane] Rendered with direction:', direction);
  const pan = useRef(new Animated.ValueXY()).current;
  const initialPosition = useRef({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gestureState) => {
        // Store initial position
        initialPosition.current = {
          x: gestureState.x0,
          y: gestureState.y0,
        };
        setIsDragging(true);
        onDragStart();
      },
      onPanResponderMove: (e, gestureState) => {
        // 更新动画位置
        pan.setValue({x: gestureState.dx, y: gestureState.dy});

        // 通知父组件当前拖拽位置
        if (onDragMove) {
          const currentX = gestureState.moveX;
          const currentY = gestureState.moveY;
          onDragMove(currentX, currentY);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        // Calculate final position
        const finalX = gestureState.moveX;
        const finalY = gestureState.moveY;

        setIsDragging(false);

        // Notify parent component
        onDragEnd(finalX, finalY);

        // Reset position
        Animated.spring(pan, {
          toValue: {x: 0, y: 0},
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const getAirplaneShape = () => {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      case 'left':
        return '←';
      case 'right':
        return '→';
    }
  };

  // 获取飞机的所有格子（用于拖拽时预览）
  const getAirplaneCells = () => {
    const cells: Array<{row: number; col: number; type: string}> = [];
    const rotation = GameConstants.ROTATION_MATRICES[direction];

    // Helper function to transform coordinates based on direction
    const transformCoord = (relRow: number, relCol: number) => {
      if (rotation.swap) {
        const temp = relRow;
        relRow = relCol;
        relCol = temp;
      }
      return {
        row: relRow * rotation.rowMult,
        col: relCol * rotation.colMult,
      };
    };

    // Add head (0, 0)
    cells.push({row: 0, col: 0, type: 'head'});

    // Add body cells
    GameConstants.AIRPLANE.STRUCTURE.BODY.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      cells.push({...transformed, type: 'body'});
    });

    // Add wing cells
    GameConstants.AIRPLANE.STRUCTURE.WINGS.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      const exists = cells.some(
        cell => cell.row === transformed.row && cell.col === transformed.col
      );
      if (!exists) {
        cells.push({...transformed, type: 'wing'});
      }
    });

    // Add tail cells
    GameConstants.AIRPLANE.STRUCTURE.TAIL.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      const exists = cells.some(
        cell => cell.row === transformed.row && cell.col === transformed.col
      );
      if (!exists) {
        cells.push({...transformed, type: 'tail'});
      }
    });

    return cells;
  };

  // 拖拽时渲染完整飞机预览
  if (isDragging) {
    const cells = getAirplaneCells();
    const minRow = Math.min(...cells.map(c => c.row));
    const maxRow = Math.max(...cells.map(c => c.row));
    const minCol = Math.min(...cells.map(c => c.col));
    const maxCol = Math.max(...cells.map(c => c.col));

    const width = (maxCol - minCol + 1) * MINI_CELL_SIZE;
    const height = (maxRow - minRow + 1) * MINI_CELL_SIZE;

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            transform: [{translateX: pan.x}, {translateY: pan.y}],
          },
        ]}>
        <View style={{width, height, position: 'relative'}}>
          {cells.map((cell, idx) => {
            const cellStyle = {
              position: 'absolute' as const,
              left: (cell.col - minCol) * MINI_CELL_SIZE,
              top: (cell.row - minRow) * MINI_CELL_SIZE,
              width: MINI_CELL_SIZE,
              height: MINI_CELL_SIZE,
              backgroundColor: cell.type === 'head' ? '#FF5722' : color,
              borderWidth: 0.5,
              borderColor: '#fff',
            };
            return <View key={idx} style={cellStyle} />;
          })}
        </View>
      </Animated.View>
    );
  }

  // 静止时渲染简单图标
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          backgroundColor: color,
          transform: [{translateX: pan.x}, {translateY: pan.y}],
        },
      ]}>
      <Text style={styles.icon}>✈</Text>
      <Text style={styles.direction}>{getAirplaneShape()}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 24,
    color: '#fff',
  },
  direction: {
    fontSize: 16,
    color: '#fff',
    marginTop: 2,
  },
});
