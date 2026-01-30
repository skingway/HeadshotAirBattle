/**
 * Game Constants
 * Centralized configuration for game modes, rules, and settings
 */

const GameConstants = {
  // Game Modes
  MODES: {
    STANDARD: {
      id: 'standard',
      name: 'Standard Mode',
      boardSize: 10,
      minAirplanes: 3,
      maxAirplanes: 3,
      defaultAirplanes: 3
    },
    EXTENDED: {
      id: 'extended',
      name: 'Extended Mode',
      boardSize: 15,
      minAirplanes: 6,
      maxAirplanes: 6,
      defaultAirplanes: 6
    },
    CUSTOM: {
      id: 'custom',
      name: 'Custom Mode',
      minBoardSize: 10,
      maxBoardSize: 20,
      defaultBoardSize: 15,
      minAirplanes: 1,
      maxAirplanes: 10,
      defaultAirplanes: 3
    },
    ONLINE: {
      id: 'online',
      name: 'Online PvP',
      boardSize: 10,
      minAirplanes: 3,
      maxAirplanes: 3,
      defaultAirplanes: 3,
      isOnline: true
    }
  },

  // Airplane Structure
  AIRPLANE: {
    TOTAL_CELLS: 10,
    // Relative positions from head (row, col)
    STRUCTURE: {
      HEAD: { row: 0, col: 0 },
      // Body positions (3 cells vertical from head, connecting to wings and tail)
      BODY: [
        { row: 1, col: 0 },  // Connects to wings center
        { row: 2, col: 0 },  // Middle body
        { row: 3, col: 0 }   // Connects to tail center
      ],
      // Wings positions (5 cells horizontal at row 1, right below head)
      WINGS: [
        { row: 1, col: -2 },
        { row: 1, col: -1 },
        { row: 1, col: 0 },  // Center (overlaps with body)
        { row: 1, col: 1 },
        { row: 1, col: 2 }
      ],
      // Tail positions (3 cells horizontal at row 3)
      TAIL: [
        { row: 3, col: -1 },
        { row: 3, col: 0 },  // Center (overlaps with body)
        { row: 3, col: 1 }
      ]
    }
  },

  // Directions
  DIRECTIONS: {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
  },

  // Direction rotation matrices
  ROTATION_MATRICES: {
    up: { rowMult: 1, colMult: 1, swap: false },      // Original orientation
    down: { rowMult: -1, colMult: -1, swap: false },  // 180° rotation
    left: { rowMult: -1, colMult: 1, swap: true },    // 90° clockwise (head points left, body extends right)
    right: { rowMult: 1, colMult: -1, swap: true }    // 90° counterclockwise (head points right, body extends left)
  },

  // Turn Timer
  TURN_TIMER: {
    DURATION: 5000,           // 5 seconds in milliseconds
    WARNING_THRESHOLD: 2000,  // Show warning at 2 seconds remaining
    TICK_INTERVAL: 100        // Update display every 100ms
  },

  // AI Difficulty Levels
  AI_DIFFICULTY: {
    EASY: {
      id: 'easy',
      name: 'Easy',
      description: 'Random attacks',
      strategy: 'random'
    },
    MEDIUM: {
      id: 'medium',
      name: 'Medium',
      description: 'Random + smart follow-up',
      strategy: 'smart_random'
    },
    HARD: {
      id: 'hard',
      name: 'Hard',
      description: 'Intelligent head targeting',
      strategy: 'probability'
    }
  },

  // Game Phases
  PHASES: {
    MENU: 'menu',
    MODE_SELECT: 'mode_select',
    DIFFICULTY_SELECT: 'difficulty_select',
    DEPLOYMENT: 'deployment',
    BATTLE: 'battle',
    GAME_OVER: 'game_over',
    MATCHMAKING: 'matchmaking',
    WAITING: 'waiting'
  },

  // Cell States
  CELL_STATES: {
    EMPTY: 'empty',
    AIRPLANE: 'airplane',
    HIT: 'hit',
    MISS: 'miss',
    KILLED: 'killed'
  },

  // Attack Results
  ATTACK_RESULTS: {
    MISS: 'miss',
    HIT: 'hit',
    KILL: 'kill',
    ALREADY_ATTACKED: 'already_attacked',
    INVALID: 'invalid'
  },

  // Player Types
  PLAYER_TYPES: {
    HUMAN: 'human',
    AI: 'ai',
    ONLINE: 'online'
  },

  // Game Types
  GAME_TYPES: {
    AI: 'ai',
    ONLINE: 'online'
  },

  // Audio Settings
  AUDIO: {
    BGM_VOLUME: 0.3,
    SFX_VOLUME: 0.5,
    ENABLED_BY_DEFAULT: true
  },

  // Network Settings
  NETWORK: {
    DISCONNECT_GRACE_PERIOD: 30000,  // 30 seconds
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000,           // 2 seconds
    MATCHMAKING_TIMEOUT: 60000       // 60 seconds
  },

  // Validation Rules
  VALIDATION: {
    MIN_NICKNAME_LENGTH: 1,
    MAX_NICKNAME_LENGTH: 20,
    NICKNAME_CHANGE_COOLDOWN: 30 * 24 * 60 * 60 * 1000,  // 30 days in milliseconds
    NICKNAME_PATTERN: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/  // Alphanumeric, underscore, Chinese characters
  },

  // Storage Keys
  STORAGE_KEYS: {
    CURRENT_USER: 'airplanebattle_current_user',
    AUDIO_ENABLED: 'airplanebattle_audio_enabled',
    BGM_VOLUME: 'airplanebattle_bgm_volume',
    SFX_VOLUME: 'airplanebattle_sfx_volume',
    SAVED_GAME: 'airplanebattle_saved_game'
  },

  // Animation Durations (milliseconds)
  ANIMATIONS: {
    FADE_DURATION: 300,
    SLIDE_DURATION: 400,
    ATTACK_DURATION: 500,
    EXPLOSION_DURATION: 800
  },

  // Grid Display Settings
  GRID_DISPLAY: {
    MIN_CELL_SIZE: 20,          // Minimum cell size in pixels
    MAX_CELL_SIZE: 50,          // Maximum cell size in pixels
    CELL_GAP: 2,                // Gap between cells in pixels
    LABEL_SIZE: 30,             // Size of row/column labels in pixels
    MOBILE_BREAKPOINT: 768      // Screen width for mobile layout
  }
};

