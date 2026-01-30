/**
 * Sound Effects Download Script
 * Downloads free sound effects for the game
 *
 * Free sound sources (CC0 License):
 * - Pixabay: https://pixabay.com/sound-effects/
 * - Freesound: https://freesound.org/
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Target directory for sound files
const SOUND_DIR = path.join(__dirname, '../android/app/src/main/res/raw');

// Free sound effect URLs (CC0 licensed from Pixabay)
const SOUND_URLS = {
  miss: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=water-drop-3-185658.mp3',
  hit: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c3c5d4a0b5.mp3?filename=metal-hit-176165.mp3',
  kill: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_4db8ab5a24.mp3?filename=explosion-42132.mp3'
};

// Create directory if it doesn't exist
if (!fs.existsSync(SOUND_DIR)) {
  fs.mkdirSync(SOUND_DIR, { recursive: true });
  console.log('✓ Created directory:', SOUND_DIR);
}

/**
 * Download a file from URL
 */
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(SOUND_DIR, filename);
    const file = fs.createWriteStream(filePath);

    console.log(`Downloading ${filename}...`);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

/**
 * Main download function
 */
async function downloadAllSounds() {
  console.log('========================================');
  console.log('Downloading Sound Effects...');
  console.log('========================================\n');

  try {
    for (const [name, url] of Object.entries(SOUND_URLS)) {
      await downloadFile(url, `${name}.mp3`);
    }

    console.log('\n========================================');
    console.log('✓ All sounds downloaded successfully!');
    console.log('========================================');
    console.log('\nSound files location:');
    console.log(SOUND_DIR);
    console.log('\nYou can now rebuild the app to include these sounds.');
  } catch (error) {
    console.error('\n❌ Error downloading sounds:', error.message);
    console.error('\nAlternative: Download manually from:');
    console.error('1. Pixabay: https://pixabay.com/sound-effects/');
    console.error('2. Freesound: https://freesound.org/');
    console.error('\nSearch for: "water drop", "metal hit", "explosion"');
    console.error(`Save as: miss.mp3, hit.mp3, kill.mp3 in ${SOUND_DIR}`);
  }
}

// Run the script
downloadAllSounds();
