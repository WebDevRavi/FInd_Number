/**
 * Find the Number - Storage Module
 * Uses CrazyGames SDK Data Module if available, falling back to localStorage.
 * Master Spec Section 11 & 75.
 * Implements complete Data module surface: getItem, setItem, removeItem, clear.
 */

import { platform } from './platform.js';
import { CONFIG } from './config.js';

class StorageManager {
  async getItem(key, defaultValue = null) {
    try {
      if (platform.isSDKAvailable && platform.sdk?.data?.getItem) {
        const val = await platform.sdk.data.getItem(key);
        if (val !== null && val !== undefined) {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
      }
    } catch (e) {
      console.warn('[Storage] SDK getItem failed, falling back to localStorage:', e);
    }

    try {
      const localVal = localStorage.getItem(key);
      if (localVal !== null && localVal !== undefined) {
        try {
          return JSON.parse(localVal);
        } catch {
          return localVal;
        }
      }
    } catch (e) {
      console.warn('[Storage] localStorage getItem failed:', e);
    }

    return defaultValue;
  }

  async setItem(key, value) {
    const serialized = JSON.stringify(value);

    // Save to localStorage immediately
    try {
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('[Storage] localStorage setItem failed:', e);
    }

    // Also sync to CrazyGames Data module if available
    try {
      if (platform.isSDKAvailable && platform.sdk?.data?.setItem) {
        await platform.sdk.data.setItem(key, serialized);
      }
    } catch (e) {
      console.warn('[Storage] SDK setItem failed:', e);
    }
  }

  async removeItem(key) {
    // Remove from localStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] localStorage removeItem failed:', e);
    }

    // Also remove from CrazyGames Data module if available
    try {
      if (platform.isSDKAvailable && platform.sdk?.data?.removeItem) {
        await platform.sdk.data.removeItem(key);
      }
    } catch (e) {
      console.warn('[Storage] SDK removeItem failed:', e);
    }
  }

  async clear() {
    // Clear localStorage
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('[Storage] localStorage clear failed:', e);
    }

    // Also clear CrazyGames Data module if available
    try {
      if (platform.isSDKAvailable && platform.sdk?.data?.clear) {
        await platform.sdk.data.clear();
      }
    } catch (e) {
      console.warn('[Storage] SDK clear failed:', e);
    }
  }

  async getBestTime(difficulty) {
    const key = `${CONFIG.STORAGE_KEYS.BEST_TIME_PREFIX}${difficulty}`;
    const val = await this.getItem(key, null);
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (typeof num === 'number' && !isNaN(num) && num >= 1.0) {
      return num;
    }
    if (num !== null && typeof num === 'number' && num < 1.0) {
      // Purge invalid sub-second records from tests
      await this.removeItem(key);
    }
    return null;
  }

  async setBestTime(difficulty, timeSeconds) {
    if (!timeSeconds || typeof timeSeconds !== 'number' || timeSeconds < 0.5) {
      const current = await this.getBestTime(difficulty);
      return { isNewBest: false, bestTime: current };
    }
    const key = `${CONFIG.STORAGE_KEYS.BEST_TIME_PREFIX}${difficulty}`;
    const currentBest = await this.getBestTime(difficulty);
    if (currentBest === null || timeSeconds < currentBest) {
      await this.setItem(key, timeSeconds);
      return { isNewBest: true, bestTime: timeSeconds };
    }
    return { isNewBest: false, bestTime: currentBest };
  }

  async getTheme() {
    return await this.getItem(CONFIG.STORAGE_KEYS.THEME, CONFIG.DEFAULT_THEME || 'dark');
  }

  async setTheme(theme) {
    await this.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  }

  async getMusicEnabled() {
    return await this.getItem(CONFIG.STORAGE_KEYS.MUSIC, true);
  }

  async setMusicEnabled(enabled) {
    await this.setItem(CONFIG.STORAGE_KEYS.MUSIC, enabled);
  }

  async getSoundEnabled() {
    return await this.getItem(CONFIG.STORAGE_KEYS.SOUND, true);
  }

  async setSoundEnabled(enabled) {
    await this.setItem(CONFIG.STORAGE_KEYS.SOUND, enabled);
  }

  async getVolume() {
    return await this.getItem(CONFIG.STORAGE_KEYS.VOLUME, 1.0);
  }

  async setVolume(vol) {
    await this.setItem(CONFIG.STORAGE_KEYS.VOLUME, vol);
  }

  // ==================== CAMPAIGN PROGRESSION ====================

  async getCampaignProgress() {
    const data = await this.getItem(CONFIG.STORAGE_KEYS.CAMPAIGN_PROGRESS, {
      unlockedLevel: 1,
      stars: {},
      bestTimes: {}
    });
    return data || { unlockedLevel: 1, stars: {}, bestTimes: {} };
  }

  async saveLevelResult(level, starsEarned, timeSeconds) {
    const progress = await this.getCampaignProgress();
    const currentStars = progress.stars[level] || 0;
    const currentBestTime = progress.bestTimes[level] || null;

    let isNewBestTime = false;
    let isNewBestStars = false;

    if (starsEarned > currentStars) {
      progress.stars[level] = starsEarned;
      isNewBestStars = true;
    }

    if (currentBestTime === null || timeSeconds < currentBestTime) {
      progress.bestTimes[level] = timeSeconds;
      isNewBestTime = true;
    }

    // Unlock next level (up to max campaign levels)
    const maxLevel = CONFIG.CAMPAIGN_LEVELS?.length || 20;
    if (level >= progress.unlockedLevel && level < maxLevel) {
      progress.unlockedLevel = level + 1;
    }

    await this.setItem(CONFIG.STORAGE_KEYS.CAMPAIGN_PROGRESS, progress);
    return { progress, isNewBestTime, isNewBestStars, bestTime: progress.bestTimes[level] };
  }

  // ==================== DAILY CHALLENGE & STREAKS ====================

  getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async getDailyStatus() {
    const today = this.getTodayKey();
    const yesterday = this.getYesterdayKey();

    const lastDate = await this.getItem(CONFIG.STORAGE_KEYS.LAST_DAILY_DATE, null);
    let streak = await this.getItem(CONFIG.STORAGE_KEYS.DAILY_STREAK, 0);
    streak = typeof streak === 'number' ? streak : 0;

    const completedToday = lastDate === today;

    // If missed yesterday and not played today, streak broke
    if (!completedToday && lastDate !== yesterday && lastDate !== null) {
      streak = 0;
      await this.setItem(CONFIG.STORAGE_KEYS.DAILY_STREAK, 0);
    }

    return {
      today,
      lastDate,
      streak,
      completedToday
    };
  }

  async completeDailyChallenge(timeSeconds) {
    const status = await this.getDailyStatus();
    if (status.completedToday) return status;

    const newStreak = status.streak + 1;
    await this.setItem(CONFIG.STORAGE_KEYS.DAILY_STREAK, newStreak);
    await this.setItem(CONFIG.STORAGE_KEYS.LAST_DAILY_DATE, status.today);

    return {
      today: status.today,
      lastDate: status.today,
      streak: newStreak,
      completedToday: true
    };
  }
}

export const storage = new StorageManager();
