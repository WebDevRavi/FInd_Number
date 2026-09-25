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
    this.difficulty = 'medium';
    this.targetNumber = 1;
    this.clicksTotal = 0;
    this.clicksCorrect = 0;
    this.shufflesCount = 0;
    this.hintsRemaining = CONFIG.HINTS_PER_ROUND || 3;
    this.theme = CONFIG.DEFAULT_THEME || 'dark';
    this.soundEnabled = true;
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

  resetRound(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.targetNumber = 1;
    this.clicksTotal = 0;
    this.clicksCorrect = 0;
    this.shufflesCount = 0;
    this.hintsRemaining = CONFIG.HINTS_PER_ROUND || 3;
    this.notify('roundReset', { difficulty, hintsRemaining: this.hintsRemaining });
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

      this.notify('numberFound', {
        foundNumber,
        nextTarget: this.targetNumber,
        isCompleted: this.targetNumber > 100
      });

      if (this.targetNumber > 100) {
        this.setStatus(GameStatus.COMPLETED);
      }
    } else {
      // Wrong click: strictly zero penalty, zero feedback per Locked Rule 4.
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
