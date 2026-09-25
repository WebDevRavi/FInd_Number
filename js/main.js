/**
 * Find the Number - Main Application Orchestrator
 * Master Spec Section 31-36, 116-118, 149.
 */

import { CONFIG } from './config.js';
import { STRINGS, t } from './strings.js';
import { platform } from './platform.js';
import { storage } from './storage.js';
import { audio } from './audio.js';
import { GameTimer } from './timer.js';
import { BoardManager } from './board.js';
import { gameState, GameStatus } from './state.js';

class GameApp {
  constructor() {
    this.dom = {};
    this.timer = null;
    this.board = null;
    this.countdownTimerId = null;
    this.isPortrait = false;
  }

  async init() {
    this.cacheDOM();
    this.checkOrientation();

    // 1. Initialize Platform Adapter (CrazyGames SDK v3)
    await platform.init();

    // 2. Initialize Storage & Audio
    await audio.init();

    // 3. Load Saved Settings (Theme, Audio)
    const savedTheme = await storage.getTheme();
    this.applyTheme(savedTheme);

    const isMusicEnabled = await storage.getMusicEnabled();
    this.updateMusicUI(isMusicEnabled);

    const isSoundEnabled = await storage.getSoundEnabled();
    this.updateSoundUI(isSoundEnabled);

    const savedVol = await storage.getVolume();
    if (this.dom.volumeSlider && savedVol !== null && savedVol !== undefined) {
      this.dom.volumeSlider.value = savedVol;
    }

    // 4. Setup First-Gesture Autoplay Unlock (Starts calm background music)
    const onFirstUserGesture = () => {
      audio.unlockAudio();
      window.removeEventListener('pointerdown', onFirstUserGesture);
      window.removeEventListener('keydown', onFirstUserGesture);
    };
    window.addEventListener('pointerdown', onFirstUserGesture, { once: true });
    window.addEventListener('keydown', onFirstUserGesture, { once: true });

    // 5. Initialize Board & Timer
    this.timer = new GameTimer((formattedTime) => {
      if (this.dom.hudTime) this.dom.hudTime.textContent = formattedTime;
      if (this.dom.mobileHudTime) this.dom.mobileHudTime.textContent = formattedTime;
    });

    this.board = new BoardManager(this.dom.boardContainer, (clickedVal) => {
      this.handleNumberClick(clickedVal);
    });

    // 6. Wire Events & Subscribers
    this.bindEvents();
    this.subscribeState();

    // 7. Stop platform loading & Show Home Screen
    platform.loadingStop();
    this.showScreen('screen-home');
  }

