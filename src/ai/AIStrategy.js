/**
 * AI Strategy
 * Implements different AI difficulty levels for the game
 */

import GameConstants from '../config/GameConstants.js';
import CoordinateSystem from '../core/CoordinateSystem.js';
import BoardManager from '../core/BoardManager.js';

class AIStrategy {
  /**
   * Create a new AI strategy
   * @param {string} difficulty - 'easy', 'medium', or 'hard'
   * @param {number} boardSize - Size of the game board
   */
  constructor(difficulty, boardSize) {
    this.difficulty = difficulty;
    this.boardSize = boardSize;
    this.targetQueue = []; // Queue of cells to investigate after a hit
    this.lastHit = null; // Last successful hit
    this.hitSequence = []; // Sequence of hits on current airplane
  }

  /**
   * Get next attack position based on AI difficulty
   * @param {BoardManager} opponentBoard - Opponent's board (for checking attacked cells)
   * @returns {{row: number, col: number}|null} - Next attack position or null
   */
  getNextAttack(opponentBoard) {
    switch (this.difficulty) {
      case 'easy':
        return this.getRandomAttack(opponentBoard);
      case 'medium':
        return this.getMediumAttack(opponentBoard);
      case 'hard':
        return this.getHardAttack(opponentBoard);
      default:
        return this.getRandomAttack(opponentBoard);
    }
  }

