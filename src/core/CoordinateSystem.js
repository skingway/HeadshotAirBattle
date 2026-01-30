/**
 * Coordinate System
 * Handles conversion between array indices and human-readable coordinates
 * Supports boards larger than 26 columns (A-Z, AA-AZ, BA-BZ, etc.)
 */

const CoordinateSystem = {
  /**
   * Convert column index (0-based) to letter(s)
   * 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, 27 -> AB, etc.
   * @param {number} index - Column index (0-based)
   * @returns {string} - Letter representation
   */
  indexToLetter(index) {
    let result = '';
    let num = index;

    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
      if (num < 0) break;
    }

    return result;
  },

  /**
   * Convert letter(s) to column index (0-based)
   * A -> 0, B -> 1, ..., Z -> 25, AA -> 26, AB -> 27, etc.
   * @param {string} letter - Letter representation
   * @returns {number} - Column index (0-based)
   */
  letterToIndex(letter) {
    let result = 0;
    const upperLetter = letter.toUpperCase();

    for (let i = 0; i < upperLetter.length; i++) {
      result = result * 26 + (upperLetter.charCodeAt(i) - 64);
    }

    return result - 1;
  },

  /**
   * Convert grid position to coordinate string
   * (0, 0) -> "1A", (9, 25) -> "10Z", (4, 26) -> "5AA"
   * @param {number} row - Row index (0-based)
   * @param {number} col - Column index (0-based)
   * @returns {string} - Coordinate string (e.g., "1A")
   */
  positionToCoordinate(row, col) {
    const rowNumber = row + 1; // Convert to 1-based
    const colLetter = this.indexToLetter(col);
    return `${rowNumber}${colLetter}`;
  },

  /**
   * Parse coordinate string to grid position
   * "1A" -> {row: 0, col: 0}, "10Z" -> {row: 9, col: 25}
   * @param {string} coordinate - Coordinate string (e.g., "1A")
   * @returns {{row: number, col: number}} - Grid position (0-based)
   */
  coordinateToPosition(coordinate) {
    // Extract row number and column letter
    const match = coordinate.match(/^(\d+)([A-Z]+)$/i);

    if (!match) {
      throw new Error(`Invalid coordinate format: ${coordinate}`);
    }

    const rowNumber = parseInt(match[1], 10);
    const colLetter = match[2];

    return {
      row: rowNumber - 1, // Convert to 0-based
      col: this.letterToIndex(colLetter)
    };
  },

  /**
   * Generate array of column labels for a given board width
   * @param {number} width - Board width
   * @returns {string[]} - Array of column labels (e.g., ["A", "B", ..., "Z", "AA", "AB"])
   */
  generateColumnLabels(width) {
    const labels = [];
    for (let i = 0; i < width; i++) {
      labels.push(this.indexToLetter(i));
    }
    return labels;
  },

  /**
   * Generate array of row labels for a given board height
   * @param {number} height - Board height
   * @returns {string[]} - Array of row labels (e.g., ["1", "2", ..., "10"])
   */
  generateRowLabels(height) {
    const labels = [];
    for (let i = 1; i <= height; i++) {
      labels.push(i.toString());
    }
    return labels;
  },

  /**
   * Validate if a coordinate is within board bounds
   * @param {number} row - Row index (0-based)
   * @param {number} col - Column index (0-based)
   * @param {number} boardSize - Board size
   * @returns {boolean} - True if within bounds
   */
  isWithinBounds(row, col, boardSize) {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
  },

  /**
   * Get adjacent cell positions (up, down, left, right)
   * @param {number} row - Row index (0-based)
   * @param {number} col - Column index (0-based)
   * @param {number} boardSize - Board size
   * @returns {Array<{row: number, col: number}>} - Array of valid adjacent positions
   */
  getAdjacentPositions(row, col, boardSize) {
    const directions = [
      { row: -1, col: 0 },  // Up
      { row: 1, col: 0 },   // Down
      { row: 0, col: -1 },  // Left
      { row: 0, col: 1 }    // Right
    ];

    return directions
      .map(dir => ({
        row: row + dir.row,
        col: col + dir.col
      }))
      .filter(pos => this.isWithinBounds(pos.row, pos.col, boardSize));
  }
};

// Export for React Native
export default CoordinateSystem;