  cacheDOM() {
    // Screens
    this.dom.screens = {
      home: document.getElementById('screen-home'),
      difficulty: document.getElementById('screen-difficulty'),
      gameplay: document.getElementById('screen-gameplay'),
      results: document.getElementById('screen-results')
    };

    // Modals
    this.dom.modals = {
      pause: document.getElementById('modal-pause'),
      howToPlay: document.getElementById('modal-how-to-play'),
      settings: document.getElementById('modal-settings'),
      leaderboard: document.getElementById('modal-leaderboard')
    };

    // Countdown Overlay
    this.dom.countdownOverlay = document.getElementById('countdown-overlay');
    this.dom.countdownStage = this.dom.countdownOverlay ? this.dom.countdownOverlay.querySelector('.countdown-stage') : null;
    this.dom.countdownSubtext = document.getElementById('countdown-subtext');
    this.dom.countdownRipple = document.getElementById('countdown-ripple');
    this.dom.countdownText = document.getElementById('countdown-text');
    this.dom.countdownHint = document.getElementById('countdown-hint');

    // Board
    this.dom.boardContainer = document.getElementById('number-board');

    // HUD Elements
    this.dom.hudTarget = document.getElementById('hud-target-number');
    this.dom.hudTime = document.getElementById('hud-time');
    this.dom.hudFound = document.getElementById('hud-found');
    this.dom.hudDifficultyBadge = document.getElementById('hud-difficulty-badge');

    // Mobile HUD Elements
    this.dom.mobileHudTime = document.getElementById('mobile-hud-time');
    this.dom.mobileHudTarget = document.getElementById('mobile-hud-target');
    this.dom.btnMobilePause = document.getElementById('btn-mobile-pause');

    // Results Elements
    this.dom.resTime = document.getElementById('res-time');
    this.dom.resBestTime = document.getElementById('res-best-time');
    this.dom.resDifficulty = document.getElementById('res-difficulty');
    this.dom.resNewBestBadge = document.getElementById('res-new-best-badge');
    this.dom.resFound = document.getElementById('res-found');
    this.dom.resHints = document.getElementById('res-hints');
    this.dom.resShuffles = document.getElementById('res-shuffles');

    // Settings UI Elements
    this.dom.btnThemeDark = document.getElementById('btn-theme-dark');
    this.dom.btnThemeLight = document.getElementById('btn-theme-light');
    this.dom.btnMusicOn = document.getElementById('btn-music-on');
    this.dom.btnMusicOff = document.getElementById('btn-music-off');
    this.dom.btnSoundOn = document.getElementById('btn-sound-on');
    this.dom.btnSoundOff = document.getElementById('btn-sound-off');
    this.dom.volumeSlider = document.getElementById('settings-volume-slider');

    // Top Navigation Icon Buttons
    this.dom.btnMuteQuick = document.getElementById('btn-quick-mute');
    this.dom.btnSettingsQuick = document.getElementById('btn-quick-settings');
    this.dom.btnHelpQuick = document.getElementById('btn-quick-help');
    this.dom.btnStatsQuick = document.getElementById('btn-quick-stats');

    // Hint Controls
    this.dom.btnHint = document.getElementById('btn-gameplay-hint');
    this.dom.btnMobileHint = document.getElementById('btn-mobile-hint');
    this.dom.hudHintCount = document.getElementById('hud-hint-count');
    this.dom.mobileHudHintCount = document.getElementById('mobile-hud-hint-count');
  }

