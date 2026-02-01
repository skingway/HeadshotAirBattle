/**
 * Deployment Phase Component
 * Allows players to manually deploy airplanes by dragging and dropping
 */

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import BoardManager from '../core/BoardManager';
import Airplane from '../core/Airplane';
import DraggableAirplane from './DraggableAirplane';
import SkinService from '../services/SkinService';
import {useOrientation} from '../hooks/useOrientation';

type Direction = 'up' | 'down' | 'left' | 'right';

interface Props {
  boardSize: number;
  airplaneCount: number;
  onDeploymentComplete: (board: BoardManager) => void;
  onCancel: () => void;
}

const BOARD_PADDING = 20; // Padding around the board

export default function DeploymentPhase({
  boardSize,
  airplaneCount,
  onDeploymentComplete,
  onCancel,
}: Props) {
  const [board] = useState(() => new BoardManager(boardSize, airplaneCount));
  const [deployedCount, setDeployedCount] = useState(0);
  const [currentDirection, setCurrentDirection] = useState<Direction>('up');
  const [refreshKey, setRefreshKey] = useState(0);
  const boardViewRef = useRef<View>(null);
  const boardLayoutRef = useRef({x: 0, y: 0, width: 0, height: 0});
  const isBoardReadyRef = useRef(false);
  const [, forceUpdate] = useState(0); // For UI updates

  // Detect orientation changes
  const orientation = useOrientation();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Listen to dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setDimensions(window);
      // Reset board ready flag to trigger remeasure
      isBoardReadyRef.current = false;
      setTimeout(() => forceUpdate(prev => prev + 1), 100);
    });

    return () => subscription?.remove();
  }, []);

  // Calculate dynamic cell size based on screen width and board size
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;
  const isLandscape = orientation === 'landscape';

  // In landscape, use a larger portion of screen width, but cap it
  const maxWidth = isLandscape ? Math.min(screenHeight * 0.6, 600) : Math.min(screenWidth - BOARD_PADDING * 2 - 40, 500);
  const availableWidth = maxWidth;
  const cellSize = Math.floor((availableWidth - boardSize * 2) / boardSize);

  // 拖拽预览状态
  const [previewPosition, setPreviewPosition] = useState<{row: number; col: number; direction: Direction} | null>(null);
  const [previewValid, setPreviewValid] = useState(true);

  // Direction rotation helpers
  const directionCycle: Direction[] = ['up', 'right', 'down', 'left'];

  const rotateLeft = () => {
    const currentIndex = directionCycle.indexOf(currentDirection);
    const newIndex = (currentIndex - 1 + 4) % 4; // 逆时针：up→left→down→right
    const newDirection = directionCycle[newIndex];
    console.log('[Deployment] Rotate Left:', currentDirection, '→', newDirection);
    setCurrentDirection(newDirection);
  };

  const rotateRight = () => {
    const currentIndex = directionCycle.indexOf(currentDirection);
    const newIndex = (currentIndex + 1) % 4; // 顺时针：up→right→down→left
    const newDirection = directionCycle[newIndex];
    console.log('[Deployment] Rotate Right:', currentDirection, '→', newDirection);
    setCurrentDirection(newDirection);
  };

  // Handle board layout measurement via onLayout (more reliable)
  const handleBoardLayoutEvent = useCallback((event: any) => {
    const {x, y, width, height} = event.nativeEvent.layout;

    // measureInWindow to get screen coordinates
    if (boardViewRef.current && width > 0 && height > 0) {
      boardViewRef.current.measureInWindow((screenX, screenY, screenWidth, screenHeight) => {
        if (screenWidth > 0 && screenHeight > 0) {
          console.log('[Deployment] ✓ Board layout ready:', {x: screenX, y: screenY, width: screenWidth, height: screenHeight});
          boardLayoutRef.current = {x: screenX, y: screenY, width: screenWidth, height: screenHeight};
          isBoardReadyRef.current = true;
          forceUpdate(prev => prev + 1); // Update UI
        } else {
          // Fallback: use layout coordinates
          console.log('[Deployment] Using layout coordinates as fallback');
          boardLayoutRef.current = {x, y, width, height};
          isBoardReadyRef.current = true;
          forceUpdate(prev => prev + 1);
        }
      });
    }
  }, []);

  // 拖拽移动时更新预览
  const handleDragMove = (screenX: number, screenY: number) => {
    const layout = boardLayoutRef.current;
    const isReady = isBoardReadyRef.current;

    if (!isReady || !layout.width || layout.width === 0) {
      return;
    }

    // Convert screen coordinates to board coordinates
    const relativeX = screenX - layout.x;
    const relativeY = screenY - layout.y;

    // Calculate row and column
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);

    // Check if within board bounds
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      // 检查是否可以放置
      const testAirplane = new Airplane(row, col, currentDirection, board.airplanes.length);
      const validation = testAirplane.isValidPlacement(boardSize, board.airplanes);

      setPreviewPosition({row, col, direction: currentDirection});
      setPreviewValid(validation.valid);
    } else {
      setPreviewPosition(null);
    }
  };

  const handleDragEnd = (screenX: number, screenY: number) => {
    const layout = boardLayoutRef.current;
    const isReady = isBoardReadyRef.current;
    console.log('[Deployment] Drop at screen:', screenX, screenY);
    console.log('[Deployment] Board ready?', isReady);
    console.log('[Deployment] Board layout (ref):', layout);

    // 清除预览
    setPreviewPosition(null);

    if (!isReady || !layout.width || layout.width === 0) {
      console.warn('[Deployment] Board not ready, triggering remeasure...');

      Alert.alert(
        'Please wait',
        'Board is still loading. Please wait 1-2 seconds and try again.',
        [{text: 'OK'}]
      );
      return;
    }

    // Convert screen coordinates to board coordinates
    const relativeX = screenX - layout.x;
    const relativeY = screenY - layout.y;

    // Calculate row and column
    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);

    console.log('[Deployment] Relative:', relativeX, relativeY);
    console.log('[Deployment] Grid position:', row, col);

    // Check if within board bounds
    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      Alert.alert('Invalid Position', 'Please drop the airplane on the board.');
      return;
    }

    // Try to place airplane
    const airplaneId = board.airplanes.length; // Use current count as ID
    console.log('[Deployment] Placing airplane with direction:', currentDirection);
    const airplane = new Airplane(row, col, currentDirection, airplaneId);
    console.log('[Deployment] Airplane created:', {id: airplaneId, row, col, direction: airplane.direction});
    const result = board.addAirplane(airplane);

    if (result.success) {
      setDeployedCount(prev => prev + 1);
      setRefreshKey(prev => prev + 1); // Force re-render
      Alert.alert('Success', `Airplane deployed! (${deployedCount + 1}/${airplaneCount})`);
    } else {
      Alert.alert('Cannot Place', result.reason || 'Invalid position');
    }
  };

  const handleClear = () => {
    Alert.alert('Clear All', 'Remove all deployed airplanes?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          board.clearAirplanes();
          setDeployedCount(0);
          setRefreshKey(prev => prev + 1);
        },
      },
    ]);
  };

  const handleAutoDeploy = () => {
    board.clearAirplanes();
    const success = board.placeAirplanesRandomly();
    if (success) {
      setDeployedCount(airplaneCount);
      setRefreshKey(prev => prev + 1);
      Alert.alert('Success', 'All airplanes deployed automatically!');
    } else {
      Alert.alert('Error', 'Failed to auto-deploy airplanes');
    }
  };

  const handleStartBattle = () => {
    if (deployedCount < airplaneCount) {
      Alert.alert(
        'Incomplete',
        `Please deploy all ${airplaneCount} airplanes before starting battle. (${deployedCount}/${airplaneCount} deployed)`
      );
      return;
    }

    onDeploymentComplete(board);
  };

  const renderCell = (row: number, col: number) => {
    const hasAirplane = board.hasAirplaneAt(row, col);
    const airplane = board.getAirplaneAt(row, col);

    // Get current skin colors
    const themeColors = SkinService.getCurrentThemeColors();
    const airplaneColor = SkinService.getCurrentSkinColor();

    let cellStyle = [styles.cell, {width: cellSize, height: cellSize}];
    let backgroundColor = themeColors.cellEmpty;
    let cellText = '';
    let isPreview = false;
    let previewCellType = '';

    // 检查是否是预览位置
    if (previewPosition) {
      const previewAirplane = new Airplane(
        previewPosition.row,
        previewPosition.col,
        previewPosition.direction,
        999 // 临时ID
      );
      if (previewAirplane.hasCell(row, col)) {
        isPreview = true;
        previewCellType = previewAirplane.getCellType(row, col);
      }
    }

    // 已部署的飞机
    if (hasAirplane && airplane) {
      const cellType = airplane.getCellType(row, col);
      backgroundColor = airplaneColor;

      // Show different symbols for different parts
      if (cellType === 'head') {
        // Show arrow direction for head
        const directionArrows = {
          up: '↑',
          down: '↓',
          left: '←',
          right: '→',
        };
        cellText = directionArrows[airplane.direction as Direction];
      } else if (cellType === 'body') {
        cellText = '●'; // Body
      } else if (cellType === 'wing') {
        cellText = '◆'; // Wing
      } else {
        cellText = '○'; // Tail
      }
    }
    // 预览位置
    else if (isPreview) {
      backgroundColor = previewValid ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
      if (!previewValid) {
        cellStyle.push({borderColor: '#F44336', borderWidth: 2});
      } else {
        cellStyle.push({borderColor: '#4CAF50', borderWidth: 2});
      }

      if (previewCellType === 'head') {
        // Show arrow direction for preview head
        const directionArrows = {
          up: '↑',
          down: '↓',
          left: '←',
          right: '→',
        };
        cellText = directionArrows[previewPosition!.direction as Direction];
      } else if (previewCellType === 'body') {
        cellText = '●'; // Body
      } else if (previewCellType === 'wing') {
        cellText = '◆'; // Wing
      } else {
        cellText = '○'; // Tail
      }
    }

    return (
      <View key={`${row}-${col}`} style={[cellStyle, {backgroundColor}]}>
        <Text style={[styles.cellText, {fontSize: Math.max(10, cellSize * 0.5)}]}>{cellText}</Text>
      </View>
    );
  };

  const renderBoard = () => {
    return (
      <View style={styles.boardContainer}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
          <Text style={styles.boardTitle}>Your Board (Drop airplanes here)</Text>
          <View style={{
            marginLeft: 10,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: isBoardReadyRef.current ? '#4CAF50' : '#FF9800',
          }} />
        </View>
        <View
          ref={boardViewRef}
          collapsable={false}
          onLayout={handleBoardLayoutEvent}
          style={styles.board}>
          {Array.from({length: boardSize}, (_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({length: boardSize}, (_, col) => renderCell(row, col))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deploy Your Airplanes</Text>
        <Text style={styles.subtitle}>
          Deployed: {deployedCount}/{airplaneCount}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderBoard()}

        <View style={styles.templatesContainer}>
          <Text style={styles.templatesTitle}>Rotate & Drag Airplane:</Text>

          <View style={styles.rotationContainer}>
            <TouchableOpacity
              style={styles.rotateButton}
              activeOpacity={0.7}
              onPress={() => {
                console.log('[Deployment] LEFT BUTTON PRESSED!');
                rotateLeft();
              }}>
              <Text style={styles.rotateButtonText}>↺ Rotate Left</Text>
            </TouchableOpacity>

            <View style={styles.airplanePreview}>
              <DraggableAirplane
                key={currentDirection}
                direction={currentDirection}
                onDragEnd={handleDragEnd}
                onDragMove={handleDragMove}
                onDragStart={() => console.log('[Deployment] Drag started, direction:', currentDirection)}
                color={SkinService.getCurrentSkinColor()}
              />
              <Text style={styles.directionIndicator}>
                {currentDirection === 'up' && '↑'}
                {currentDirection === 'right' && '→'}
                {currentDirection === 'down' && '↓'}
                {currentDirection === 'left' && '←'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.rotateButton}
              activeOpacity={0.7}
              onPress={() => {
                console.log('[Deployment] RIGHT BUTTON PRESSED!');
                rotateRight();
              }}>
              <Text style={styles.rotateButtonText}>↻ Rotate Right</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.autoButton} onPress={handleAutoDeploy}>
            <Text style={styles.autoButtonText}>Auto Deploy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.startButton,
            deployedCount < airplaneCount && styles.startButtonDisabled,
          ]}
          onPress={handleStartBattle}
          disabled={deployedCount < airplaneCount}>
          <Text style={styles.startButtonText}>Start Battle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Back to Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 15,
    backgroundColor: '#16213e',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  boardTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
  },
  board: {
    backgroundColor: '#0f3460',
    borderWidth: 2,
    borderColor: '#16213e',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 1,
    borderColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    color: '#fff',
    fontSize: 12,
  },
  templatesContainer: {
    backgroundColor: '#16213e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  templatesTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  rotationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 10,
  },
  rotateButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  rotateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  airplanePreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionIndicator: {
    fontSize: 24,
    color: '#FFD700',
    marginTop: 5,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  autoButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  autoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  startButtonDisabled: {
    backgroundColor: '#666',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
