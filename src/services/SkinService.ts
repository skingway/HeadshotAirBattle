/**
 * Skin Service
 * Manages airplane skins and board themes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {getSkinById, getThemeById} from '../config/SkinConfig';

const SKIN_KEY = '@airplane_skin';
const THEME_KEY = '@board_theme';

class SkinServiceClass {
  private currentSkin: string = 'blue'; // Default
  private currentTheme: string = 'default'; // Default

  /**
   * Initialize service - load saved preferences
   */
  async initialize(): Promise<void> {
    try {
      const [savedSkin, savedTheme] = await Promise.all([
        AsyncStorage.getItem(SKIN_KEY),
        AsyncStorage.getItem(THEME_KEY),
      ]);

      if (savedSkin) {
        this.currentSkin = savedSkin;
      }
      if (savedTheme) {
        this.currentTheme = savedTheme;
      }

      console.log('[SkinService] Initialized:', {skin: this.currentSkin, theme: this.currentTheme});
    } catch (error) {
      console.error('[SkinService] Initialize error:', error);
    }
  }

  /**
   * Get current airplane skin ID
   */
  getCurrentSkin(): string {
    return this.currentSkin;
  }

  /**
   * Get current airplane skin color
   */
  getCurrentSkinColor(): string {
    const skin = getSkinById(this.currentSkin);
    return skin ? skin.color : '#3498db'; // Default blue
  }

  /**
   * Get current board theme ID
   */
  getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * Get current board theme colors
   */
  getCurrentThemeColors() {
    const theme = getThemeById(this.currentTheme);
    return theme ? theme.colors : getThemeById('default')!.colors;
  }

  /**
   * Set airplane skin
   */
  async setAirplaneSkin(skinId: string): Promise<boolean> {
    try {
      const skin = getSkinById(skinId);
      if (!skin) {
        console.error('[SkinService] Invalid skin ID:', skinId);
        return false;
      }

      this.currentSkin = skinId;
      await AsyncStorage.setItem(SKIN_KEY, skinId);
      console.log('[SkinService] Skin changed to:', skinId);
      return true;
    } catch (error) {
      console.error('[SkinService] Set skin error:', error);
      return false;
    }
  }

  /**
   * Set board theme
   */
  async setBoardTheme(themeId: string): Promise<boolean> {
    try {
      const theme = getThemeById(themeId);
      if (!theme) {
        console.error('[SkinService] Invalid theme ID:', themeId);
        return false;
      }

      this.currentTheme = themeId;
      await AsyncStorage.setItem(THEME_KEY, themeId);
      console.log('[SkinService] Theme changed to:', themeId);
      return true;
    } catch (error) {
      console.error('[SkinService] Set theme error:', error);
      return false;
    }
  }

  /**
   * Reset to defaults
   */
  async reset(): Promise<void> {
    try {
      this.currentSkin = 'blue';
      this.currentTheme = 'default';
      await Promise.all([
        AsyncStorage.removeItem(SKIN_KEY),
        AsyncStorage.removeItem(THEME_KEY),
      ]);
      console.log('[SkinService] Reset to defaults');
    } catch (error) {
      console.error('[SkinService] Reset error:', error);
    }
  }
}

// Export singleton instance
const SkinService = new SkinServiceClass();
export default SkinService;
