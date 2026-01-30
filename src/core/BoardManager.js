/**
 * Board Manager
 * Manages the game board state, airplane collection, and attack processing
 */

import Airplane from './Airplane';
import CoordinateSystem from './CoordinateSystem';
import GameConstants from '../config/GameConstants';

class BoardManager {
  /**
   * Create a new board
   * @param {number} size - Board size (width and height)
   * @param {number} airplaneCount - Number of airplanes to place
   */
  constructor(size, airplaneCount) {
    this.size = size;
    this.airplaneCount = airplaneCount;
    this.airplanes = [];
    this.attackHistory = [];
    this.attackedCells = new Set(); // Track attacked positions
  }

  /**
   * Add an airplane to the board
   * @param {Airplane} airplane - Airplane to add
   * @returns {{success: boolean, reason: string}}
   */
  addAirplane(airplane) {
    // Check if we've reached the limit
    if (this.airplanes.length >= this.airplaneCount) {
      return {
        success: false,
        reason: 'Maximum number of airplanes reached'
      };
    }

    // Validate placement
    const validation = airplane.isValidPlacement(this.size, this.airplanes);
    if (!validation.valid) {
      return {
        success: false,
        reason: validation.reason
      };
    }

    // Add the airplane
    this.airplanes.push(airplane);
    return { success: true, reason: '' };
  }

