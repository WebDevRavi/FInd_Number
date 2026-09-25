/**
 * Find the Number - CrazyGames SDK v3 Platform Adapter
 * Strictly adheres to CrazyGames Master Spec: Section 02, 04, 05, 06, 07, 08, 11, 15.
 * Implements full CrazyGames SDK v3 surface: Game, User, Data, Analytics, and Basic Launch Ads/Banners.
 */

class PlatformAdapter {
  constructor() {
    this.isSDKAvailable = false;
    this.sdk = null;
    this.isGameplayActive = false;
    this.audioMuteCallbacks = [];
    this.authListeners = [];
    this.roomJoinListeners = [];
  }

  _withTimeout(promise, ms = 2000, errorMsg = 'Operation timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
    ]);
  }

  async init() {
    try {
      if (typeof window !== 'undefined' && window.CrazyGames && window.CrazyGames.SDK) {
        this.sdk = window.CrazyGames.SDK;
        await this._withTimeout(this.sdk.init(), 2000, 'CrazyGames SDK init timed out (fallback to offline/standalone mode)');
        this.isSDKAvailable = true;
        console.log('[Platform] CrazyGames SDK v3 initialized successfully.');
        this.loadingStart();

        // 1. Check initial audio mute state from settings
        const initialMute = this.isMuted();
        if (initialMute) {
          console.log('[Platform] Initial audio mute state:', initialMute);
          this.audioMuteCallbacks.forEach(cb => cb(true));
        }

        // 2. Setup audio mute listener via addSettingsChangeListener if supported
        if (this.sdk.game && typeof this.sdk.game.addSettingsChangeListener === 'function') {
          this.sdk.game.addSettingsChangeListener((settings) => {
            if (settings && typeof settings.muteAudio === 'boolean') {
              console.log('[Platform] Platform audio mute triggered:', settings.muteAudio);
              this.audioMuteCallbacks.forEach(cb => cb(settings.muteAudio));
            }
          });
        } else if (this.sdk.game && typeof this.sdk.game.onMuteAudio === 'function') {
          this.sdk.game.onMuteAudio((isMuted) => {
            console.log('[Platform] Platform audio mute triggered (legacy):', isMuted);
            this.audioMuteCallbacks.forEach(cb => cb(isMuted));
          });
        }
      } else {
        console.info('[Platform] CrazyGames SDK not detected. Operating in safe standalone/mock mode.');
      }
    } catch (err) {
      console.warn('[Platform] CrazyGames SDK init error, continuing in offline mode:', err);
      this.isSDKAvailable = false;
    }
  }

  // ==================== AUDIO MUTE SUPPORT ====================

  isMuted() {
    if (this.isSDKAvailable && this.sdk?.game?.settings) {
      return Boolean(this.sdk.game.settings.muteAudio);
    }
    return false;
  }

  onMuteAudio(callback) {
    if (typeof callback === 'function') {
      this.audioMuteCallbacks.push(callback);
    }
  }

  _broadcastGFEvent(event, data = {}) {
    if (typeof window === 'undefined') return;
    const msg = { type: 'GFEvent', event, ...data };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
      if (window.top && window.top !== window && window.top !== window.parent) {
        window.top.postMessage(msg, '*');
      }
    } catch (e) {
      // Cross-origin message safety
    }
  }

  // ==================== GAME MODULE ====================

  loadingStart() {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.loadingStart) {
        this.sdk.game.loadingStart();
      }
    } catch (e) {
      console.warn('[Platform] loadingStart failed:', e);
    }
    this._broadcastGFEvent('sdkGameLoadingStart');
  }

  loadingStop() {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.loadingStop) {
        this.sdk.game.loadingStop();
      }
    } catch (e) {
      console.warn('[Platform] loadingStop failed:', e);
    }
    this._broadcastGFEvent('sdkGameLoadingStop');
  }

  gameplayStart() {
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;
    try {
      if (this.isSDKAvailable && this.sdk?.game?.gameplayStart) {
        this.sdk.game.gameplayStart();
      }
      console.log('[Platform] gameplayStart triggered.');
    } catch (e) {
      console.warn('[Platform] gameplayStart failed:', e);
    }
    this._broadcastGFEvent('gameplayStart');
  }

  gameplayStop() {
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;
    try {
      if (this.isSDKAvailable && this.sdk?.game?.gameplayStop) {
        this.sdk.game.gameplayStop();
      }
      console.log('[Platform] gameplayStop triggered.');
    } catch (e) {
      console.warn('[Platform] gameplayStop failed:', e);
    }
    this._broadcastGFEvent('gameplayStop');
  }

  happytime() {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.happytime) {
        this.sdk.game.happytime();
      }
    } catch (e) {
      console.warn('[Platform] happytime failed:', e);
    }
    this._broadcastGFEvent('happytime');
  }

  reportGameCompletedPercentage(percentage) {
    const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
    try {
      if (this.isSDKAvailable && this.sdk?.game?.reportGameCompletedPercentage) {
        this.sdk.game.reportGameCompletedPercentage(clamped);
      }
      console.log('[Platform] reportGameCompletedPercentage reported:', clamped);
    } catch (e) {
      console.warn('[Platform] reportGameCompletedPercentage failed:', e);
    }
    this._broadcastGFEvent('reportGameCompletedPercentage', { percentage: clamped });
  }

  gameComplete() {
    this.reportGameCompletedPercentage(100);
    console.log('[Platform] gameComplete reported.');
  }


  inviteLink(params = {}) {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.inviteLink) {
        return this.sdk.game.inviteLink(params);
      }
    } catch (e) {
      console.warn('[Platform] inviteLink failed:', e);
    }
    return window.location.href;
  }

  updateRoom(roomId) {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.updateRoom) {
        this.sdk.game.updateRoom(roomId);
      }
    } catch (e) {
      console.warn('[Platform] updateRoom failed:', e);
    }
  }

  addJoinRoomListener(callback) {
    if (typeof callback !== 'function') return;
    this.roomJoinListeners.push(callback);
    try {
      if (this.isSDKAvailable && this.sdk?.game?.addJoinRoomListener) {
        this.sdk.game.addJoinRoomListener(callback);
      }
    } catch (e) {
      console.warn('[Platform] addJoinRoomListener failed:', e);
    }
  }

  removeJoinRoomListener(callback) {
    this.roomJoinListeners = this.roomJoinListeners.filter(cb => cb !== callback);
    try {
      if (this.isSDKAvailable && this.sdk?.game?.removeJoinRoomListener) {
        this.sdk.game.removeJoinRoomListener(callback);
      }
    } catch (e) {
      console.warn('[Platform] removeJoinRoomListener failed:', e);
    }
  }

  // Deprecated stubs for SDK compatibility
  showInviteButton(params = {}) {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.showInviteButton) {
        return this.sdk.game.showInviteButton(params);
      }
    } catch (e) {
      console.warn('[Platform] showInviteButton (deprecated) failed:', e);
    }
    return null;
  }

  hideInviteButton() {
    try {
      if (this.isSDKAvailable && this.sdk?.game?.hideInviteButton) {
        this.sdk.game.hideInviteButton();
      }
    } catch (e) {
      console.warn('[Platform] hideInviteButton (deprecated) failed:', e);
    }
  }

  // ==================== USER & LEADERBOARD MODULE ====================

  async getUser() {
    try {
      if (this.isSDKAvailable && this.sdk?.user?.getUser) {
        return await this._withTimeout(this.sdk.user.getUser(), 1500, 'getUser timed out');
      }
    } catch (e) {
      console.warn('[Platform] getUser failed:', e);
    }
    return null;
  }

  async getUserToken() {
    try {
      if (this.isSDKAvailable && this.sdk?.user?.getUserToken) {
        return await this.sdk.user.getUserToken();
      }
    } catch (e) {
      console.warn('[Platform] getUserToken failed:', e);
    }
    return null;
  }

  async getXsollaUserToken() {
    try {
      if (this.isSDKAvailable && this.sdk?.user?.getXsollaUserToken) {
        return await this.sdk.user.getXsollaUserToken();
      }
    } catch (e) {
      console.warn('[Platform] getXsollaUserToken failed:', e);
    }
    return null;
  }

  async showAuthPrompt() {
    try {
      if (this.isSDKAvailable && this.sdk?.user?.showAuthPrompt) {
        return await this.sdk.user.showAuthPrompt();
      }
    } catch (e) {
      console.warn('[Platform] showAuthPrompt failed:', e);
    }
    return null;
  }

  async showAccountLinkPrompt() {
    try {
      if (this.isSDKAvailable && this.sdk?.user?.showAccountLinkPrompt) {
        return await this.sdk.user.showAccountLinkPrompt();
      }
    } catch (e) {
      console.warn('[Platform] showAccountLinkPrompt failed:', e);
    }
    return null;
  }

  addAuthListener(callback) {
    if (typeof callback !== 'function') return;
    this.authListeners.push(callback);
    try {
      if (this.isSDKAvailable && this.sdk?.user?.addAuthListener) {
        this.sdk.user.addAuthListener(callback);
      }
    } catch (e) {
      console.warn('[Platform] addAuthListener failed:', e);
    }
  }

  removeAuthListener(callback) {
    this.authListeners = this.authListeners.filter(cb => cb !== callback);
    try {
      if (this.isSDKAvailable && this.sdk?.user?.removeAuthListener) {
        this.sdk.user.removeAuthListener(callback);
      }
    } catch (e) {
      console.warn('[Platform] removeAuthListener failed:', e);
    }
  }

  submitScore(scoreInput) {
    const scoreVal = typeof scoreInput === 'number' ? scoreInput : (scoreInput?.score || 0);
    const payload = { score: Math.round(Number(scoreVal)) };
    try {
      if (this.isSDKAvailable && this.sdk?.user?.submitScore) {
        this.sdk.user.submitScore(payload);
      } else if (this.isSDKAvailable && this.sdk?.user?.addScore) {
        this.sdk.user.addScore(payload);
      }
      console.log('[Platform] submitScore recorded:', payload);
    } catch (e) {
      console.warn('[Platform] submitScore failed:', e);
    }
    this._broadcastGFEvent('submitScore', payload);
  }

  // ==================== DATA MODULE ====================

  async getItem(key) {
    try {
      if (this.isSDKAvailable && this.sdk?.data?.getItem) {
        return await this._withTimeout(this.sdk.data.getItem(key), 1500, 'data.getItem timed out');
      }
    } catch (e) {
      console.warn('[Platform] data.getItem failed:', e);
    }
    return null;
  }

  async setItem(key, value) {
    try {
      if (this.isSDKAvailable && this.sdk?.data?.setItem) {
        await this.sdk.data.setItem(key, value);
      }
    } catch (e) {
      console.warn('[Platform] data.setItem failed:', e);
    }
  }

  async removeItem(key) {
    try {
      if (this.isSDKAvailable && this.sdk?.data?.removeItem) {
        await this.sdk.data.removeItem(key);
      }
    } catch (e) {
      console.warn('[Platform] data.removeItem failed:', e);
    }
  }

  async clearData() {
    try {
      if (this.isSDKAvailable && this.sdk?.data?.clear) {
        await this.sdk.data.clear();
      }
    } catch (e) {
      console.warn('[Platform] data.clear failed:', e);
    }
  }

  // ==================== ANALYTICS MODULE ====================

  trackOrder(provider, order) {
    try {
      if (this.isSDKAvailable && this.sdk?.analytics?.trackOrder) {
        this.sdk.analytics.trackOrder(provider, order);
        console.log('[Platform] trackOrder sent:', { provider, order });
      }
    } catch (e) {
      console.warn('[Platform] trackOrder failed:', e);
    }
  }

  // ==================== AD & BANNER MODULES ====================
  // Per CrazyGames Basic Launch requirements: Ads and Banners are safely disabled.

  requestMidgameAd() {
    console.info('[Platform] Midgame ad disabled for Basic Launch.');
    return Promise.resolve();
  }

  requestRewardedAd() {
    console.info('[Platform] Rewarded ad disabled for Basic Launch.');
    return Promise.resolve();
  }

  requestBanner(options = {}) {
    console.info('[Platform] Banner ad disabled for Basic Launch.');
    return Promise.resolve();
  }

  requestResponsiveBanner(options = {}) {
    console.info('[Platform] Responsive banner ad disabled for Basic Launch.');
    return Promise.resolve();
  }

  clearBanner(containerId) {
    console.info('[Platform] Clear banner disabled for Basic Launch.');
  }

  clearAllBanners() {
    console.info('[Platform] Clear all banners disabled for Basic Launch.');
  }
}

export const platform = new PlatformAdapter();
