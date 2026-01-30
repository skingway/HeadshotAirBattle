/**
 * Audio Manager for React Native
 * Manages sound effects and background music
 */

import {Vibration} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';

const STORAGE_KEYS = {
  AUDIO_ENABLED: 'audio_enabled',
  BGM_VOLUME: 'bgm_volume',
  SFX_VOLUME: 'sfx_volume',
};

// Sound file mapping
const SOUND_FILES = {
  miss: 'miss.mp3',
  hit: 'hit.mp3',
  kill: 'kill.mp3',
  victory: 'victory.mp3',
  defeat: 'defeat.mp3',
  bgm: 'bgm.mp3',
};

class AudioManager {
  private enabled: boolean = true;
  private bgmVolume: number = 0.3;
  private sfxVolume: number = 0.5;
  private sounds: Map<string, Sound> = new Map();
  private bgmSound: Sound | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize audio system
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('Audio Manager already initialized');
      return;
    }

    try {
      // Load settings
      const savedEnabled = await AsyncStorage.getItem(STORAGE_KEYS.AUDIO_ENABLED);
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }

      const savedBgmVolume = await AsyncStorage.getItem(STORAGE_KEYS.BGM_VOLUME);
      if (savedBgmVolume !== null) {
        this.bgmVolume = parseFloat(savedBgmVolume);
      }

      const savedSfxVolume = await AsyncStorage.getItem(STORAGE_KEYS.SFX_VOLUME);
      if (savedSfxVolume !== null) {
        this.sfxVolume = parseFloat(savedSfxVolume);
      }

      // Enable playback in silence mode (iOS)
      Sound.setCategory('Playback');

      // Preload sound effects
      await this.preloadSounds();

      this.isInitialized = true;

      console.log('✓ Audio Manager initialized', {
        enabled: this.enabled,
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
        soundsLoaded: this.sounds.size,
      });
    } catch (error) {
      console.error('❌ Failed to initialize AudioManager:', error);
    }
  }

  /**
   * Preload all sound effects
   */
  private async preloadSounds(): Promise<void> {
    return new Promise((resolve) => {
      const soundNames = Object.keys(SOUND_FILES).filter(key => key !== 'bgm');
      let loadedCount = 0;
      let failedCount = 0;

      if (soundNames.length === 0) {
        resolve();
        return;
      }

      soundNames.forEach((soundName) => {
        const fileName = SOUND_FILES[soundName as keyof typeof SOUND_FILES];

        const sound = new Sound(fileName, Sound.MAIN_BUNDLE, (error) => {
          if (error) {
            console.warn(`⚠️ Failed to load sound: ${fileName}`, error);
            failedCount++;
          } else {
            this.sounds.set(soundName, sound);
            loadedCount++;
            console.log(`✓ Loaded sound: ${fileName}`);
          }

          // Check if all sounds are loaded
          if (loadedCount + failedCount === soundNames.length) {
            console.log(`Sound loading complete: ${loadedCount} succeeded, ${failedCount} failed`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Play sound effect
   */
  playSFX(soundName: 'miss' | 'hit' | 'kill' | 'victory' | 'defeat'): void {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);

    if (sound) {
      // Play actual sound file
      sound.setVolume(this.sfxVolume);
      sound.stop(() => {
        sound.play((success) => {
          if (!success) {
            console.warn(`Failed to play sound: ${soundName}`);
            this.playVibrationFallback(soundName);
          }
        });
      });
    } else {
      // Fallback to vibration if sound not loaded
      console.log(`Sound not loaded, using vibration: ${soundName}`);
      this.playVibrationFallback(soundName);
    }
  }

  /**
   * Vibration fallback for when sound files are not available
   */
  private playVibrationFallback(soundName: string): void {
    switch (soundName) {
      case 'miss':
        Vibration.vibrate(50);
        break;
      case 'hit':
        Vibration.vibrate(100);
        break;
      case 'kill':
        Vibration.vibrate([0, 100, 50, 100]);
        break;
      case 'victory':
        Vibration.vibrate([0, 50, 50, 50, 50, 100]);
        break;
      case 'defeat':
        Vibration.vibrate([0, 200, 100, 200]);
        break;
    }
  }

  /**
   * Play background music
   */
  playBGM(): void {
    if (!this.enabled) return;

    if (this.bgmSound) {
      this.bgmSound.setVolume(this.bgmVolume);
      this.bgmSound.setNumberOfLoops(-1); // Loop indefinitely
      this.bgmSound.play((success) => {
        if (!success) {
          console.warn('Failed to play BGM');
        }
      });
      console.log('✓ BGM started');
    } else {
      // Try to load BGM on demand
      this.bgmSound = new Sound(SOUND_FILES.bgm, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.warn('⚠️ Failed to load BGM:', error);
          return;
        }
        this.playBGM();
      });
    }
  }

  /**
   * Stop background music
   */
  stopBGM(): void {
    if (this.bgmSound) {
      this.bgmSound.stop(() => {
        console.log('✓ BGM stopped');
      });
    }
  }

  /**
   * Pause background music
   */
  pauseBGM(): void {
    if (this.bgmSound) {
      this.bgmSound.pause();
      console.log('✓ BGM paused');
    }
  }

  /**
   * Release all audio resources
   */
  release(): void {
    // Release sound effects
    this.sounds.forEach((sound) => {
      sound.release();
    });
    this.sounds.clear();

    // Release BGM
    if (this.bgmSound) {
      this.bgmSound.release();
      this.bgmSound = null;
    }

    this.isInitialized = false;
    console.log('✓ Audio resources released');
  }

  /**
   * Set enabled state
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_ENABLED, enabled.toString());

    if (!enabled) {
      this.stopBGM();
    }

    console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set BGM volume
   */
  async setBGMVolume(volume: number): Promise<void> {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    await AsyncStorage.setItem(
      STORAGE_KEYS.BGM_VOLUME,
      this.bgmVolume.toString(),
    );

    console.log(`BGM volume set to ${this.bgmVolume}`);
  }

  /**
   * Set SFX volume
   */
  async setSFXVolume(volume: number): Promise<void> {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    await AsyncStorage.setItem(
      STORAGE_KEYS.SFX_VOLUME,
      this.sfxVolume.toString(),
    );

    console.log(`SFX volume set to ${this.sfxVolume}`);
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      enabled: this.enabled,
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
    };
  }
}

// Export singleton instance
export default new AudioManager();