  /**
   * Remove an airplane from the board
   * @param {number} airplaneId - ID of airplane to remove
   * @returns {boolean} - True if removed successfully
   */
  removeAirplane(airplaneId) {
    const index = this.airplanes.findIndex(a => a.id === airplaneId);
    if (index !== -1) {
      this.airplanes.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all airplanes from the board
   */
  clearAirplanes() {
    this.airplanes = [];
  }

  /**
   * Process an attack at the given position
   * @param {number} row - Attack row
   * @param {number} col - Attack column
   * @returns {{result: string, airplaneId: number|null, cellType: string|null, wasHead: boolean}}
   */
  processAttack(row, col) {
    // Check if position is within bounds
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      return {
        result: GameConstants.ATTACK_RESULTS.INVALID,
        airplaneId: null,
        cellType: null,
        wasHead: false
      };
    }

    // Check if cell was already attacked
    const cellKey = `${row},${col}`;
    if (this.attackedCells.has(cellKey)) {
      return {
        result: GameConstants.ATTACK_RESULTS.ALREADY_ATTACKED,
        airplaneId: null,
        cellType: null,
        wasHead: false
      };
    }

    // Mark cell as attacked
    this.attackedCells.add(cellKey);

    // Check each airplane for a hit
    for (const airplane of this.airplanes) {
      const hitResult = airplane.checkHit(row, col);

      // CRITICAL FIX: Skip ALREADY_ATTACKED results from destroyed airplanes
      // Continue checking other airplanes instead
      if (hitResult.result === GameConstants.ATTACK_RESULTS.ALREADY_ATTACKED) {
        continue; // This airplane is destroyed, check next one
      }

      if (hitResult.result !== GameConstants.ATTACK_RESULTS.MISS) {
        // Record the attack in history
        this.attackHistory.push({
          row,
          col,
          coordinate: CoordinateSystem.positionToCoordinate(row, col),
          result: hitResult.result,
          airplaneId: airplane.id,
          cellType: hitResult.cellType,
          wasHead: hitResult.wasHead,
          timestamp: Date.now()
        });

        return {
          result: hitResult.result,
          airplaneId: airplane.id,
          cellType: hitResult.cellType,
          wasHead: hitResult.wasHead
        };
      }
    }

    // No hit - it's a miss
    this.attackHistory.push({
      row,
      col,
      coordinate: CoordinateSystem.positionToCoordinate(row, col),
      result: GameConstants.ATTACK_RESULTS.MISS,
      airplaneId: null,
      cellType: null,
      wasHead: false,
      timestamp: Date.now()
    });

    return {
      result: GameConstants.ATTACK_RESULTS.MISS,
      airplaneId: null,
      cellType: null,
      wasHead: false
    };
  }

  /**
   * Check if all airplanes are destroyed
   * @returns {boolean}
   */
  areAllAirplanesDestroyed() {
    return this.airplanes.length > 0 &&
           this.airplanes.every(airplane => airplane.isDestroyed);
  }

  /**
   * Get the number of remaining (not destroyed) airplanes
   * @returns {number}
   */
  getRemainingAirplaneCount() {
    return this.airplanes.filter(airplane => !airplane.isDestroyed).length;
  }

  /**
   * Check if a cell contains an airplane part
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @returns {boolean}
   */
  hasAirplaneAt(row, col) {
    return this.airplanes.some(airplane => airplane.hasCell(row, col));
  }

  /**
   * Get airplane at a specific cell
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @returns {Airplane|null}
   */
  getAirplaneAt(row, col) {
    return this.airplanes.find(airplane => airplane.hasCell(row, col)) || null;
  }

  /**
   * Check if a cell has been attacked
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @returns {boolean}
   */
  isCellAttacked(row, col) {
    return this.attackedCells.has(`${row},${col}`);
  }

  /**
   * Get cell state for rendering
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @param {boolean} revealAirplanes - Whether to reveal airplane positions
   * @returns {string} - Cell state
   */
  getCellState(row, col, revealAirplanes = false) {
    const cellKey = `${row},${col}`;
    const isAttacked = this.attackedCells.has(cellKey);
    const airplane = this.getAirplaneAt(row, col);

    if (isAttacked) {
      if (airplane) {
        if (airplane.isCellHit(row, col)) {
          // Only show KILLED state for the head cell when airplane is destroyed
          if (airplane.isDestroyed) {
            const cellType = airplane.getCellType(row, col);
            if (cellType === 'head') {
              return GameConstants.CELL_STATES.KILLED;
            }
          }
          return GameConstants.CELL_STATES.HIT;
        }
      }
      return GameConstants.CELL_STATES.MISS;
    }

    if (revealAirplanes && airplane) {
      return GameConstants.CELL_STATES.AIRPLANE;
    }

    return GameConstants.CELL_STATES.EMPTY;
  }

  /**
   * Get attack history
   * @returns {Array} - Array of attack records
   */
  getAttackHistory() {
    return [...this.attackHistory];
  }

  /**
   * Get the last N attacks
   * @param {number} count - Number of attacks to retrieve
   * @returns {Array} - Array of recent attack records
   */
  getRecentAttacks(count) {
    return this.attackHistory.slice(-count);
  }

  /**
   * Randomly place all airplanes on the board
   * @returns {boolean} - True if all airplanes were placed successfully
   */
  placeAirplanesRandomly() {
    const maxRetries = 10; // Retry up to 10 times if placement fails

    for (let retry = 0; retry < maxRetries; retry++) {
      this.clearAirplanes();
      let success = true;

      for (let i = 0; i < this.airplaneCount; i++) {
        // Increase attempts based on airplane count and board size
        // More airplanes = more attempts needed
        const maxAttempts = Math.max(100, this.airplaneCount * 100);

        const airplane = Airplane.createRandom(
          this.size,
          this.airplanes,
          i,
          maxAttempts
        );

        if (!airplane) {
          console.warn(`[BoardManager] Failed to place airplane ${i + 1}/${this.airplaneCount} on attempt ${retry + 1}/${maxRetries}`);
          success = false;
          break;
        }

        this.airplanes.push(airplane);
      }

      if (success) {
        console.log(`[BoardManager] Successfully placed all ${this.airplaneCount} airplanes on ${this.size}x${this.size} board`);
        return true;
      }
    }

    // Failed after all retries
    console.error(`[BoardManager] ❌ Failed to place ${this.airplaneCount} airplanes on ${this.size}x${this.size} board after ${maxRetries} retries`);
    this.clearAirplanes();
    return false;
  }

  /**
   * Check if deployment is complete
   * @returns {boolean}
   */
  isDeploymentComplete() {
    return this.airplanes.length === this.airplaneCount;
  }

  /**
   * Get board statistics
   * @returns {Object}
   */
  getStatistics() {
    return {
      totalAirplanes: this.airplaneCount,
      placedAirplanes: this.airplanes.length,
      destroyedAirplanes: this.airplanes.filter(a => a.isDestroyed).length,
      remainingAirplanes: this.getRemainingAirplaneCount(),
      totalAttacks: this.attackHistory.length,
      hits: this.attackHistory.filter(a =>
        a.result === GameConstants.ATTACK_RESULTS.HIT ||
        a.result === GameConstants.ATTACK_RESULTS.KILL
      ).length,
      misses: this.attackHistory.filter(a =>
        a.result === GameConstants.ATTACK_RESULTS.MISS
      ).length,
      accuracy: this.attackHistory.length > 0
        ? (this.attackHistory.filter(a =>
            a.result === GameConstants.ATTACK_RESULTS.HIT ||
            a.result === GameConstants.ATTACK_RESULTS.KILL
          ).length / this.attackHistory.length * 100).toFixed(1)
        : 0
    };
  }

  /**
   * Serialize board state
   * @returns {Object}
   */
  toJSON() {
    return {
      size: this.size,
      airplaneCount: this.airplaneCount,
      airplanes: this.airplanes.map(a => a.toJSON()),
      attackHistory: this.attackHistory,
      attackedCells: Array.from(this.attackedCells)
    };
  }

  /**
   * Restore board from serialized state
   * @param {Object} data - Serialized board data
   * @returns {BoardManager}
   */
  static fromJSON(data) {
    const board = new BoardManager(data.size, data.airplaneCount);
    board.airplanes = data.airplanes.map(a => Airplane.fromJSON(a));
    board.attackHistory = data.attackHistory || [];
    board.attackedCells = new Set(data.attackedCells || []);
    return board;
  }

  /**
   * Reset the board (clear attacks but keep airplanes)
   */
  reset() {
    this.attackHistory = [];
    this.attackedCells.clear();
    this.airplanes.forEach(airplane => {
      airplane.hits.clear();
      airplane.isDestroyed = false;
    });
  }

  /**
   * Get all airplane cells (for rendering or collision detection)
   * @returns {Array<{row: number, col: number, airplaneId: number, type: string}>}
   */
  getAllAirplaneCells() {
    const cells = [];
    this.airplanes.forEach(airplane => {
      airplane.getCells().forEach(cell => {
        cells.push({
          ...cell,
          airplaneId: airplane.id
        });
      });
    });
    return cells;
  }

  /**
   * Record an attack result from external source (e.g., server in online multiplayer)
   * Used when we know the attack result but don't have the opponent's airplane positions
   * @param {number} row - Attack row
   * @param {number} col - Attack column
   * @param {string} result - Attack result (MISS, HIT, or KILL)
   * @param {number|null} airplaneId - Optional airplane ID
   */
  recordExternalAttack(row, col, result, airplaneId = null) {
    const cellKey = `${row},${col}`;

    // Mark cell as attacked
    this.attackedCells.add(cellKey);

    // Record in attack history
    this.attackHistory.push({
      row,
      col,
      coordinate: CoordinateSystem.positionToCoordinate(row, col),
      result,
      airplaneId,
      cellType: null,
      wasHead: result === GameConstants.ATTACK_RESULTS.KILL,
      timestamp: Date.now()
    });
  }
}


export default BoardManager;