  bindEvents() {
    // Prevent long-press context menus on mobile
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Global Button Tap SFX on all interactive buttons (debounced at 40ms, excludes hints which have dedicated playHint)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, .btn, .difficulty-card, .segment-btn');
      if (btn && !btn.disabled && !btn.closest('.board-number') && !btn.closest('#btn-gameplay-hint') && !btn.closest('#btn-mobile-hint')) {
        audio.playClick();
      }
    });

    // Window Resize / Orientation
    window.addEventListener('resize', () => {
      const portrait = this.checkOrientation();
      if (this.board) {
        this.board.resize(portrait);
      }
    });

    // Visibility / Tab Blur Handling (Auto-Pause)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && gameState.status === GameStatus.PLAYING) {
        this.pauseGame();
      }
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (gameState.status === GameStatus.PLAYING) {
          this.pauseGame();
        } else if (gameState.status === GameStatus.PAUSED) {
          this.resumeGame();
        }
      }
    });

    // Home Screen buttons
    document.getElementById('btn-home-play')?.addEventListener('click', () => {
      this.showScreen('screen-difficulty');
    });

    document.getElementById('btn-home-how')?.addEventListener('click', () => {
      this.openModal('howToPlay');
    });

    document.getElementById('btn-home-stats')?.addEventListener('click', () => {
      this.openStatsModal();
    });

    document.getElementById('btn-home-settings')?.addEventListener('click', () => {
      this.openModal('settings');
    });

    // Quick Icon buttons
    this.dom.btnMuteQuick?.addEventListener('click', () => {
      const newSound = !audio.soundEnabled;
      audio.setSoundEnabled(newSound);
      this.updateSoundUI(newSound);
    });

    this.dom.btnSettingsQuick?.addEventListener('click', () => {
      this.openModal('settings');
    });

    this.dom.btnHelpQuick?.addEventListener('click', () => {
      this.openModal('howToPlay');
    });

    this.dom.btnStatsQuick?.addEventListener('click', () => {
      this.openStatsModal();
    });

    // Difficulty Select (Clicking either card or Select button starts game)
    document.querySelectorAll('.difficulty-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const diff = card.dataset.difficulty;
        if (diff) {
          this.startCountdown(diff);
        }
      });
      // Keyboard selection (Enter / Space)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const diff = card.dataset.difficulty;
          if (diff) {
            audio.playClick();
            this.startCountdown(diff);
          }
        }
      });
    });

    document.getElementById('btn-diff-back')?.addEventListener('click', () => {
      this.showScreen('screen-home');
    });

    // Gameplay Navigation
    document.getElementById('btn-gameplay-back')?.addEventListener('click', () => {
      this.pauseGame();
    });

    document.getElementById('btn-gameplay-pause')?.addEventListener('click', () => {
      this.pauseGame();
    });

    this.dom.btnMobilePause?.addEventListener('click', () => {
      this.pauseGame();
    });

    // Hint Actions (Desktop & Mobile)
    this.dom.btnHint?.addEventListener('click', () => {
      this.triggerHint();
    });

    this.dom.btnMobileHint?.addEventListener('click', () => {
      this.triggerHint();
    });

    // Pause Modal actions
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.resumeGame();
    });

    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.closeModals();
      this.startCountdown(gameState.difficulty);
    });

    document.getElementById('btn-pause-home')?.addEventListener('click', () => {
      this.quitToHome();
    });

    // Results Screen actions
    document.getElementById('btn-results-play-again')?.addEventListener('click', () => {
      this.startCountdown(gameState.difficulty);
    });

    document.getElementById('btn-results-new-game')?.addEventListener('click', () => {
      this.showScreen('screen-difficulty');
    });

    document.getElementById('btn-results-leaderboard')?.addEventListener('click', () => {
      this.openStatsModal();
    });

    document.getElementById('btn-results-home')?.addEventListener('click', () => {
      this.showScreen('screen-home');
    });

    // Modal Close buttons
    document.querySelectorAll('.btn-modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModals();
      });
    });

    // Settings actions: Theme selection
    this.dom.btnThemeDark?.addEventListener('click', () => {
      this.applyTheme('dark');
    });

    this.dom.btnThemeLight?.addEventListener('click', () => {
      this.applyTheme('light');
    });

    // Settings actions: Music toggle
    this.dom.btnMusicOn?.addEventListener('click', () => {
      audio.setMusicEnabled(true);
      this.updateMusicUI(true);
    });

    this.dom.btnMusicOff?.addEventListener('click', () => {
      audio.setMusicEnabled(false);
      this.updateMusicUI(false);
    });

    // Settings actions: Sound Effects toggle
    this.dom.btnSoundOn?.addEventListener('click', () => {
      audio.setSoundEnabled(true);
      this.updateSoundUI(true);
    });

    this.dom.btnSoundOff?.addEventListener('click', () => {
      audio.setSoundEnabled(false);
      this.updateSoundUI(false);
    });

    // Settings actions: Volume Slider
    this.dom.volumeSlider?.addEventListener('input', (e) => {
      audio.setVolume(parseFloat(e.target.value));
    });
  }

  subscribeState() {
    gameState.subscribe((event, payload) => {
      if (event === 'numberFound') {
        this.onNumberFound(payload);
      } else if (event === 'hintUsed' || event === 'roundReset') {
        this.updateHintUI(payload.hintsRemaining);
      } else if (event === 'statusChange') {
        if (payload.newStatus === GameStatus.COMPLETED) {
          this.handleGameComplete();
        }
      }
    });
  }

  checkOrientation() {
    const isPortrait = window.innerHeight > window.innerWidth;
    this.isPortrait = isPortrait;
    document.body.classList.toggle('orientation-portrait', isPortrait);
    document.body.classList.toggle('orientation-landscape', !isPortrait);
    return isPortrait;
  }

  applyTheme(theme) {
    gameState.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    storage.setTheme(theme);

    if (this.dom.btnThemeDark) this.dom.btnThemeDark.classList.toggle('active', theme === 'dark');
    if (this.dom.btnThemeLight) this.dom.btnThemeLight.classList.toggle('active', theme === 'light');
  }

  updateMusicUI(isEnabled) {
    if (this.dom.btnMusicOn) this.dom.btnMusicOn.classList.toggle('active', isEnabled);
    if (this.dom.btnMusicOff) this.dom.btnMusicOff.classList.toggle('active', !isEnabled);
  }

  updateSoundUI(isEnabled) {
    if (this.dom.btnSoundOn) this.dom.btnSoundOn.classList.toggle('active', isEnabled);
    if (this.dom.btnSoundOff) this.dom.btnSoundOff.classList.toggle('active', !isEnabled);

    if (this.dom.btnMuteQuick) {
      this.dom.btnMuteQuick.classList.toggle('is-muted', !isEnabled);
      this.dom.btnMuteQuick.setAttribute('aria-label', isEnabled ? 'Mute Sound' : 'Unmute Sound');
      this.dom.btnMuteQuick.title = isEnabled ? 'Sound ON' : 'Sound OFF';
    }
  }

  updateHintUI(count = gameState.hintsRemaining) {
    if (this.dom.hudHintCount) {
      this.dom.hudHintCount.textContent = count;
    }
    if (this.dom.mobileHudHintCount) {
      this.dom.mobileHudHintCount.textContent = count;
    }
    const isExhausted = count <= 0;
    this.setHintDisabled(isExhausted || this.board?.isShuffling || gameState.status !== GameStatus.PLAYING);
    if (this.dom.btnHint) {
      this.dom.btnHint.classList.toggle('is-exhausted', isExhausted);
    }
    if (this.dom.btnMobileHint) {
      this.dom.btnMobileHint.classList.toggle('is-exhausted', isExhausted);
    }
  }

  setHintDisabled(disabled) {
    if (this.dom.btnHint) {
      this.dom.btnHint.disabled = disabled;
    }
    if (this.dom.btnMobileHint) {
      this.dom.btnMobileHint.disabled = disabled;
    }
  }

  triggerHint() {
    if (gameState.status !== GameStatus.PLAYING) return;
    if (!this.board || this.board.isShuffling || this.board.isInputLocked) return;
    if (gameState.hintsRemaining <= 0) return;
    if (this.board.activeHintItem) return;

    const used = gameState.useHint();
    if (used) {
      audio.playHint();
      this.board.highlightTargetHint(gameState.targetNumber, CONFIG.HINT_DURATION_MS);
      this.updateHintUI(gameState.hintsRemaining);
    }
  }

  showScreen(screenId) {
    Object.values(this.dom.screens).forEach(screen => {
      if (screen) screen.classList.remove('active-screen');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active-screen');
    }
    this.closeModals();
  }

  openModal(modalKey) {
    this.closeModals();
    const modal = this.dom.modals[modalKey];
    if (modal) {
      modal.classList.add('active-modal');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  closeModals() {
    Object.values(this.dom.modals).forEach(modal => {
      if (modal) {
        modal.classList.remove('active-modal');
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  async openStatsModal() {
    const easyBest = await storage.getBestTime('easy');
    const medBest = await storage.getBestTime('medium');
    const hardBest = await storage.getBestTime('hard');

    const fmt = (sec) => {
      if (sec === null) return '—';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const easyEl = document.getElementById('stat-best-easy');
    const medEl = document.getElementById('stat-best-medium');
    const hardEl = document.getElementById('stat-best-hard');

    if (easyEl) easyEl.textContent = fmt(easyBest);
    if (medEl) medEl.textContent = fmt(medBest);
    if (hardEl) hardEl.textContent = fmt(hardBest);

    this.openModal('leaderboard');
  }

  startCountdown(difficulty) {
    gameState.resetRound(difficulty);
    gameState.setStatus(GameStatus.COUNTDOWN);
    this.timer.reset();
    this.showScreen('screen-gameplay');
    this.closeModals();

    // Prepare board (reset found states and layout)
    this.board.cancelAnimation();
    this.board.setupNewGame(difficulty, this.isPortrait);

    // Update HUD display
    const diffConfig = CONFIG.DIFFICULTIES[difficulty];
    if (this.dom.hudDifficultyBadge) {
      this.dom.hudDifficultyBadge.textContent = diffConfig.name;
      this.dom.hudDifficultyBadge.className = `badge-difficulty ${diffConfig.badgeClass}`;
    }
    if (this.dom.hudTarget) this.dom.hudTarget.textContent = '1';
    if (this.dom.mobileHudTarget) this.dom.mobileHudTarget.textContent = '1';
    if (this.dom.hudTime) this.dom.hudTime.textContent = '00:00';
    if (this.dom.mobileHudTime) this.dom.mobileHudTime.textContent = '00:00';
    if (this.dom.hudFound) this.dom.hudFound.textContent = '0 / 100';
    this.updateHintUI(CONFIG.HINTS_PER_ROUND || 3);
    this.setHintDisabled(true);

    // Reset countdown presentation
    if (this.dom.countdownStage) {
      this.dom.countdownStage.classList.remove('is-go');
    }
    if (this.dom.countdownSubtext) this.dom.countdownSubtext.textContent = 'GET READY';
    if (this.dom.countdownHint) this.dom.countdownHint.textContent = 'FIND NUMBER 1';

    // Show countdown overlay
    if (this.dom.countdownOverlay) {
      this.dom.countdownOverlay.classList.add('active');
    }

    const triggerTickAnim = () => {
      if (this.dom.countdownText) {
        this.dom.countdownText.classList.remove('pop');
        void this.dom.countdownText.offsetWidth; // force reflow
        this.dom.countdownText.classList.add('pop');
      }
      if (this.dom.countdownRipple) {
        this.dom.countdownRipple.classList.remove('pulse');
        void this.dom.countdownRipple.offsetWidth; // force reflow
        this.dom.countdownRipple.classList.add('pulse');
      }
    };

    let count = CONFIG.COUNTDOWN_SECONDS;
    if (this.dom.countdownText) this.dom.countdownText.textContent = count;
    triggerTickAnim();
    audio.playCountdownTick();

    if (this.countdownTimerId) clearInterval(this.countdownTimerId);
    this.countdownTimerId = setInterval(() => {
      count--;
      if (count > 0) {
        if (this.dom.countdownText) this.dom.countdownText.textContent = count;
        triggerTickAnim();
        audio.playCountdownTick();
      } else if (count === 0) {
        if (this.dom.countdownStage) this.dom.countdownStage.classList.add('is-go');
        if (this.dom.countdownSubtext) this.dom.countdownSubtext.textContent = "LET'S GO!";
        if (this.dom.countdownHint) this.dom.countdownHint.textContent = "FIND NUMBER 1!";
        if (this.dom.countdownText) this.dom.countdownText.textContent = t('go');
        triggerTickAnim();
        audio.playCountdownGo();
      } else {
        clearInterval(this.countdownTimerId);
        this.countdownTimerId = null;
        if (this.dom.countdownOverlay) {
          this.dom.countdownOverlay.classList.remove('active');
        }
        if (this.dom.countdownStage) {
          this.dom.countdownStage.classList.remove('is-go');
        }
        this.startGameplay(difficulty);
      }
    }, 850);
  }

  startGameplay(difficulty) {
    gameState.setStatus(GameStatus.PLAYING);
    this.updateHintUI(CONFIG.HINTS_PER_ROUND || 3);

    this.timer.start();
    platform.gameplayStart();
    platform.reportGameCompletedPercentage(0);
  }

  handleNumberClick(clickedVal) {
    if (gameState.status !== GameStatus.PLAYING) return;
    if (this.board.isInputLocked || this.board.isShuffling) return;

    const isCorrect = gameState.recordClick(clickedVal);

    if (isCorrect) {
      audio.playCorrect(clickedVal);
    } else {
      // Wrong click: completely ignored with zero penalty/sound
      audio.playWrong();
    }
  }

  onNumberFound({ foundNumber, nextTarget, isCompleted }) {
    if (this.dom.hudFound) {
      this.dom.hudFound.textContent = `${foundNumber} / 100`;
    }

    // Platform progress reporting (CrazyGames SDK: 0 to 100%)
    // Report at milestone 50 so the SDK's 1000ms throttle is never active at completion
    if (foundNumber === 25 || foundNumber === 50) {
      platform.reportGameCompletedPercentage(foundNumber);
    }

    // Trigger Happytime on first find (number 1)
    if (foundNumber === 1) {
      platform.happytime();
    }

    // 1. Immediately permanently circle the found number
    this.board.markNumberFound(foundNumber);

    if (isCompleted) {
      // Number 100 found! Completion state reached, strictly NO shuffle after 100.
      return;
    }

    // 2. Update target HUD displays (upcoming target is NOT circled on board!)
    if (this.dom.hudTarget) {
      this.dom.hudTarget.textContent = nextTarget;
    }
    if (this.dom.mobileHudTarget) {
      this.dom.mobileHudTarget.textContent = nextTarget;
    }

    // 3. Shuffle board if difficulty requires (Medium / Hard)
    const diffConfig = CONFIG.DIFFICULTIES[gameState.difficulty];
    if (diffConfig.shuffleOnCorrect) {
      this.setHintDisabled(true);
      audio.playShuffle();
      gameState.incrementShuffles();
      this.board.shuffleAll(() => {
        this.setHintDisabled(gameState.hintsRemaining <= 0 || gameState.status !== GameStatus.PLAYING);
      });
    }
  }

  pauseGame() {
    if (gameState.status !== GameStatus.PLAYING) return;
    gameState.setStatus(GameStatus.PAUSED);
    this.timer.pause();
    this.board.clearHintHighlight();
    this.board.pauseAnimation();
    this.board.lockInput();
    this.setHintDisabled(true);
    audio.pauseMusic();
    this.openModal('pause');
  }

  resumeGame() {
    if (gameState.status !== GameStatus.PAUSED) return;
    this.closeModals();
    this.timer.resume();
    this.board.resumeAnimation();
    if (!this.board.isShuffling) {
      this.board.unlockInput();
      this.setHintDisabled(gameState.hintsRemaining <= 0);
    }
    audio.resumeMusic();
    gameState.setStatus(GameStatus.PLAYING);
  }

  quitToHome() {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    if (this.dom.countdownOverlay) {
      this.dom.countdownOverlay.classList.remove('active');
    }
    this.timer.stop();
    platform.gameplayStop();
    this.board.clearHintHighlight();
    this.board.cancelAnimation();
    this.setHintDisabled(true);
    audio.resumeMusic();
    gameState.setStatus(GameStatus.HOME);
    this.showScreen('screen-home');
  }

  async handleGameComplete() {
    this.board.clearHintHighlight();
    this.setHintDisabled(true);
    const elapsedSec = this.timer.stop();

    // 1. Report 100% game completion while gameplay session is active
    platform.reportGameCompletedPercentage(100);

    // 2. Submit leaderboard score to CrazyGames (score in milliseconds) while session is active
    platform.submitScore({ score: Math.round(elapsedSec * 1000) });

    // 3. Trigger celebration & audio
    platform.happytime();
    audio.playWin();

    // 4. Conclude active gameplay session cleanly after events have dispatched
    setTimeout(() => {
      platform.gameplayStop();
    }, 400);

    // Check personal best
    const isNewBest = await storage.setBestTime(gameState.difficulty, elapsedSec);

    // Populate Results Screen
    const formattedTime = this.timer.getFormattedTime();
    const bestSec = await storage.getBestTime(gameState.difficulty);
    let formattedBest = '—';
    if (bestSec !== null && typeof bestSec === 'number' && bestSec >= 1.0) {
      const m = Math.floor(bestSec / 60);
      const s = Math.floor(bestSec % 60);
      formattedBest = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    if (this.dom.resTime) this.dom.resTime.textContent = formattedTime;
    if (this.dom.resBestTime) this.dom.resBestTime.textContent = formattedBest;
    if (this.dom.resDifficulty) {
      this.dom.resDifficulty.textContent = CONFIG.DIFFICULTIES[gameState.difficulty].name;
      this.dom.resDifficulty.className = `badge-difficulty ${CONFIG.DIFFICULTIES[gameState.difficulty].badgeClass}`;
    }

    if (this.dom.resNewBestBadge) {
      this.dom.resNewBestBadge.style.display = isNewBest ? 'inline-block' : 'none';
    }

    if (this.dom.resFound) this.dom.resFound.textContent = '100 / 100';

    const hintsUsed = (CONFIG.HINTS_PER_ROUND || 3) - gameState.hintsRemaining;
    if (this.dom.resHints) this.dom.resHints.textContent = hintsUsed;

    if (this.dom.resShuffles) {
      if (gameState.difficulty === 'easy') {
        this.dom.resShuffles.textContent = '—';
      } else {
        this.dom.resShuffles.textContent = gameState.shufflesCount;
      }
    }

    this.showScreen('screen-results');
  }
}

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  window.gameApp = app;
  window.gameState = gameState;
  window.GameStatus = GameStatus;
  window.audio = audio;
  window.storage = storage;
  window.platform = platform;
  window.CONFIG = CONFIG;
  app.init();
});

