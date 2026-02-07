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
  isPremium?: boolean;
  premiumPackId?: string;
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
  isPremium?: boolean;
  premiumPackId?: string;
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
  // Premium skins (IAP only)
  {
    id: 'diamond',
    name: 'Diamond Blue',
    description: 'Sparkling diamond gradient',
    unlockRequirement: -1,
    unlockText: 'Premium Skin Pack',
    color: '#b9f2ff',
    isPremium: true,
    premiumPackId: 'premium_skin_pack',
  },
  {
    id: 'stealth',
    name: 'Stealth Black',
    description: 'Matte black stealth',
    unlockRequirement: -1,
    unlockText: 'Premium Skin Pack',
    color: '#2c2c2c',
    isPremium: true,
    premiumPackId: 'premium_skin_pack',
  },
  {
    id: 'flame',
    name: 'Flame Red',
    description: 'Animated flame pattern',
    unlockRequirement: -1,
    unlockText: 'Premium Skin Pack',
    color: '#ff4500',
    isPremium: true,
    premiumPackId: 'premium_skin_pack',
  },
  {
    id: 'aurora',
    name: 'Aurora Green',
    description: 'Northern lights shimmer',
    unlockRequirement: -1,
    unlockText: 'Premium Skin Pack',
    color: '#00ff88',
    isPremium: true,
    premiumPackId: 'premium_skin_pack',
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
    unlockText: 'Win 10 games',
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
    unlockText: 'Win 20 games',
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
    unlockText: 'Win 30 games',
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
    unlockText: 'Win 40 games',
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
  {
    id: 'arctic',
    name: 'Arctic White',
    description: 'Icy northern lights',
    icon: '❄️',
    unlockRequirement: 100,
    unlockText: 'Win 100 games',
    colors: {
      cellEmpty: '#1a2a3a',
      cellAirplane: '#a5d8ff',
      cellHit: '#ff6b6b',
      cellMiss: '#546e7a',
      cellKilled: '#e63946',
      gridLine: '#2c3e50',
      background: '#0a1520',
    },
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    description: 'Warm golden sunset',
    icon: '🌟',
    unlockRequirement: 150,
    unlockText: 'Win 150 games',
    colors: {
      cellEmpty: '#2a1f0f',
      cellAirplane: '#ffd700',
      cellHit: '#ff6347',
      cellMiss: '#8b7355',
      cellKilled: '#dc143c',
      gridLine: '#4a3520',
      background: '#150f05',
    },
  },
  {
    id: 'nebula',
    name: 'Nebula Space',
    description: 'Deep space nebula',
    icon: '🚀',
    unlockRequirement: 200,
    unlockText: 'Win 200 games',
    colors: {
      cellEmpty: '#1a0a2e',
      cellAirplane: '#6a0dad',
      cellHit: '#ff1493',
      cellMiss: '#483d8b',
      cellKilled: '#ff0066',
      gridLine: '#2e1a47',
      background: '#0a0118',
    },
  },
  // Premium themes (IAP only)
  {
    id: 'neon_city',
    name: 'Neon City',
    description: 'Cyberpunk neon colors',
    icon: '🌃',
    unlockRequirement: -1,
    unlockText: 'Premium Theme Pack',
    colors: {
      cellEmpty: '#0d0d1a',
      cellAirplane: '#00ffff',
      cellHit: '#ff00ff',
      cellMiss: '#1a1a3e',
      cellKilled: '#ff0055',
      gridLine: '#1a1a40',
      background: '#050510',
    },
    isPremium: true,
    premiumPackId: 'premium_theme_pack',
  },
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom',
    description: 'Soft pink sakura theme',
    icon: '🌸',
    unlockRequirement: -1,
    unlockText: 'Premium Theme Pack',
    colors: {
      cellEmpty: '#2d1a25',
      cellAirplane: '#ffb7c5',
      cellHit: '#ff6b81',
      cellMiss: '#8b5e6b',
      cellKilled: '#e63956',
      gridLine: '#4a2a3a',
      background: '#1a0f15',
    },
    isPremium: true,
    premiumPackId: 'premium_theme_pack',
  },
  {
    id: 'midnight_gold',
    name: 'Midnight Gold',
    description: 'Black and gold luxury theme',
    icon: '🏆',
    unlockRequirement: -1,
    unlockText: 'Premium Theme Pack',
    colors: {
      cellEmpty: '#1a1400',
      cellAirplane: '#ffd700',
      cellHit: '#ff4500',
      cellMiss: '#4a4000',
      cellKilled: '#cc0000',
      gridLine: '#332b00',
      background: '#0d0a00',
    },
    isPremium: true,
    premiumPackId: 'premium_theme_pack',
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
