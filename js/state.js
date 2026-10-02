/**
 * Find the Number - Game State Authority
 * Single Source of Truth as per Master Spec Section 34.
 */

import { CONFIG } from './config.js';

export const GameStatus = {
  HOME: 'HOME',
  DIFFICULTY: 'DIFFICULTY',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED'
};

class GameState {
  constructor() {
    this.status = GameStatus.HOME;
    this.gameMode = 'classic'; // 'classic' | 'campaign' | 'daily'
    this.difficulty = 'medium';
    this.currentLevel = 1;
    this.totalNumbers = 100;
    this.targetNumber = 1;
    this.clicksTotal = 0;
    this.clicksCorrect = 0;
    this.shufflesCount = 0;
    this.hintsRemaining = CONFIG.HINTS_PER_ROUND || 3;
    this.theme = CONFIG.DEFAULT_THEME || 'dark';
    this.soundEnabled = true;

    // Combo streak tracking
    this.combo = 0;
    this.lastFindTime = 0;
    this.maxCombo = 0;

    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, payload) {
    this.listeners.forEach(fn => fn(event, payload, this));
  }

  setStatus(newStatus) {
    if (this.status === newStatus) return;
    const oldStatus = this.status;
    this.status = newStatus;
    this.notify('statusChange', { oldStatus, newStatus });
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    this.notify('difficultyChange', diff);
  }

  setTheme(theme) {
    this.theme = theme;
    this.notify('themeChange', theme);
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    this.notify('soundChange', enabled);
  }

  resetRound(options = {}) {
    if (typeof options === 'string') {
      this.difficulty = options;
      this.gameMode = 'classic';
      this.totalNumbers = CONFIG.DIFFICULTIES[options]?.totalNumbers || 100;
    } else {
      this.difficulty = options.difficulty || 'medium';
      this.gameMode = options.gameMode || 'classic';
      this.currentLevel = options.level || 1;
      this.totalNumbers = options.totalNumbers || (CONFIG.DIFFICULTIES[this.difficulty]?.totalNumbers || 100);
    }

    this.targetNumber = 1;
    this.clicksTotal = 0;
    this.clicksCorrect = 0;
    this.shufflesCount = 0;
    this.hintsRemaining = CONFIG.HINTS_PER_ROUND || 3;
    this.combo = 0;
    this.lastFindTime = 0;
    this.maxCombo = 0;

    this.notify('roundReset', {
      difficulty: this.difficulty,
      gameMode: this.gameMode,
      level: this.currentLevel,
      totalNumbers: this.totalNumbers,
      hintsRemaining: this.hintsRemaining
    });
  }

  useHint() {
    if (this.hintsRemaining <= 0) return false;
    this.hintsRemaining--;
    this.notify('hintUsed', {
      hintsRemaining: this.hintsRemaining,
      targetNumber: this.targetNumber
    });
    return true;
  }

  recordClick(clickedValue) {
    this.clicksTotal++;
    const isCorrect = clickedValue === this.targetNumber;

    if (isCorrect) {
      this.clicksCorrect++;
      const foundNumber = this.targetNumber;
      this.targetNumber++;

      // Compute Combo Streak (if found within 3.0s of previous find)
      const now = performance.now();
      if (this.lastFindTime > 0 && (now - this.lastFindTime) < 3000) {
        this.combo++;
      } else {
        this.combo = 1;
      }
      this.lastFindTime = now;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      const isCompleted = this.targetNumber > this.totalNumbers;

      this.notify('numberFound', {
        foundNumber,
        nextTarget: this.targetNumber,
        isCompleted,
        combo: this.combo,
        totalNumbers: this.totalNumbers
      });

      if (isCompleted) {
        this.setStatus(GameStatus.COMPLETED);
      }
    } else {
      // Wrong click: reset combo streak
      this.combo = 0;
      this.notify('wrongClick', { clickedValue });
    }

    return isCorrect;
  }

  incrementShuffles() {
    this.shufflesCount++;
    this.notify('shuffleOccurred', this.shufflesCount);
  }
}

export const gameState = new GameState();
