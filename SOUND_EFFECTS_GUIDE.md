# 🎵 Sound Effects Setup Guide

This game needs 3 sound effect files to provide audio feedback during gameplay.

## 📁 Required Files

Place these files in: `android/app/src/main/res/raw/`

1. **miss.mp3** - Played when an attack misses (soft sound)
2. **hit.mp3** - Played when an attack hits (medium impact sound)
3. **kill.mp3** - Played when an airplane is destroyed (explosion sound)

## 🎼 Option 1: Download from Pixabay (Recommended - Free & Legal)

Pixabay offers free sound effects under CC0 license (no attribution required).

**Website**: https://pixabay.com/sound-effects/

### Step-by-step:

1. **For miss.mp3**:
   - Search: "water drop" or "swoosh" or "miss"
   - Download a short, soft sound
   - Rename to `miss.mp3`

2. **For hit.mp3**:
   - Search: "punch" or "hit" or "impact"
   - Download a medium impact sound
   - Rename to `hit.mp3`

3. **For kill.mp3**:
   - Search: "explosion" or "bomb"
   - Download an explosion sound
   - Rename to `kill.mp3`

4. **Place files**:
   - Copy all 3 MP3 files to: `android/app/src/main/res/raw/`
   - File names must be lowercase with no spaces

## 🎹 Option 2: Download from Freesound.org (High Quality)

Freesound has professional sound effects (requires free account).

**Website**: https://freesound.org/

1. Create free account
2. Search and download:
   - "water splash" for miss
   - "metal hit" for hit
   - "small explosion" for kill
3. Rename and place in `android/app/src/main/res/raw/`

## 🔊 Option 3: Use AI to Generate

If you have access to AI audio generation tools:

1. **ElevenLabs** or **Loudly**
2. Generate sounds with these prompts:
   - miss: "soft water drop sound effect"
   - hit: "sharp metal impact sound"
   - kill: "medium explosion sound effect"
3. Export as MP3 and rename

## 📱 For iOS (when developing iOS version)

Place the same 3 files in: `ios/[YourAppName]/`

## ✅ Verify Installation

After placing the files:

```bash
ls android/app/src/main/res/raw/
```

You should see:
- miss.mp3
- hit.mp3
- kill.mp3
- keep.xml (already exists)

## 🔨 Rebuild the App

After adding sound files:

```bash
cd android
./gradlew assembleRelease
```

Or run the build script that generates the APK.

## 🎮 Testing

The game will:
- ✅ Play sound + vibration if files exist
- ✅ Play vibration only if files are missing
- ✅ Never crash or error due to missing sounds

## 💡 Recommended Sound Characteristics

- **Format**: MP3
- **Duration**: 0.2-1 second (short sounds)
- **Size**: < 100KB per file
- **Quality**: 128kbps is sufficient

## ⚠️ Important Notes

1. **File names** must be lowercase (miss.mp3, not Miss.mp3)
2. **No spaces** in file names
3. **MP3 format** only
4. Files are **not included in Git** (too large)
5. Each developer must download their own copy

## 🆘 Need Help?

If you have trouble finding sounds, vibration-only mode works perfectly fine!
The game is fully playable without sound files.

---

**Quick Links**:
- Pixabay: https://pixabay.com/sound-effects/
- Freesound: https://freesound.org/
- Free Music Archive: https://freemusicarchive.org/
