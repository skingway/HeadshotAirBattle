/**
 * Color Utilities
 * Helper functions for color manipulation and cell effect generation
 */

export function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length < 6) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHex(hex: string): {r: number; g: number; b: number} {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

export function lighten(hex: string, amount: number): string {
  const {r, g, b} = parseHex(hex);
  return toHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

export function darken(hex: string, amount: number): string {
  const {r, g, b} = parseHex(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

export interface CellEffects {
  empty: {
    bg: string;
    border: string;
  };
  airplane: {
    gradientStart: string;
    gradientEnd: string;
    wingLine: string;
  };
  head: {
    gradientStart: string;
    gradientEnd: string;
    reticle: string;
    centerDot: string;
  };
  hit: {
    gradientStart: string;
    gradientEnd: string;
    glow: string;
  };
  killed: {
    gradientStart: string;
    gradientEnd: string;
    xOverlay: string;
    outerGlow: string;
  };
  miss: {
    bg: string;
    dot: string;
  };
}

export function generateCellEffects(themeColors: {
  cellEmpty: string;
  cellAirplane: string;
  cellHit: string;
  cellMiss: string;
  cellKilled: string;
  gridLine: string;
  background: string;
}): CellEffects {
  return {
    empty: {
      bg: themeColors.cellEmpty,
      border: hexToRgba(themeColors.gridLine, 0.3),
    },
    airplane: {
      gradientStart: lighten(themeColors.cellAirplane, 0.2),
      gradientEnd: darken(themeColors.cellAirplane, 0.2),
      wingLine: hexToRgba(themeColors.cellAirplane, 0.5),
    },
    head: {
      gradientStart: lighten(themeColors.cellAirplane, 0.3),
      gradientEnd: themeColors.cellAirplane,
      reticle: hexToRgba(themeColors.cellAirplane, 0.8),
      centerDot: lighten(themeColors.cellAirplane, 0.5),
    },
    hit: {
      gradientStart: lighten(themeColors.cellHit, 0.15),
      gradientEnd: darken(themeColors.cellHit, 0.15),
      glow: hexToRgba(themeColors.cellHit, 0.5),
    },
    killed: {
      gradientStart: lighten(themeColors.cellKilled, 0.15),
      gradientEnd: darken(themeColors.cellKilled, 0.2),
      xOverlay: hexToRgba(themeColors.cellKilled, 0.9),
      outerGlow: hexToRgba(themeColors.cellKilled, 0.4),
    },
    miss: {
      bg: themeColors.cellMiss,
      dot: hexToRgba(themeColors.gridLine, 0.6),
    },
  };
}
