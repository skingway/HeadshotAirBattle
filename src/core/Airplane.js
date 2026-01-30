/**
 * Airplane Model
 * Represents a single airplane with 12 cells:
 * - Head: 1 cell (instant kill if hit)
 * - Body: 4 cells vertical
 * - Wings: 5 cells horizontal (at body position 2)
 * - Tail: 3 cells horizontal (at body position 4)
 */

import GameConstants from '../config/GameConstants';

class Airplane {
  /**
   * Create a new airplane
   * @param {number} headRow - Head position row (0-based)
   * @param {number} headCol - Head position column (0-based)
   * @param {string} direction - Direction ('up', 'down', 'left', 'right')
   * @param {number} id - Unique identifier for this airplane
   */
  constructor(headRow, headCol, direction, id) {
    this.id = id;
    this.headRow = headRow;
    this.headCol = headCol;
    this.direction = direction;
    this.cells = this.calculateCells();
    this.hits = new Set(); // Track which cells have been hit
    this.isDestroyed = false;
  }

  /**
   * Calculate all 12 cell positions based on head position and direction
   * @returns {Array<{row: number, col: number, type: string}>}
   */
  calculateCells() {
    const cells = [];
    const rotation = GameConstants.ROTATION_MATRICES[this.direction];

    // Add head
    cells.push({
      row: this.headRow,
      col: this.headCol,
      type: 'head'
    });

    // Helper function to transform coordinates based on direction
    const transformCoord = (relRow, relCol) => {
      if (rotation.swap) {
        // Swap row and col for left/right directions
        const temp = relRow;
        relRow = relCol;
        relCol = temp;
      }

      return {
        row: this.headRow + (relRow * rotation.rowMult),
        col: this.headCol + (relCol * rotation.colMult)
      };
    };

    // Add body cells (4 cells)
    GameConstants.AIRPLANE.STRUCTURE.BODY.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      cells.push({
        ...transformed,
        type: 'body'
      });
    });

    // Add wing cells (5 cells, one overlaps with body)
    GameConstants.AIRPLANE.STRUCTURE.WINGS.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      // Check if this cell already exists (center wing overlaps with body)
      const exists = cells.some(cell =>
        cell.row === transformed.row && cell.col === transformed.col
      );
      if (!exists) {
        cells.push({
          ...transformed,
          type: 'wing'
        });
      }
    });

    // Add tail cells (3 cells, one overlaps with body)
    GameConstants.AIRPLANE.STRUCTURE.TAIL.forEach(pos => {
      const transformed = transformCoord(pos.row, pos.col);
      // Check if this cell already exists (center tail overlaps with body)
      const exists = cells.some(cell =>
        cell.row === transformed.row && cell.col === transformed.col
      );
      if (!exists) {
        cells.push({
          ...transformed,
          type: 'tail'
        });
      }
    });

    return cells;
  }

  /**
   * Check if airplane placement is valid (within bounds and no overlaps)
   * @param {number} boardSize - Size of the game board
   * @param {Array<Airplane>} existingAirplanes - Other airplanes on the board
   * @returns {{valid: boolean, reason: string}}
   */
  isValidPlacement(boardSize, existingAirplanes = []) {
    // Check if all cells are within bounds
    for (const cell of this.cells) {
      if (cell.row < 0 || cell.row >= boardSize ||
          cell.col < 0 || cell.col >= boardSize) {
        return {
          valid: false,
          reason: 'Airplane extends outside board boundaries'
        };
      }
    }

    // Check for overlaps with existing airplanes
    for (const existingAirplane of existingAirplanes) {
      if (existingAirplane.id === this.id) continue; // Skip self

      for (const myCell of this.cells) {
        for (const theirCell of existingAirplane.cells) {
          if (myCell.row === theirCell.row && myCell.col === theirCell.col) {
            return {
              valid: false,
              reason: 'Airplane overlaps with another airplane'
            };
          }
        }
      }
    }

    return { valid: true, reason: '' };
  }

  /**
   * Process an attack on this airplane
   * @param {number} row - Attack row position
   * @param {number} col - Attack column position
   * @returns {{result: string, wasHead: boolean, cellType: string|null}}
   */
  checkHit(row, col) {
    // Find if this cell belongs to this airplane
    const hitCell = this.cells.find(cell =>
      cell.row === row && cell.col === col
    );

    if (!hitCell) {
      return {
        result: GameConstants.ATTACK_RESULTS.MISS,
        wasHead: false,
        cellType: null
      };
    }

    // Check if this cell was already hit
    const cellKey = `${row},${col}`;
    if (this.hits.has(cellKey)) {
      return {
        result: GameConstants.ATTACK_RESULTS.ALREADY_ATTACKED,
        wasHead: hitCell.type === 'head',
        cellType: hitCell.type
      };
    }

    // CRITICAL FIX: If airplane is already destroyed, treat new attacks as MISS
    // This prevents duplicate KILL notifications and ensures correct display
    if (this.isDestroyed) {
      return {
        result: GameConstants.ATTACK_RESULTS.MISS,
        wasHead: false,
        cellType: null
      };
    }

    // Record the hit
    this.hits.add(cellKey);

    // Check if head was hit (instant kill)
    if (hitCell.type === 'head') {
      this.isDestroyed = true;
      return {
        result: GameConstants.ATTACK_RESULTS.KILL,
        wasHead: true,
        cellType: 'head'
      };
    }

    // Check if all cells are hit (airplane destroyed)
    if (this.hits.size === this.cells.length) {
      this.isDestroyed = true;
      return {
        result: GameConstants.ATTACK_RESULTS.KILL,
        wasHead: false,
        cellType: hitCell.type
      };
    }

    // Regular hit
    return {
      result: GameConstants.ATTACK_RESULTS.HIT,
      wasHead: false,
      cellType: hitCell.type
    };
  }

  /**
   * Check if a specific cell belongs to this airplane
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @returns {boolean}
   */
  hasCell(row, col) {
    return this.cells.some(cell =>
      cell.row === row && cell.col === col
    );
  }

  /**
   * Get the type of cell at a specific position
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @returns {string|null} - Cell type or null if not part of this airplane
   */
  getCellType(row, col) {
    const cell = this.cells.find(c => c.row === row && c.col === col);
    return cell ? cell.type : null;
  }

  /**
   * Check if a cell has been hit
   * @param {number} row - Cell row
   * @param {number} col - Cell column
   * @returns {boolean}
   */
  isCellHit(row, col) {
    return this.hits.has(`${row},${col}`);
  }

  /**
   * Get all cells occupied by this airplane
   * @returns {Array<{row: number, col: number, type: string}>}
   */
  getCells() {
    return [...this.cells];
  }

  /**
   * Get airplane state for serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      headRow: this.headRow,
      headCol: this.headCol,
      direction: this.direction,
      hits: Array.from(this.hits),
      isDestroyed: this.isDestroyed
    };
  }

  /**
   * Create airplane from serialized state
   * @param {Object} data - Serialized airplane data
   * @returns {Airplane}
   */
  static fromJSON(data) {
    const airplane = new Airplane(
      data.headRow,
      data.headCol,
      data.direction,
      data.id
    );
    airplane.hits = new Set(data.hits || []);
    airplane.isDestroyed = data.isDestroyed || false;
    return airplane;
  }

  /**
   * Create a random airplane placement
   * @param {number} boardSize - Board size
   * @param {Array<Airplane>} existingAirplanes - Existing airplanes to avoid
   * @param {number} id - Airplane ID
   * @param {number} maxAttempts - Maximum placement attempts
   * @returns {Airplane|null} - New airplane or null if placement failed
   */
  static createRandom(boardSize, existingAirplanes, id, maxAttempts = 100) {
    const directions = Object.values(GameConstants.DIRECTIONS);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const headRow = Math.floor(Math.random() * boardSize);
      const headCol = Math.floor(Math.random() * boardSize);
      const direction = directions[Math.floor(Math.random() * directions.length)];

      const airplane = new Airplane(headRow, headCol, direction, id);
      const validation = airplane.isValidPlacement(boardSize, existingAirplanes);

      if (validation.valid) {
        return airplane;
      }
    }

    return null; // Failed to place after max attempts
  }
}

export default Airplane;