// Utility function to get mode configuration
GameConstants.getModeConfig = function(modeId) {
  const modes = Object.values(this.MODES);
  return modes.find(mode => mode.id === modeId) || this.MODES.STANDARD;
};

// Utility function to validate board size for custom mode
GameConstants.isValidCustomBoardSize = function(size) {
  const custom = this.MODES.CUSTOM;
  return size >= custom.minBoardSize && size <= custom.maxBoardSize;
};

// Utility function to validate airplane count for a mode
GameConstants.isValidAirplaneCount = function(count, modeId) {
  const mode = this.getModeConfig(modeId);

  if (modeId === 'custom') {
    return count >= mode.minAirplanes && count <= mode.maxAirplanes;
  }

  return count >= mode.minAirplanes && count <= mode.maxAirplanes;
};

// Utility function to validate airplane count relative to board size
// Returns { valid: boolean, reason: string, recommendation: string }
GameConstants.validateAirplaneCountForBoardSize = function(airplaneCount, boardSize) {
  const totalCells = boardSize * boardSize;
  const airplaneCells = airplaneCount * this.AIRPLANE.TOTAL_CELLS;
  const occupancyRate = airplaneCells / totalCells;

  // Recommended maximum: airplanes occupy at most 40% of the board
  // This leaves enough space for random placement to succeed
  const MAX_RECOMMENDED_OCCUPANCY = 0.40;

  if (occupancyRate > MAX_RECOMMENDED_OCCUPANCY) {
    const recommendedMaxAirplanes = Math.floor(totalCells * MAX_RECOMMENDED_OCCUPANCY / this.AIRPLANE.TOTAL_CELLS);
    return {
      valid: false,
      reason: `${airplaneCount} airplanes would occupy ${(occupancyRate * 100).toFixed(1)}% of the ${boardSize}×${boardSize} board, which is too crowded for reliable random placement.`,
      recommendation: `For a ${boardSize}×${boardSize} board, we recommend at most ${recommendedMaxAirplanes} airplanes (${(MAX_RECOMMENDED_OCCUPANCY * 100).toFixed(0)}% occupancy).`
    };
  }

  return {
    valid: true,
    reason: `${airplaneCount} airplanes on ${boardSize}×${boardSize} board (${(occupancyRate * 100).toFixed(1)}% occupancy) is acceptable.`,
    recommendation: ''
  };
};

// Export for React Native
export default GameConstants;