  /**
   * Easy AI: Random attacks
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number}|null}
   */
  getRandomAttack(opponentBoard) {
    const availableCells = [];

    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (!opponentBoard.isCellAttacked(row, col)) {
          availableCells.push({ row, col });
        }
      }
    }

    if (availableCells.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }

  /**
   * Medium AI: Random attacks + follow-up on hits (attacks surrounding 4 cells when hit)
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number}|null}
   */
  getMediumAttack(opponentBoard) {
    // If we have targets in queue (from previous hits), attack those first
    while (this.targetQueue.length > 0) {
      const target = this.targetQueue.shift();
      if (!opponentBoard.isCellAttacked(target.row, target.col)) {
        return target;
      }
    }

    // Otherwise, use random attack (same as easy mode)
    return this.getRandomAttack(opponentBoard);
  }

  /**
   * Hard AI: Ultra-intelligent targeting with perfect strategy
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number}|null}
   */
  getHardAttack(opponentBoard) {
    const history = opponentBoard.getAttackHistory();

    // STRATEGY 0: Perfect Opening - First few moves use statistically optimal positions
    if (history.length < 3) {
      const openingMove = this.getPerfectOpeningMove(opponentBoard);
      if (openingMove) {
        console.log('[Hard AI] Using perfect opening strategy at', openingMove);
        return openingMove;
      }
    }

    // STRATEGY 1: Aggressive Kill Shot - Even with 1 hit, try to locate and kill
    const killShotTarget = this.findKillShotCandidates(opponentBoard);
    if (killShotTarget) {
      console.log('[Hard AI] Using aggressive kill shot at', killShotTarget);
      return killShotTarget;
    }

    // STRATEGY 2: Hit Cluster Analysis - Detect patterns in existing hits
    const clusterTarget = this.findClusterBasedTarget(opponentBoard);
    if (clusterTarget) {
      console.log('[Hard AI] Using cluster analysis at', clusterTarget);
      return clusterTarget;
    }

    // STRATEGY 3: Information Value Maximization - Attack cells that give most information
    const infoValueTarget = this.findMaxInformationValueTarget(opponentBoard);
    if (infoValueTarget && infoValueTarget.value > 50) {
      console.log('[Hard AI] Using information value strategy at', infoValueTarget, 'value:', infoValueTarget.value);
      return infoValueTarget;
    }

    // STRATEGY 4: Enhanced Probability-based head targeting with heat map
    const headProbabilityMap = this.calculateHeadProbabilityMap(opponentBoard);
    const heatMap = this.calculateAreaHeatMap(opponentBoard);

    // Combine probability and heat map
    let maxScore = 0;
    let bestTargets = [];

    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (!opponentBoard.isCellAttacked(row, col)) {
          const probability = headProbabilityMap[row][col];
          const heat = heatMap[row][col];

          // Combined score: probability is primary, heat is secondary
          const score = probability * 10 + heat;

          if (score > maxScore) {
            maxScore = score;
            bestTargets = [{ row, col }];
          } else if (score === maxScore && score > 0) {
            bestTargets.push({ row, col });
          }
        }
      }
    }

    // Return best target
    if (bestTargets.length > 0) {
      const randomIndex = Math.floor(Math.random() * bestTargets.length);
      console.log('[Hard AI] Using combined probability+heat map, max score:', maxScore);
      return bestTargets[randomIndex];
    }

    // Fallback to random attack (should rarely happen)
    console.log('[Hard AI] Fallback to random attack');
    return this.getRandomAttack(opponentBoard);
  }

  /**
   * Calculate head probability map for hard AI with enhanced weighting
   * Analyzes entire board to find most likely head positions
   * @param {BoardManager} opponentBoard
   * @returns {number[][]} - 2D array of head probabilities
   */
  calculateHeadProbabilityMap(opponentBoard) {
    // Initialize probability map with zeros
    const map = Array(this.boardSize).fill(null).map(() =>
      Array(this.boardSize).fill(0)
    );

    // Get attack history for analysis
    const history = opponentBoard.getAttackHistory();
    const hitCells = new Set();
    const missCells = new Set();

    history.forEach(attack => {
      const key = `${attack.row},${attack.col}`;
      if (attack.result === GameConstants.ATTACK_RESULTS.HIT ||
          attack.result === GameConstants.ATTACK_RESULTS.KILL) {
        hitCells.add(key);
      } else if (attack.result === GameConstants.ATTACK_RESULTS.MISS) {
        missCells.add(key);
      }
    });

    // For each possible head position and direction, check if airplane placement is valid
    const directions = ['up', 'down', 'left', 'right'];

    for (let headRow = 0; headRow < this.boardSize; headRow++) {
      for (let headCol = 0; headCol < this.boardSize; headCol++) {
        // Skip if this position is already attacked
        if (opponentBoard.isCellAttacked(headRow, headCol)) {
          continue;
        }

        // Edge/corner bonus: positions near edges have fewer valid orientations
        let edgeBonus = 0;
        const isEdge = headRow === 0 || headRow === this.boardSize - 1 ||
                       headCol === 0 || headCol === this.boardSize - 1;
        const isCorner = (headRow === 0 || headRow === this.boardSize - 1) &&
                        (headCol === 0 || headCol === this.boardSize - 1);
        if (isCorner) edgeBonus = 3; // Corners are highly constrained
        else if (isEdge) edgeBonus = 2; // Edges are somewhat constrained

        // Try each direction for airplane placement
        for (const direction of directions) {
          const airplaneCells = this.getAirplaneCells(headRow, headCol, direction);

          // Check if this airplane placement is valid
          if (this.isValidAirplanePlacement(airplaneCells, hitCells, missCells, opponentBoard)) {
            // Base probability for valid placement
            let baseWeight = 1;

            // Count how many hits this placement explains
            let explainsHits = 0;
            airplaneCells.forEach(cell => {
              const key = `${cell.row},${cell.col}`;
              if (hitCells.has(key)) {
                explainsHits++;
              }
            });

            // ULTRA-ENHANCED WEIGHT SYSTEM (极致权重)
            let weight = baseWeight;

            if (explainsHits === 0) {
              // No hits explained - minimal weight
              weight = baseWeight + edgeBonus;
            } else if (explainsHits === 1) {
              // Explains 1 hit - strong bonus (be aggressive)
              weight = baseWeight + 100 + edgeBonus * 5;
            } else if (explainsHits === 2) {
              // Explains 2 hits - very strong bonus (very likely the airplane)
              weight = baseWeight + 500 + edgeBonus * 20;
            } else if (explainsHits === 3) {
              // Explains 3 hits - extremely strong (almost certain)
              weight = baseWeight + 2000 + edgeBonus * 50;
            } else if (explainsHits >= 4) {
              // Explains 4+ hits - MUST be the airplane!
              weight = baseWeight + 5000 + explainsHits * 500 + edgeBonus * 100;
            }

            // Head position gets massive bonus (killing the head wins the airplane)
            weight *= 3;

            // Additional bonus for positions that would be head in constrained areas
            if (isCorner) weight *= 1.5;
            else if (isEdge) weight *= 1.2;

            map[headRow][headCol] += weight;
          }
        }
      }
    }

    return map;
  }

  /**
   * Get all cells occupied by an airplane given head position and direction
   * @param {number} headRow - Head row
   * @param {number} headCol - Head column
   * @param {string} direction - Direction ('up', 'down', 'left', 'right')
   * @returns {Array<{row: number, col: number}>} - Array of cell positions
   */
  getAirplaneCells(headRow, headCol, direction) {
    const cells = [];
    const structure = GameConstants.AIRPLANE.STRUCTURE;
    const rotation = GameConstants.ROTATION_MATRICES[direction];

    // Helper to transform coordinates based on direction
    const transform = (relRow, relCol) => {
      let r, c;
      if (rotation.swap) {
        r = headRow + relCol * rotation.rowMult;
        c = headCol + relRow * rotation.colMult;
      } else {
        r = headRow + relRow * rotation.rowMult;
        c = headCol + relCol * rotation.colMult;
      }
      return { row: r, col: c };
    };

    // Add head
    cells.push({ row: headRow, col: headCol });

    // Add body cells
    structure.BODY.forEach(pos => {
      cells.push(transform(pos.row, pos.col));
    });

    // Add wing cells
    structure.WINGS.forEach(pos => {
      cells.push(transform(pos.row, pos.col));
    });

    // Add tail cells
    structure.TAIL.forEach(pos => {
      cells.push(transform(pos.row, pos.col));
    });

    // Remove duplicates
    const uniqueCells = [];
    const seen = new Set();
    cells.forEach(cell => {
      const key = `${cell.row},${cell.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCells.push(cell);
      }
    });

    return uniqueCells;
  }

  /**
   * Check if airplane placement is valid given current board state
   * @param {Array<{row: number, col: number}>} airplaneCells - Airplane cell positions
   * @param {Set<string>} hitCells - Set of hit cell keys
   * @param {Set<string>} missCells - Set of miss cell keys
   * @param {BoardManager} opponentBoard - Opponent board
   * @returns {boolean} - True if placement is valid
   */
  isValidAirplanePlacement(airplaneCells, hitCells, missCells, opponentBoard) {
    for (const cell of airplaneCells) {
      // Check if cell is out of bounds
      if (cell.row < 0 || cell.row >= this.boardSize ||
          cell.col < 0 || cell.col >= this.boardSize) {
        return false;
      }

      const key = `${cell.row},${cell.col}`;

      // If this cell was attacked and resulted in miss, this placement is invalid
      // (because the airplane should be there but it's not)
      if (missCells.has(key)) {
        return false;
      }
    }

    // All checks passed - this is a valid placement
    return true;
  }

  /**
   * Get perfect opening move - statistically optimal first moves
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number}|null}
   */
  getPerfectOpeningMove(opponentBoard) {
    const history = opponentBoard.getAttackHistory();
    const center = Math.floor(this.boardSize / 2);

    // Opening move priorities based on statistical analysis
    const openingSequence = [
      // First move: Center position (maximum coverage)
      { row: center, col: center },
      // Second move: Offset from center
      { row: center - 2, col: center },
      // Third move: Another strategic offset
      { row: center, col: center + 2 }
    ];

    // Get the appropriate opening move
    if (history.length < openingSequence.length) {
      const move = openingSequence[history.length];
      if (move.row >= 0 && move.row < this.boardSize &&
          move.col >= 0 && move.col < this.boardSize &&
          !opponentBoard.isCellAttacked(move.row, move.col)) {
        return move;
      }
    }

    return null;
  }

  /**
   * Find target with maximum information value
   * Each cell is scored by how much information attacking it would provide
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number, value: number}|null}
   */
  findMaxInformationValueTarget(opponentBoard) {
    const history = opponentBoard.getAttackHistory();
    const hitCells = new Set();
    const missCells = new Set();

    history.forEach(attack => {
      const key = `${attack.row},${attack.col}`;
      if (attack.result === GameConstants.ATTACK_RESULTS.HIT) {
        hitCells.add(key);
      } else if (attack.result === GameConstants.ATTACK_RESULTS.MISS) {
        missCells.add(key);
      }
    });

    let maxValue = 0;
    let bestTarget = null;
    const directions = ['up', 'down', 'left', 'right'];

    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (opponentBoard.isCellAttacked(row, col)) continue;

        let infoValue = 0;

        // Count how many possible airplane placements this cell could confirm/deny
        for (const direction of directions) {
          const airplaneCells = this.getAirplaneCells(row, col, direction);

          if (this.isValidAirplanePlacement(airplaneCells, hitCells, missCells, opponentBoard)) {
            // This cell is part of a potentially valid airplane
            infoValue += 5;

            // Bonus if attacking this cell as head would confirm an airplane
            let touchesHit = false;
            airplaneCells.forEach(cell => {
              const key = `${cell.row},${cell.col}`;
              if (hitCells.has(key)) {
                touchesHit = true;
              }
            });

            if (touchesHit) {
              infoValue += 20; // High value - could confirm a hit airplane
            }
          }
        }

        // Also check if this cell is part of other airplane placements (not as head)
        for (let headRow = 0; headRow < this.boardSize; headRow++) {
          for (let headCol = 0; headCol < this.boardSize; headCol++) {
            if (opponentBoard.isCellAttacked(headRow, headCol)) continue;

            for (const direction of directions) {
              const airplaneCells = this.getAirplaneCells(headRow, headCol, direction);

              if (this.isValidAirplanePlacement(airplaneCells, hitCells, missCells, opponentBoard)) {
                const containsThisCell = airplaneCells.some(c => c.row === row && c.col === col);
                if (containsThisCell) {
                  infoValue += 1; // Small bonus for each airplane this cell could belong to
                }
              }
            }
          }
        }

        if (infoValue > maxValue) {
          maxValue = infoValue;
          bestTarget = { row, col, value: infoValue };
        }
      }
    }

    return bestTarget;
  }

  /**
   * Calculate area heat map - which areas are most likely to have undiscovered airplanes
   * @param {BoardManager} opponentBoard
   * @returns {number[][]} - 2D array of heat values
   */
  calculateAreaHeatMap(opponentBoard) {
    const heatMap = Array(this.boardSize).fill(null).map(() =>
      Array(this.boardSize).fill(0)
    );

    const history = opponentBoard.getAttackHistory();
    const hitCells = new Set();
    const missCells = new Set();

    history.forEach(attack => {
      const key = `${attack.row},${attack.col}`;
      if (attack.result === GameConstants.ATTACK_RESULTS.HIT) {
        hitCells.add(key);
      } else if (attack.result === GameConstants.ATTACK_RESULTS.MISS) {
        missCells.add(key);
      }
    });

    const directions = ['up', 'down', 'left', 'right'];

    // For each unattacked cell, count how many valid airplane placements include it
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (opponentBoard.isCellAttacked(row, col)) continue;

        let placementCount = 0;

        // Check all possible airplane placements that include this cell
        for (let headRow = 0; headRow < this.boardSize; headRow++) {
          for (let headCol = 0; headCol < this.boardSize; headCol++) {
            for (const direction of directions) {
              const airplaneCells = this.getAirplaneCells(headRow, headCol, direction);

              // Check if this placement includes our target cell
              const includesCell = airplaneCells.some(c => c.row === row && c.col === col);
              if (!includesCell) continue;

              // Check if this placement is valid
              if (this.isValidAirplanePlacement(airplaneCells, hitCells, missCells, opponentBoard)) {
                placementCount++;
              }
            }
          }
        }

        heatMap[row][col] = placementCount;
      }
    }

    return heatMap;
  }

  /**
   * Find kill shot candidates - AGGRESSIVE version (works with just 1 hit)
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number}|null}
   */
  findKillShotCandidates(opponentBoard) {
    const history = opponentBoard.getAttackHistory();
    const hitCells = new Set();
    const hitPositions = [];

    history.forEach(attack => {
      if (attack.result === GameConstants.ATTACK_RESULTS.HIT) {
        const key = `${attack.row},${attack.col}`;
        hitCells.add(key);
        hitPositions.push({ row: attack.row, col: attack.col });
      }
    });

    // LOWERED THRESHOLD: Even with 1 hit, try to find the airplane
    if (hitPositions.length < 1) {
      return null;
    }

    // Group hits by potential airplane clusters
    const clusters = this.findHitClusters(hitPositions, opponentBoard);

    // For each cluster, try to find the head (even single hits)
    for (const cluster of clusters) {
      // Try to determine airplane orientation from hit pattern
      const headCandidates = this.findHeadCandidatesFromCluster(cluster, opponentBoard);

      if (headCandidates.length > 0) {
        // Return the best head candidate
        return headCandidates[0];
      }
    }

    return null;
  }

  /**
   * Find clusters of hit cells (hits that are likely from the same airplane)
   * @param {Array<{row: number, col: number}>} hitPositions
   * @param {BoardManager} opponentBoard
   * @returns {Array<Array<{row: number, col: number}>>}
   */
  findHitClusters(hitPositions, opponentBoard) {
    if (hitPositions.length === 0) return [];

    const clusters = [];
    const visited = new Set();

    for (const hit of hitPositions) {
      const key = `${hit.row},${hit.col}`;
      if (visited.has(key)) continue;

      // Start a new cluster
      const cluster = [hit];
      visited.add(key);

      // BFS to find connected hits
      const queue = [hit];
      while (queue.length > 0) {
        const current = queue.shift();

        // Check all adjacent cells (including diagonals for airplane detection)
        for (let dr = -3; dr <= 3; dr++) {
          for (let dc = -3; dc <= 3; dc++) {
            if (dr === 0 && dc === 0) continue;

            const newRow = current.row + dr;
            const newCol = current.col + dc;
            const newKey = `${newRow},${newCol}`;

            if (visited.has(newKey)) continue;

            // Check if this position is a hit
            const isHit = hitPositions.some(h => h.row === newRow && h.col === newCol);
            if (isHit) {
              visited.add(newKey);
              const newHit = { row: newRow, col: newCol };
              cluster.push(newHit);
              queue.push(newHit);
            }
          }
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Find head candidates from a cluster of hits
   * @param {Array<{row: number, col: number}>} cluster
   * @param {BoardManager} opponentBoard
   * @returns {Array<{row: number, col: number}>}
   */
  findHeadCandidatesFromCluster(cluster, opponentBoard) {
    const candidates = [];
    const directions = ['up', 'down', 'left', 'right'];

    // Get all miss cells for validation
    const history = opponentBoard.getAttackHistory();
    const missCells = new Set();
    const hitCells = new Set();

    history.forEach(attack => {
      const key = `${attack.row},${attack.col}`;
      if (attack.result === GameConstants.ATTACK_RESULTS.MISS) {
        missCells.add(key);
      } else if (attack.result === GameConstants.ATTACK_RESULTS.HIT) {
        hitCells.add(key);
      }
    });

    // For each possible head position around the cluster
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (opponentBoard.isCellAttacked(row, col)) continue;

        // Try each direction
        for (const direction of directions) {
          const airplaneCells = this.getAirplaneCells(row, col, direction);

          // Check if this placement is valid and explains the cluster hits
          if (this.isValidAirplanePlacement(airplaneCells, hitCells, missCells, opponentBoard)) {
            let explainsCount = 0;
            cluster.forEach(hit => {
              const matches = airplaneCells.some(cell => cell.row === hit.row && cell.col === hit.col);
              if (matches) explainsCount++;
            });

            // LOWERED THRESHOLD: Accept if explains at least 1 hit
            if (explainsCount >= 1) {
              // Score based on how many hits explained, with exponential scaling
              let score = Math.pow(explainsCount, 3) * 100 + cluster.length * 20;

              // Massive bonus if explains ALL hits in cluster
              if (explainsCount === cluster.length && cluster.length >= 2) {
                score += 5000;
              }

              candidates.push({
                row,
                col,
                score: score
              });
            }
          }
        }
      }
    }

    // Sort by score and return
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * Find target based on cluster analysis of existing hits - ENHANCED
   * @param {BoardManager} opponentBoard
   * @returns {{row: number, col: number}|null}
   */
  findClusterBasedTarget(opponentBoard) {
    const history = opponentBoard.getAttackHistory();
    const hitPositions = [];

    history.forEach(attack => {
      if (attack.result === GameConstants.ATTACK_RESULTS.HIT) {
        hitPositions.push({ row: attack.row, col: attack.col });
      }
    });

    if (hitPositions.length === 0) return null;

    // PRIORITY 1: Check for linear patterns (consecutive hits in a line)
    for (let i = 0; i < hitPositions.length; i++) {
      for (let j = i + 1; j < hitPositions.length; j++) {
        const hit1 = hitPositions[i];
        const hit2 = hitPositions[j];

        // Check if hits are in a line (horizontal or vertical)
        if (hit1.row === hit2.row) {
          // Horizontal line - check cells in the same row
          const minCol = Math.min(hit1.col, hit2.col);
          const maxCol = Math.max(hit1.col, hit2.col);

          // AGGRESSIVE: Try extending the line in both directions
          const targets = [
            { row: hit1.row, col: minCol - 1, priority: 1 },
            { row: hit1.row, col: maxCol + 1, priority: 1 },
            // Also check gaps in the line
            { row: hit1.row, col: minCol + 1, priority: 2 },
            { row: hit1.row, col: maxCol - 1, priority: 2 }
          ];

          // Sort by priority and return first valid
          targets.sort((a, b) => a.priority - b.priority);
          for (const target of targets) {
            if (target.row >= 0 && target.row < this.boardSize &&
                target.col >= 0 && target.col < this.boardSize &&
                !opponentBoard.isCellAttacked(target.row, target.col)) {
              return { row: target.row, col: target.col };
            }
          }
        } else if (hit1.col === hit2.col) {
          // Vertical line - check cells in the same column
          const minRow = Math.min(hit1.row, hit2.row);
          const maxRow = Math.max(hit1.row, hit2.row);

          // AGGRESSIVE: Try extending the line in both directions
          const targets = [
            { row: minRow - 1, col: hit1.col, priority: 1 },
            { row: maxRow + 1, col: hit1.col, priority: 1 },
            // Also check gaps in the line
            { row: minRow + 1, col: hit1.col, priority: 2 },
            { row: maxRow - 1, col: hit1.col, priority: 2 }
          ];

          // Sort by priority and return first valid
          targets.sort((a, b) => a.priority - b.priority);
          for (const target of targets) {
            if (target.row >= 0 && target.row < this.boardSize &&
                target.col >= 0 && target.col < this.boardSize &&
                !opponentBoard.isCellAttacked(target.row, target.col)) {
              return { row: target.row, col: target.col };
            }
          }
        }
      }
    }

    // PRIORITY 2: For single hits, attack all adjacent cells aggressively
    if (hitPositions.length === 1) {
      const hit = hitPositions[0];
      const adjacentTargets = [
        { row: hit.row - 1, col: hit.col },
        { row: hit.row + 1, col: hit.col },
        { row: hit.row, col: hit.col - 1 },
        { row: hit.row, col: hit.col + 1 }
      ];

      for (const target of adjacentTargets) {
        if (target.row >= 0 && target.row < this.boardSize &&
            target.col >= 0 && target.col < this.boardSize &&
            !opponentBoard.isCellAttacked(target.row, target.col)) {
          return target;
        }
      }
    }

    return null;
  }

  /**
   * Get attack result for a specific cell
   * @param {BoardManager} opponentBoard
   * @param {number} row
   * @param {number} col
   * @returns {string|null} - 'hit', 'miss', or null if not attacked
   */
  getCellAttackResult(opponentBoard, row, col) {
    if (!opponentBoard.isCellAttacked(row, col)) return null;

    const history = opponentBoard.getAttackHistory();
    const attack = history.find(a => a.row === row && a.col === col);

    if (!attack) return null;

    if (attack.result === GameConstants.ATTACK_RESULTS.HIT ||
        attack.result === GameConstants.ATTACK_RESULTS.KILL) {
      return 'hit';
    }

    return 'miss';
  }

  /**
   * Process attack result and update AI state
   * @param {{row: number, col: number}} attackPos - Attack position
   * @param {Object} result - Attack result from board manager
   */
  processAttackResult(attackPos, result) {
    console.log(`AI attack result at (${attackPos.row}, ${attackPos.col}): ${result.result}`);

    if (result.result === GameConstants.ATTACK_RESULTS.HIT) {
      // Hit but not kill - add adjacent cells to target queue
      this.lastHit = attackPos;
      this.hitSequence.push(attackPos);

      // Add adjacent cells to investigate
      const adjacentCells = CoordinateSystem.getAdjacentPositions(
        attackPos.row,
        attackPos.col,
        this.boardSize
      );

      // Prioritize cells in line with previous hits
      if (this.hitSequence.length > 1) {
        // Determine direction of hits
        const prevHit = this.hitSequence[this.hitSequence.length - 2];
        const isHorizontal = attackPos.row === prevHit.row;
        const isVertical = attackPos.col === prevHit.col;

        // Prioritize cells in the same line
        adjacentCells.forEach(cell => {
          if ((isHorizontal && cell.row === attackPos.row) ||
              (isVertical && cell.col === attackPos.col)) {
            this.targetQueue.unshift(cell); // Add to front
          } else {
            this.targetQueue.push(cell); // Add to back
          }
        });
      } else {
        // First hit - add all adjacent cells
        adjacentCells.forEach(cell => {
          this.targetQueue.push(cell);
        });
      }

      console.log(`AI added ${adjacentCells.length} cells to target queue`);
    } else if (result.result === GameConstants.ATTACK_RESULTS.KILL) {
      // Airplane destroyed - clear target queue for this airplane
      console.log('AI destroyed an airplane - clearing target queue');
      this.targetQueue = [];
      this.lastHit = null;
      this.hitSequence = [];
    }
  }

  /**
   * Reset AI state (for new game)
   */
  reset() {
    this.targetQueue = [];
    this.lastHit = null;
    this.hitSequence = [];
  }

  /**
   * Set difficulty level
   * @param {string} difficulty - 'easy', 'medium', or 'hard'
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.reset();
  }
}

export default AIStrategy;
