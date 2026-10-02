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

const formatSeconds = (sec) => {
  if (sec === null || sec === undefined || isNaN(sec) || sec <= 0) return '--:--';
  const totalSec = Math.floor(sec);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

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

    // 7. Populate Home Screen UI with progression & daily challenge
    await this.updateHomeUI();

    // 8. Stop platform loading & Show Home Screen
    platform.loadingStop();
    this.showScreen('screen-home');
  }

  cacheDOM() {
    // Screens
    this.dom.screens = {
      home: document.getElementById('screen-home'),
      difficulty: document.getElementById('screen-difficulty'),
      levels: document.getElementById('screen-levels'),
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

    // Home Screen elements
    this.dom.btnHomeQuickPlay = document.getElementById('btn-home-quickplay');
    this.dom.btnHeroLabel = document.getElementById('btn-hero-label');
    this.dom.btnHeroSub = document.getElementById('btn-hero-sub');
    this.dom.btnHomeDaily = document.getElementById('btn-home-daily');
    this.dom.homeDailyStatus = document.getElementById('home-daily-status');
    this.dom.homeDailyBadge = document.getElementById('home-daily-badge');
    this.dom.btnHomeCampaign = document.getElementById('btn-home-campaign');
    this.dom.homeStarsCount = document.getElementById('home-stars-count');
    this.dom.btnHomeClassic = document.getElementById('btn-home-classic');

    // Campaign Levels screen
    this.dom.btnLevelsBack = document.getElementById('btn-levels-back');
    this.dom.levelsHeaderStars = document.getElementById('levels-header-stars');
    this.dom.levelsGridContainer = document.getElementById('levels-grid-container');

    // Countdown Overlay
    this.dom.countdownOverlay = document.getElementById('countdown-overlay');
    this.dom.countdownStage = this.dom.countdownOverlay ? this.dom.countdownOverlay.querySelector('.countdown-stage') : null;
    this.dom.countdownSubtext = document.getElementById('countdown-subtext');
    this.dom.countdownRipple = document.getElementById('countdown-ripple');
    this.dom.countdownText = document.getElementById('countdown-text');
    this.dom.countdownHint = document.getElementById('countdown-hint');

    // Board & Combo Banner
    this.dom.boardContainer = document.getElementById('number-board');
    this.dom.comboBanner = document.getElementById('combo-banner');

    // HUD Elements
    this.dom.hudTarget = document.getElementById('hud-target-number');
    this.dom.hudTime = document.getElementById('hud-time');
    this.dom.hudFound = document.getElementById('hud-found');
    this.dom.hudDifficultyBadge = document.getElementById('hud-difficulty-badge');
    this.dom.hudStarGoal = document.getElementById('hud-star-goal');

    // Mobile HUD Elements
    this.dom.mobileHudTime = document.getElementById('mobile-hud-time');
    this.dom.mobileHudTarget = document.getElementById('mobile-hud-target');
    this.dom.mobileHudStarGoal = document.getElementById('mobile-hud-star-goal');
    this.dom.btnMobilePause = document.getElementById('btn-mobile-pause');

    // Results Elements
    this.dom.resTime = document.getElementById('res-time');
    this.dom.resBestTime = document.getElementById('res-best-time');
    this.dom.resDifficulty = document.getElementById('res-difficulty');
    this.dom.resModeLabel = document.getElementById('res-mode-label');
    this.dom.resNewBestBadge = document.getElementById('res-new-best-badge');
    this.dom.resFound = document.getElementById('res-found');
    this.dom.resCombo = document.getElementById('res-combo');
    this.dom.resHints = document.getElementById('res-hints');
    this.dom.resStars = [
      document.getElementById('res-star-1'),
      document.getElementById('res-star-2'),
      document.getElementById('res-star-3')
    ];
    this.dom.resDailyBanner = document.getElementById('results-daily-banner');
    this.dom.btnResultsNext = document.getElementById('btn-results-next');
    this.dom.btnResultsLevels = document.getElementById('btn-results-levels');
    this.dom.confettiCanvas = document.getElementById('confetti-canvas');

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
    this.dom.btnHomeQuickPlay?.addEventListener('click', async () => {
      const progress = await storage.getCampaignProgress();
      const lvl = progress.unlockedLevel || 1;
      const levelDef = CONFIG.CAMPAIGN_LEVELS[lvl - 1] || CONFIG.CAMPAIGN_LEVELS[0];
      this.startCountdown({
        gameMode: 'campaign',
        level: levelDef.level,
        totalNumbers: levelDef.totalNumbers,
        shuffle: levelDef.shuffle,
        rotate: levelDef.rotate
      });
    });

    this.dom.btnHomeDaily?.addEventListener('click', async () => {
      this.startCountdown({
        gameMode: 'daily',
        totalNumbers: CONFIG.DAILY_CHALLENGE.totalNumbers,
        shuffle: CONFIG.DAILY_CHALLENGE.shuffle,
        rotate: CONFIG.DAILY_CHALLENGE.rotate
      });
    });

    this.dom.btnHomeCampaign?.addEventListener('click', () => {
      this.renderCampaignLevelsScreen();
      this.showScreen('screen-levels');
    });

    this.dom.btnHomeClassic?.addEventListener('click', () => {
      this.showScreen('screen-difficulty');
    });

    this.dom.btnLevelsBack?.addEventListener('click', () => {
      this.updateHomeUI();
      this.showScreen('screen-home');
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
      this.updateHomeUI();
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
      this.restartCurrentRound();
    });

    document.getElementById('btn-pause-home')?.addEventListener('click', () => {
      this.quitToHome();
    });

    // Results Screen actions
    this.dom.btnResultsNext?.addEventListener('click', async () => {
      if (gameState.gameMode === 'campaign') {
        const nextLevelNum = gameState.currentLevel + 1;
        const nextDef = CONFIG.CAMPAIGN_LEVELS[nextLevelNum - 1];
        if (nextDef) {
          this.startCountdown({
            gameMode: 'campaign',
            level: nextDef.level,
            totalNumbers: nextDef.totalNumbers,
            shuffle: nextDef.shuffle,
            rotate: nextDef.rotate
          });
          return;
        }
      }
      this.updateHomeUI();
      this.showScreen('screen-home');
    });

    this.dom.btnResultsLevels?.addEventListener('click', () => {
      this.renderCampaignLevelsScreen();
      this.showScreen('screen-levels');
    });

    document.getElementById('btn-results-play-again')?.addEventListener('click', () => {
      this.restartCurrentRound();
    });

    document.getElementById('btn-results-leaderboard')?.addEventListener('click', () => {
      this.openStatsModal();
    });

    document.getElementById('btn-results-home')?.addEventListener('click', () => {
      this.updateHomeUI();
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
      if (sec === null || sec === undefined) return '—';
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

    // Campaign Stats
    try {
      const progress = await storage.getCampaignProgress();
      let totalStars = 0;
      Object.values(progress.stars || {}).forEach(s => {
        totalStars += Number(s) || 0;
      });
      const maxStars = (CONFIG.CAMPAIGN_LEVELS?.length || 20) * 3;
      const unlocked = progress.unlockedLevel || 1;
      const currentDef = CONFIG.CAMPAIGN_LEVELS[unlocked - 1] || CONFIG.CAMPAIGN_LEVELS[0];

      const campStarsEl = document.getElementById('stat-campaign-stars');
      const campLevelEl = document.getElementById('stat-campaign-level');
      if (campStarsEl) campStarsEl.textContent = `${totalStars} / ${maxStars} ⭐`;
      if (campLevelEl) campLevelEl.textContent = `Unlocked: Level ${unlocked} (${currentDef.name})`;
    } catch (e) {
      console.warn('Error loading campaign stats:', e);
    }

    // Daily Challenge Stats
    try {
      const dailyStatus = await storage.getDailyStatus();
      const dailyStreakEl = document.getElementById('stat-daily-streak');
      const dailyStatusEl = document.getElementById('stat-daily-status');
      if (dailyStreakEl) dailyStreakEl.textContent = `🔥 ${dailyStatus.streak || 0} Day${dailyStatus.streak === 1 ? '' : 's'}`;
      if (dailyStatusEl) {
        dailyStatusEl.textContent = dailyStatus.completedToday 
          ? 'Completed today! Come back tomorrow' 
          : 'Ready to play! Solve today\'s puzzle';
      }
    } catch (e) {
      console.warn('Error loading daily stats:', e);
    }

    this.openModal('leaderboard');
  }

  async updateHomeUI() {
    const progress = await storage.getCampaignProgress();
    const unlocked = progress.unlockedLevel || 1;
    const currentDef = CONFIG.CAMPAIGN_LEVELS[unlocked - 1] || CONFIG.CAMPAIGN_LEVELS[0];

    if (this.dom.btnHeroLabel) {
      this.dom.btnHeroLabel.textContent = `PLAY LEVEL ${currentDef.level}`;
    }
    if (this.dom.btnHeroSub) {
      this.dom.btnHeroSub.textContent = `${currentDef.name} · ${currentDef.totalNumbers} Numbers`;
    }

    let totalStars = 0;
    Object.values(progress.stars || {}).forEach(s => {
      totalStars += Number(s) || 0;
    });
    const maxStars = (CONFIG.CAMPAIGN_LEVELS?.length || 20) * 3;

    if (this.dom.homeStarsCount) {
      this.dom.homeStarsCount.textContent = `${totalStars} / ${maxStars} ⭐`;
    }
    if (this.dom.levelsHeaderStars) {
      this.dom.levelsHeaderStars.textContent = `⭐ ${totalStars} / ${maxStars}`;
    }

    // Daily Challenge status
    const daily = await storage.getDailyStatus();
    if (this.dom.homeDailyBadge) {
      this.dom.homeDailyBadge.textContent = `STREAK: ${daily.streak}`;
    }
    if (this.dom.homeDailyStatus) {
      this.dom.homeDailyStatus.textContent = daily.completedToday ? 'Completed Today! ✓' : 'Ready to Play';
    }
  }

  async renderCampaignLevelsScreen() {
    if (!this.dom.levelsGridContainer) return;
    const progress = await storage.getCampaignProgress();
    const unlockedLevel = progress.unlockedLevel || 1;
    const starsMap = progress.stars || {};
    const bestTimesMap = progress.bestTimes || {};

    this.dom.levelsGridContainer.innerHTML = '';

    CONFIG.CAMPAIGN_LEVELS.forEach(levelDef => {
      const isUnlocked = levelDef.level <= unlockedLevel;
      const starsEarned = starsMap[levelDef.level] || 0;
      const bestSec = bestTimesMap[levelDef.level];

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? '' : 'is-locked'}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', isUnlocked ? '0' : '-1');
      card.setAttribute('aria-label', `Level ${levelDef.level}: ${levelDef.name}`);

      card.innerHTML = `
        <div class="level-card-number">${levelDef.level}</div>
        <div class="level-card-target">1–${levelDef.totalNumbers}</div>
        <div class="level-card-name">${levelDef.name}</div>
        ${isUnlocked ? `
          <div class="level-card-stars">
            <span class="star-glyph ${starsEarned >= 1 ? 'active' : ''}">★</span>
            <span class="star-glyph ${starsEarned >= 2 ? 'active' : ''}">★</span>
            <span class="star-glyph ${starsEarned >= 3 ? 'active' : ''}">★</span>
          </div>
          <div class="level-card-best">${bestSec ? `⏱ ${formatSeconds(bestSec)}` : `3★ < ${levelDef.stars[0]}s`}</div>
        ` : `
          <div class="level-card-lock">🔒</div>
        `}
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.startCountdown({
            gameMode: 'campaign',
            level: levelDef.level,
            totalNumbers: levelDef.totalNumbers,
            shuffle: levelDef.shuffle,
            rotate: levelDef.rotate
          });
        });
      }

      this.dom.levelsGridContainer.appendChild(card);
    });
  }

  restartCurrentRound() {
    if (gameState.gameMode === 'campaign') {
      const levelDef = CONFIG.CAMPAIGN_LEVELS[gameState.currentLevel - 1] || CONFIG.CAMPAIGN_LEVELS[0];
      this.startCountdown({
        gameMode: 'campaign',
        level: levelDef.level,
        totalNumbers: levelDef.totalNumbers,
        shuffle: levelDef.shuffle,
        rotate: levelDef.rotate
      });
    } else if (gameState.gameMode === 'daily') {
      this.startCountdown({
        gameMode: 'daily',
        totalNumbers: CONFIG.DAILY_CHALLENGE.totalNumbers,
        shuffle: CONFIG.DAILY_CHALLENGE.shuffle,
        rotate: CONFIG.DAILY_CHALLENGE.rotate
      });
    } else {
      this.startCountdown(gameState.difficulty);
    }
  }

  startCountdown(options = 'medium') {
    gameState.resetRound(options);
    gameState.setStatus(GameStatus.COUNTDOWN);
    this.timer.reset();
    this.showScreen('screen-gameplay');
    this.closeModals();

    // Prepare board (reset found states, dynamic totalNumbers, and layout)
    this.board.cancelAnimation();
    this.board.setupNewGame(options, this.isPortrait);

    // Update HUD display
    let title = 'FIND THE NUMBER';
    let starGoalText = '';
    if (gameState.gameMode === 'campaign') {
      title = `LEVEL ${gameState.currentLevel}`;
      const levelDef = CONFIG.CAMPAIGN_LEVELS[gameState.currentLevel - 1];
      if (levelDef && levelDef.stars) {
        starGoalText = `3★ < ${levelDef.stars[0]}s`;
      }
    } else if (gameState.gameMode === 'daily') {
      title = 'DAILY HUNT';
    } else {
      title = CONFIG.DIFFICULTIES[gameState.difficulty]?.name || 'CLASSIC';
      const diffDef = CONFIG.DIFFICULTIES[gameState.difficulty];
      if (diffDef && diffDef.stars) {
        starGoalText = `3★ < ${diffDef.stars[0]}s`;
      }
    }

    if (this.dom.hudDifficultyBadge) {
      this.dom.hudDifficultyBadge.textContent = title;
      this.dom.hudDifficultyBadge.className = 'badge-difficulty badge-medium';
    }
    if (this.dom.hudStarGoal) {
      this.dom.hudStarGoal.textContent = starGoalText;
      this.dom.hudStarGoal.style.display = starGoalText ? 'inline-block' : 'none';
    }
    if (this.dom.mobileHudStarGoal) {
      this.dom.mobileHudStarGoal.textContent = starGoalText;
      this.dom.mobileHudStarGoal.style.display = starGoalText ? 'inline-block' : 'none';
    }
    if (this.dom.hudTarget) this.dom.hudTarget.textContent = '1';
    if (this.dom.mobileHudTarget) this.dom.mobileHudTarget.textContent = '1';
    if (this.dom.hudTime) this.dom.hudTime.textContent = '00:00';
    if (this.dom.mobileHudTime) this.dom.mobileHudTime.textContent = '00:00';
    if (this.dom.hudFound) this.dom.hudFound.textContent = `0 / ${gameState.totalNumbers}`;
    this.updateHintUI(CONFIG.HINTS_PER_ROUND || 3);
    this.setHintDisabled(true);

    // Snappy Countdown (Reduced friction, rapid engagement)
    if (this.dom.countdownStage) this.dom.countdownStage.classList.remove('is-go');
    if (this.dom.countdownSubtext) this.dom.countdownSubtext.textContent = 'READY?';
    if (this.dom.countdownHint) this.dom.countdownHint.textContent = 'FIND NUMBER 1';
    if (this.dom.countdownOverlay) this.dom.countdownOverlay.classList.add('active');

    const triggerTickAnim = () => {
      if (this.dom.countdownText) {
        this.dom.countdownText.classList.remove('pop');
        void this.dom.countdownText.offsetWidth;
        this.dom.countdownText.classList.add('pop');
      }
      if (this.dom.countdownRipple) {
        this.dom.countdownRipple.classList.remove('pulse');
        void this.dom.countdownRipple.offsetWidth;
        this.dom.countdownRipple.classList.add('pulse');
      }
    };

    let step = 2; // Snappy 2-stage countdown: 1 -> GO! (approx 1.2s total)
    if (this.dom.countdownText) this.dom.countdownText.textContent = '1';
    triggerTickAnim();
    audio.playCountdownTick();

    if (this.countdownTimerId) clearInterval(this.countdownTimerId);
    this.countdownTimerId = setInterval(() => {
      step--;
      if (step === 1) {
        if (this.dom.countdownStage) this.dom.countdownStage.classList.add('is-go');
        if (this.dom.countdownSubtext) this.dom.countdownSubtext.textContent = "LET'S GO!";
        if (this.dom.countdownText) this.dom.countdownText.textContent = t('go');
        triggerTickAnim();
        audio.playCountdownGo();
      } else {
        clearInterval(this.countdownTimerId);
        this.countdownTimerId = null;
        if (this.dom.countdownOverlay) this.dom.countdownOverlay.classList.remove('active');
        if (this.dom.countdownStage) this.dom.countdownStage.classList.remove('is-go');
        this.startGameplay();
      }
    }, 600);
  }

  startGameplay() {
    gameState.setStatus(GameStatus.PLAYING);
    this.updateHintUI(CONFIG.HINTS_PER_ROUND || 3);

    // If Level 1 or small board, gently pulse number 1 to guarantee instantaneous first tap!
    if (gameState.currentLevel === 1 || gameState.totalNumbers <= 15) {
      this.board.pulseOnboardingTarget(1);
    }

    this.timer.start();
    platform.gameplayStart();
    platform.reportGameCompletedPercentage(0);
  }

  handleNumberClick(clickedVal) {
    if (gameState.status !== GameStatus.PLAYING) return;
    if (this.board.isInputLocked || this.board.isShuffling) return;

    const isCorrect = gameState.recordClick(clickedVal);

    if (isCorrect) {
      audio.playCorrect(clickedVal, gameState.combo);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (e) {}
      }

      // Fast Find Combo Feedback
      if (gameState.combo >= 2 && this.dom.comboBanner) {
        this.dom.comboBanner.textContent = `${gameState.combo}x COMBO! 🔥`;
        this.dom.comboBanner.classList.add('active');
        if (this.comboBannerTimeout) clearTimeout(this.comboBannerTimeout);
        this.comboBannerTimeout = setTimeout(() => {
          if (this.dom.comboBanner) this.dom.comboBanner.classList.remove('active');
        }, 1200);
      }
    } else {
      audio.playWrong();
      this.board.triggerWrongNumber(clickedVal);
      const wrapper = document.querySelector('.board-wrapper');
      if (wrapper) {
        wrapper.classList.remove('screen-shake');
        void wrapper.offsetWidth;
        wrapper.classList.add('screen-shake');
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(25); } catch (e) {}
      }
      if (this.dom.comboBanner) {
        this.dom.comboBanner.classList.remove('active');
      }
    }
  }

  onNumberFound({ foundNumber, nextTarget, isCompleted, totalNumbers }) {
    const total = totalNumbers || gameState.totalNumbers || 100;
    if (this.dom.hudFound) {
      this.dom.hudFound.textContent = `${foundNumber} / ${total}`;
    }

    const pct = Math.round((foundNumber / total) * 100);
    if (foundNumber === 1 || pct === 50) {
      platform.reportGameCompletedPercentage(pct);
    }

    // Trigger Happytime on first find
    if (foundNumber === 1) {
      platform.happytime();
      this.board.clearOnboardingPulse();
    }

    // Permanently circle found number
    this.board.markNumberFound(foundNumber);

    if (isCompleted) {
      return;
    }

    if (this.dom.hudTarget) this.dom.hudTarget.textContent = nextTarget;
    if (this.dom.mobileHudTarget) this.dom.mobileHudTarget.textContent = nextTarget;

    // Board shuffle if enabled for this mode/level
    if (this.board.shuffleOnCorrect) {
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
    this.board.clearOnboardingPulse();
    this.board.cancelAnimation();
    this.setHintDisabled(true);
    audio.resumeMusic();
    gameState.setStatus(GameStatus.HOME);
    this.updateHomeUI();
    this.showScreen('screen-home');
  }

  async handleGameComplete() {
    this.board.clearHintHighlight();
    this.board.clearOnboardingPulse();
    this.setHintDisabled(true);
    const elapsedSec = this.timer.stop();

    platform.reportGameCompletedPercentage(100);
    platform.submitScore({ score: Math.round(elapsedSec * 1000) });
    platform.happytime();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([30, 50, 40]); } catch (e) {}
    }

    setTimeout(() => {
      platform.gameplayStop();
    }, 400);

    const formattedTime = this.timer.getFormattedTime();
    if (this.dom.resTime) this.dom.resTime.textContent = formattedTime;
    if (this.dom.resFound) this.dom.resFound.textContent = `${gameState.totalNumbers} / ${gameState.totalNumbers}`;
    if (this.dom.resCombo) this.dom.resCombo.textContent = `x${gameState.maxCombo || 1}`;

    const hintsUsed = (CONFIG.HINTS_PER_ROUND || 3) - gameState.hintsRemaining;
    if (this.dom.resHints) this.dom.resHints.textContent = hintsUsed;

    // Reset stars & daily banner display
    this.dom.resStars.forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.style.display = 'none';
      }
    });
    if (this.dom.resDailyBanner) this.dom.resDailyBanner.style.display = 'none';
    if (this.dom.resNewBestBadge) this.dom.resNewBestBadge.style.display = 'none';

    let starsEarned = 1;
    let isNewBestRecord = false;
    let bestTimeSec = elapsedSec;

    if (gameState.gameMode === 'campaign') {
      const levelDef = CONFIG.CAMPAIGN_LEVELS[gameState.currentLevel - 1];
      if (levelDef && levelDef.stars) {
        if (elapsedSec <= levelDef.stars[0]) starsEarned = 3;
        else if (elapsedSec <= levelDef.stars[1]) starsEarned = 2;
        else starsEarned = 1;
      }

      const saveRes = await storage.saveLevelResult(gameState.currentLevel, starsEarned, elapsedSec);
      isNewBestRecord = saveRes.isNewBestTime;
      bestTimeSec = saveRes.bestTime || elapsedSec;

      if (this.dom.resModeLabel) this.dom.resModeLabel.textContent = 'STAGE';
      if (this.dom.resDifficulty) {
        this.dom.resDifficulty.textContent = `LEVEL ${gameState.currentLevel}: ${levelDef?.name || ''}`;
      }

      // Next level button
      const hasNext = gameState.currentLevel < (CONFIG.CAMPAIGN_LEVELS?.length || 20);
      if (this.dom.btnResultsNext) {
        this.dom.btnResultsNext.style.display = hasNext ? 'inline-flex' : 'none';
        this.dom.btnResultsNext.textContent = `Next: Level ${gameState.currentLevel + 1} →`;
      }
      if (this.dom.btnResultsLevels) this.dom.btnResultsLevels.style.display = 'inline-flex';

    } else if (gameState.gameMode === 'daily') {
      starsEarned = 3;
      const dailyRes = await storage.completeDailyChallenge(elapsedSec);
      bestTimeSec = elapsedSec;

      if (this.dom.resModeLabel) this.dom.resModeLabel.textContent = 'DAILY HUNT';
      if (this.dom.resDifficulty) {
        this.dom.resDifficulty.textContent = "TODAY'S CHALLENGE";
      }

      if (this.dom.resDailyBanner) {
        this.dom.resDailyBanner.style.display = 'block';
        this.dom.resDailyBanner.textContent = `🔥 DAY ${dailyRes.streak} STREAK SECURED! COME BACK TOMORROW FOR DAY ${dailyRes.streak + 1}!`;
      }

      if (this.dom.btnResultsNext) this.dom.btnResultsNext.style.display = 'none';
      if (this.dom.btnResultsLevels) this.dom.btnResultsLevels.style.display = 'none';

    } else {
      // Classic mode
      const diffDef = CONFIG.DIFFICULTIES[gameState.difficulty];
      if (diffDef && diffDef.stars) {
        if (elapsedSec <= diffDef.stars[0]) starsEarned = 3;
        else if (elapsedSec <= diffDef.stars[1]) starsEarned = 2;
        else starsEarned = 1;
      }

      const bestRes = await storage.setBestTime(gameState.difficulty, elapsedSec);
      isNewBestRecord = bestRes.isNewBest;
      bestTimeSec = bestRes.bestTime || elapsedSec;

      if (this.dom.resModeLabel) this.dom.resModeLabel.textContent = 'MODE';
      if (this.dom.resDifficulty) {
        this.dom.resDifficulty.textContent = diffDef?.name || 'CLASSIC';
      }
      if (this.dom.btnResultsNext) this.dom.btnResultsNext.style.display = 'none';
      if (this.dom.btnResultsLevels) this.dom.btnResultsLevels.style.display = 'none';
    }

    // Update and animate Best Time display
    if (this.dom.resBestTime) {
      this.dom.resBestTime.textContent = formatSeconds(bestTimeSec);
      if (isNewBestRecord) {
        this.dom.resBestTime.classList.add('is-new-record');
      }
    }

    if (this.dom.resNewBestBadge) {
      this.dom.resNewBestBadge.style.display = isNewBestRecord ? 'inline-block' : 'none';
    }

    // Animate Stars sequentially
    this.dom.resStars.forEach((starEl, idx) => {
      if (!starEl) return;
      starEl.style.display = 'inline-block';
      if (idx < starsEarned) {
        setTimeout(() => {
          starEl.classList.add('active');
          audio.playStarPop(idx + 1);
        }, (idx + 1) * 220);
      }
    });

    if (isNewBestRecord) {
      audio.playNewBest();
    } else {
      audio.playLevelWin(starsEarned);
    }

    if (starsEarned === 3 || isNewBestRecord) {
      this.triggerConfetti();
    }

    await this.updateHomeUI();
    this.showScreen('screen-results');
  }

  /**
   * High-performance canvas confetti particle celebration.
   */
  triggerConfetti() {
    const canvas = this.dom.confettiCanvas;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#f3f4f6', '#d4af37'];
    const particles = [];
    const count = 55;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 140,
        y: canvas.height * 0.32 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 11 - 5,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    let startTime = performance.now();
    const duration = 2500;

    const animate = (now) => {
      const elapsed = now - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fadeProgress = Math.max(0, 1 - (elapsed / duration));

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.vx *= 0.98; // air drag
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * fadeProgress;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}

// Bootstrap once DOM is ready (handles both early and deferred loading on CDNs/Vercel)
function bootGame() {
  const app = new GameApp();
  window.gameApp = app;
  window.gameState = gameState;
  window.GameStatus = GameStatus;
  window.audio = audio;
  window.storage = storage;
  window.platform = platform;
  window.CONFIG = CONFIG;
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}

