/**
 * Achievement System Test Script
 * Tests achievement unlock conditions
 */

// Mock achievement data
const achievements = {
  firstWin: {
    id: 'firstWin',
    name: 'First Victory',
    condition: (gameResult, userStats) => userStats.wins >= 1,
  },
  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    condition: (gameResult, userStats) => gameResult.accuracy >= 80,
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning Strike',
    condition: (gameResult, userStats) => gameResult.won && gameResult.totalTurns < 30,
  },
  perfectGame: {
    id: 'perfectGame',
    name: 'Perfect Game',
    condition: (gameResult, userStats) => gameResult.won && gameResult.accuracy === 100,
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    condition: (gameResult, userStats) => userStats.totalGames >= 100,
  },
  victor: {
    id: 'victor',
    name: 'Victor',
    condition: (gameResult, userStats) => userStats.wins >= 50,
  },
  mediumUnlocked: {
    id: 'mediumUnlocked',
    name: 'Medium Unlocked',
    condition: (gameResult, userStats) => userStats.wins >= 3,
  },
  hardUnlocked: {
    id: 'hardUnlocked',
    name: 'Hard Unlocked',
    condition: (gameResult, userStats) => userStats.wins >= 10,
  },
};

// Test cases
const testCases = [
  {
    name: 'First Win Achievement',
    gameResult: { won: true, totalTurns: 50, accuracy: 60 },
    userStats: { wins: 1, totalGames: 1 },
    expectedUnlocks: ['firstWin'], // mediumUnlocked needs 3 wins
  },
  {
    name: 'Sharpshooter Achievement',
    gameResult: { won: true, totalTurns: 40, accuracy: 85 },
    userStats: { wins: 5, totalGames: 10 },
    expectedUnlocks: ['firstWin', 'sharpshooter', 'mediumUnlocked'],
  },
  {
    name: 'Lightning Strike Achievement',
    gameResult: { won: true, totalTurns: 25, accuracy: 70 },
    userStats: { wins: 2, totalGames: 5 },
    expectedUnlocks: ['firstWin', 'lightning'], // mediumUnlocked needs 3 wins
  },
  {
    name: 'Perfect Game Achievement',
    gameResult: { won: true, totalTurns: 36, accuracy: 100 },
    userStats: { wins: 15, totalGames: 30 },
    expectedUnlocks: ['firstWin', 'sharpshooter', 'perfectGame', 'mediumUnlocked', 'hardUnlocked'], // 100% also unlocks sharpshooter
  },
  {
    name: 'Veteran Achievement',
    gameResult: { won: false, totalTurns: 50, accuracy: 50 },
    userStats: { wins: 45, totalGames: 100 },
    expectedUnlocks: ['firstWin', 'veteran', 'mediumUnlocked', 'hardUnlocked'],
  },
  {
    name: 'Victor Achievement',
    gameResult: { won: true, totalTurns: 40, accuracy: 65 },
    userStats: { wins: 50, totalGames: 80 },
    expectedUnlocks: ['firstWin', 'victor', 'mediumUnlocked', 'hardUnlocked'],
  },
  {
    name: 'No Achievements Yet',
    gameResult: { won: false, totalTurns: 60, accuracy: 40 },
    userStats: { wins: 0, totalGames: 1 },
    expectedUnlocks: [],
  },
];

console.log('=== Achievement System Test ===\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Game Result:`, testCase.gameResult);
  console.log(`  User Stats:`, testCase.userStats);

  const unlockedAchievements = [];

  // Check all achievements
  Object.values(achievements).forEach(achievement => {
    if (achievement.condition(testCase.gameResult, testCase.userStats)) {
      unlockedAchievements.push(achievement.id);
    }
  });

  // Compare with expected
  const expectedSet = new Set(testCase.expectedUnlocks);
  const actualSet = new Set(unlockedAchievements);

  const missing = testCase.expectedUnlocks.filter(id => !actualSet.has(id));
  const extra = unlockedAchievements.filter(id => !expectedSet.has(id));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ✓ PASSED - Unlocked: [${unlockedAchievements.join(', ')}]`);
    passed++;
  } else {
    console.log(`  ✗ FAILED`);
    if (missing.length > 0) {
      console.log(`    Missing: [${missing.join(', ')}]`);
    }
    if (extra.length > 0) {
      console.log(`    Extra: [${extra.join(', ')}]`);
    }
    console.log(`    Expected: [${testCase.expectedUnlocks.join(', ')}]`);
    console.log(`    Actual: [${unlockedAchievements.join(', ')}]`);
    failed++;
  }
  console.log();
});

console.log('=== Test Summary ===');
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

process.exit(failed > 0 ? 1 : 0);
