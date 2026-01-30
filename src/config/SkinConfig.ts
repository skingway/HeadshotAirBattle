/**
 * Skin and Theme Configuration
 * Defines airplane colors and board themes
 */

export interface AirplaneSkin {
  id: string;
  name: string;
  description: string;
  unlockRequirement: number;
  unlockText: string;
  color: string; // Main airplane color
}

export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockRequirement: number;
  unlockText: string;
  colors: {
    cellEmpty: string;
    cellAirplane: string;
    cellHit: string;
    cellMiss: string;
    cellKilled: string;
    gridLine: string;
    background: string;
  };
}

// Airplane Skins - 12 colors
export const AIRPLANE_SKINS: AirplaneSkin[] = [
  {
    id: 'blue',
    name: 'Classic Blue',
    description: 'The original blue fighter',
    unlockRequirement: 0,
    unlockText: 'Default',
    color: '#3498db',
  },
  {
    id: 'red',
    name: 'Crimson Red',
    description: 'Fierce red warrior',
    unlockRequirement: 5,
    unlockText: 'Play 5 games',
    color: '#e74c3c',
  },
  {
    id: 'green',
    name: 'Forest Green',
    description: 'Stealth green ops',
    unlockRequirement: 10,
    unlockText: 'Play 10 games',
    color: '#2ecc71',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Majestic purple jet',
    unlockRequirement: 15,
    unlockText: 'Play 15 games',
    color: '#9b59b6',
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    description: 'Blazing orange flame',
    unlockRequirement: 20,
    unlockText: 'Play 20 games',
    color: '#f39c12',
  },
  {
    id: 'pink',
    name: 'Hot Pink',
    description: 'Vibrant pink power',
    unlockRequirement: 25,
    unlockText: 'Play 25 games',
    color: '#ec4899',
  },
  {
    id: 'cyan',
    name: 'Aqua Cyan',
    description: 'Cool cyan skies',
    unlockRequirement: 30,
    unlockText: 'Play 30 games',
    color: '#00bcd4',
  },
  {
    id: 'yellow',
    name: 'Golden Yellow',
    description: 'Brilliant gold shine',
    unlockRequirement: 40,
    unlockText: 'Play 40 games',
    color: '#f1c40f',
  },
  {
    id: 'teal',
    name: 'Teal Wave',
    description: 'Ocean teal fighter',
    unlockRequirement: 50,
    unlockText: 'Win 10 games',
    color: '#1abc9c',
  },
  {
    id: 'indigo',
    name: 'Deep Indigo',
    description: 'Midnight indigo sky',
    unlockRequirement: 60,
    unlockText: 'Win 20 games',
    color: '#3f51b5',
  },
  {
    id: 'lime',
    name: 'Neon Lime',
    description: 'Electric lime green',
    unlockRequirement: 70,
    unlockText: 'Win 30 games',
    color: '#8bc34a',
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Elegant rose gold',
    unlockRequirement: 100,
    unlockText: 'Win 50 games',
    color: '#ff6b9d',
  },
];

// Board Themes - 6 themes
export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'default',
    name: 'Ocean Blue',
    description: 'Classic ocean theme',
    icon: '🌊',
    unlockRequirement: 0,
    unlockText: 'Default',
    colors: {
      cellEmpty: '#1e293b',
      cellAirplane: '#3498db',
      cellHit: '#e74c3c',
      cellMiss: '#64748b',
      cellKilled: '#c0392b',
      gridLine: '#334155',
      background: '#0f172a',
    },
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Sleek dark theme',
    icon: '🌑',
    unlockRequirement: 10,
    unlockText: 'Win 5 games',
    colors: {
      cellEmpty: '#111827',
      cellAirplane: '#6b7280',
      cellHit: '#ef4444',
      cellMiss: '#374151',
      cellKilled: '#991b1b',
      gridLine: '#1f2937',
      background: '#030712',
    },
  },
  {
    id: 'pink',
    name: 'Pink Gradient',
    description: 'Vibrant pink and purple',
    icon: '💗',
    unlockRequirement: 20,
    unlockText: 'Win 10 games',
    colors: {
      cellEmpty: '#2d1428',
      cellAirplane: '#ec4899',
      cellHit: '#f87171',
      cellMiss: '#9333ea',
      cellKilled: '#dc2626',
      gridLine: '#4a1f3d',
      background: '#1a0a1a',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Sky',
    description: 'Warm sunset colors',
    icon: '🌅',
    unlockRequirement: 30,
    unlockText: 'Win 20 games',
    colors: {
      cellEmpty: '#2d1810',
      cellAirplane: '#ff8f00',
      cellHit: '#ef5350',
      cellMiss: '#795548',
      cellKilled: '#d32f2f',
      gridLine: '#4a2c1a',
      background: '#1a0f0a',
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural forest tones',
    icon: '🌲',
    unlockRequirement: 40,
    unlockText: 'Win 30 games',
    colors: {
      cellEmpty: '#1a2e1a',
      cellAirplane: '#4caf50',
      cellHit: '#ff5722',
      cellMiss: '#558b2f',
      cellKilled: '#d84315',
      gridLine: '#2d4a2d',
      background: '#0d1a0d',
    },
  },
  {
    id: 'purple',
    name: 'Purple Dream',
    description: 'Cosmic purple night',
    icon: '🌌',
    unlockRequirement: 50,
    unlockText: 'Win 50 games',
    colors: {
      cellEmpty: '#190d33',
      cellAirplane: '#9c27b0',
      cellHit: '#e91e63',
      cellMiss: '#7e57c2',
      cellKilled: '#c2185b',
      gridLine: '#2d1b4e',
      background: '#0d0221',
    },
  },
];

// Helper functions
export const getSkinById = (id: string): AirplaneSkin | undefined => {
  return AIRPLANE_SKINS.find(skin => skin.id === id);
};

export const getThemeById = (id: string): BoardTheme | undefined => {
  return BOARD_THEMES.find(theme => theme.id === id);
};

export const getUnlockedSkins = (totalGames: number): AirplaneSkin[] => {
  return AIRPLANE_SKINS.filter(skin => totalGames >= skin.unlockRequirement);
};

export const getUnlockedThemes = (totalWins: number): BoardTheme[] => {
  return BOARD_THEMES.filter(theme => totalWins >= theme.unlockRequirement);
};

export const isSkinUnlocked = (skinId: string, totalGames: number): boolean => {
  const skin = getSkinById(skinId);
  return skin ? totalGames >= skin.unlockRequirement : false;
};

export const isThemeUnlocked = (themeId: string, totalWins: number): boolean => {
  const theme = getThemeById(themeId);
  return theme ? totalWins >= theme.unlockRequirement : false;
};
