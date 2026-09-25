/**
 * Find the Number - Tactile Audio System
 * Features:
 * - Centralized Music & SFX Channels with independent volume & toggles
 * - Seamless, calm, procedural ambient background music loop (sample-accurate AudioBuffer)
 * - Tactile, organic paper/wood button tap feedback with 40ms debounce
 * - Autoplay compliance & first-gesture unlock
 * - Strict CrazyGames platform mute priority
 * - Zero external dependencies / 100% offline & fast
 */

import { storage } from './storage.js';
import { platform } from './platform.js';
import { CONFIG } from './config.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.musicEnabled = true;
    this.soundEnabled = true;
    this.platformMuted = false;

    this.musicVolume = CONFIG.MUSIC_VOLUME || 0.45;
    this.sfxVolume = CONFIG.SFX_VOLUME || 0.95;
    this.masterVolume = 1.0;

    this.musicSource = null;
    this.musicBuffer = null;
    this.isMusicPlaying = false;

    this.lastClickTime = 0;
    this.initialized = false;
    this.unlocked = false;
  }

  async init() {
    this.musicEnabled = await storage.getMusicEnabled();
    this.soundEnabled = await storage.getSoundEnabled();
    const savedVol = await storage.getVolume();
    if (savedVol !== null && savedVol !== undefined) {
      this.masterVolume = savedVol;
    }

    // Platform-level initial mute state & listener (CrazyGames priority)
    this.platformMuted = platform.isMuted();
    platform.onMuteAudio((muted) => {
      this.platformMuted = muted;
      this.updateGains();
    });

    this.initialized = true;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain -> Destination
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      // Music Gain -> Master Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);

      // SFX Gain -> Master Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      this.updateGains();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  unlockAudio() {
    this.ensureContext();
    if (this.unlocked) return;
    this.unlocked = true;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.musicEnabled && !this.isMusicPlaying) {
          this.startMusic();
        }
      }).catch(() => {});
    } else {
      if (this.musicEnabled && !this.isMusicPlaying) {
        this.startMusic();
      }
    }
  }

  updateGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Master gain: 0 if platform muted, else scaled by masterVolume
    const effectiveMaster = this.platformMuted ? 0 : this.masterVolume;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(effectiveMaster, now);
    this.masterGain.gain.value = effectiveMaster;

    // Music gain: 0 if music disabled, else musicVolume
    const effectiveMusic = (!this.musicEnabled) ? 0 : this.musicVolume;
    this.musicGain.gain.setTargetAtTime(effectiveMusic, now, 0.08);

    // SFX gain: 0 if sound effects disabled, else sfxVolume
    const effectiveSfx = (!this.soundEnabled) ? 0 : this.sfxVolume;
    this.sfxGain.gain.setTargetAtTime(effectiveSfx, now, 0.04);
  }

  // ==================== BACKGROUND MUSIC ====================

  /**
   * Generates a calm, warm, procedural 16-second seamless music loop using OfflineAudioContext.
   * Stylized soft marimba / kalimba tones with warm tape-delay ambiance.
   */
  createProceduralMusicBuffer() {
    const sampleRate = 44100;
    const duration = 16.0; // 16 seconds loop (60 BPM, 4 bars of 4/4)
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, sampleRate * duration, sampleRate);

    // Master filter for warm chalkboard / paper acoustics
    const lpf = offlineCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 1400;
    lpf.Q.value = 0.7;
    lpf.connect(offlineCtx.destination);

    // Delay line for gentle spatial atmosphere
    const delay = offlineCtx.createDelay();
    delay.delayTime.value = 0.375; // Dotted 8th delay at 60 BPM
    const delayFeedback = offlineCtx.createGain();
    delayFeedback.gain.value = 0.32;
    const delayFilter = offlineCtx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 800;

    delay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(lpf);

    // Calm, minimalist pentatonic progression (Cmaj7 -> Am9 -> Fmaj7 -> Gsus4)
    // Notes in Hz
    const C3 = 130.81, E3 = 164.81, G3 = 196.00, B3 = 246.94;
    const A2 = 110.00, C4 = 261.63, E4 = 329.63, G4 = 392.00;
    const F2 = 87.31, A3 = 220.00, D4 = 293.66;
    const G2 = 98.00, D3 = 146.83;

    // Pattern of gentle plucks: [timeInSeconds, freq, velocity, pan]
    const notes = [
      // Bar 1: Cmaj9 atmosphere (0s - 4s)
      [0.0, C3, 0.25, -0.2],
      [0.0, G3, 0.20, 0.2],
      [0.75, E4, 0.28, 0.3],
      [1.5, B3, 0.22, -0.1],
      [2.25, D4, 0.26, 0.2],
      [3.0, G4, 0.20, -0.3],

      // Bar 2: Am9 (4s - 8s)
      [4.0, A2, 0.24, -0.2],
      [4.0, E3, 0.18, 0.2],
      [4.75, C4, 0.26, -0.2],
      [5.5, G4, 0.28, 0.3],
      [6.25, E4, 0.22, -0.1],
      [7.0, B3, 0.18, 0.2],

      // Bar 3: Fmaj7 (8s - 12s)
      [8.0, F2, 0.24, -0.2],
      [8.0, C3, 0.18, 0.1],
      [8.75, A3, 0.26, 0.2],
      [9.5, E4, 0.28, -0.3],
      [10.25, C4, 0.22, 0.1],
      [11.0, G3, 0.20, -0.2],

      // Bar 4: Gsus4 / Calm resolving transition (12s - 16s)
      [12.0, G2, 0.22, -0.2],
      [12.0, D3, 0.18, 0.2],
      [12.75, G3, 0.24, -0.1],
      [13.5, D4, 0.26, 0.2],
      [14.25, E4, 0.20, -0.2],
      [15.0, B3, 0.16, 0.1]
    ];

    notes.forEach(([startTime, freq, vel, panVal]) => {
      // Primary soft fundamental (warm sine)
      const osc = offlineCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle warm second harmonic (triangle)
      const osc2 = offlineCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      // Envelope: gentle attack, pleasant acoustic decay
      const env = offlineCtx.createGain();
      const decayTime = 1.4;
      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(vel * 0.90, startTime + 0.025);
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);
      env.gain.exponentialRampToValueAtTime(0.0001, startTime + decayTime);

      const panner = offlineCtx.createStereoPanner ? offlineCtx.createStereoPanner() : null;
      if (panner) {
        panner.pan.value = Math.max(-1, Math.min(1, panVal));
      }

      osc.connect(env);
      osc2.connect(env);

      if (panner) {
        env.connect(panner);
        panner.connect(lpf);
        panner.connect(delay);
      } else {
        env.connect(lpf);
        env.connect(delay);
      }

      osc.start(startTime);
      osc.stop(startTime + decayTime);
      osc2.start(startTime);
      osc2.stop(startTime + decayTime);
    });

    return offlineCtx.startRendering();
  }

  async startMusic() {
    this.ensureContext();
    if (!this.ctx || this.isMusicPlaying || !this.musicEnabled) return;

    try {
      if (!this.musicBuffer) {
        this.musicBuffer = await this.createProceduralMusicBuffer();
      }

      this.musicSource = this.ctx.createBufferSource();
      this.musicSource.buffer = this.musicBuffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGain);

      this.musicSource.start(0);
      this.isMusicPlaying = true;
    } catch (e) {
      console.warn('[Audio] Music start skipped or delayed:', e);
      this.isMusicPlaying = false;
    }
  }

  stopMusic() {
    if (this.musicSource && this.isMusicPlaying) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch {}
      this.musicSource = null;
      this.isMusicPlaying = false;
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    storage.setMusicEnabled(enabled);

    if (enabled) {
      if (!this.isMusicPlaying && this.unlocked) {
        this.startMusic();
      }
    }
    this.updateGains();
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
    storage.setSoundEnabled(enabled);
    this.updateGains();
  }

  setVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    storage.setVolume(this.masterVolume);
    this.updateGains();
  }

  /**
   * Temporarily ducks background music during countdown or victory fanfare
   */
  duckMusic(targetRatio = 0.25, duration = 1.0) {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
    const now = this.ctx.currentTime;
    const normalVol = this.musicVolume;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(normalVol * targetRatio, now + 0.15);
    this.musicGain.gain.setTargetAtTime(normalVol, now + duration, 0.4);
  }

  pauseMusic() {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(0, now, 0.1);
  }

  resumeMusic() {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicVolume, now, 0.2);
  }

  // ==================== SOUND EFFECTS (SFX) ====================

  /**
   * Short, subtle tactile click/tap for all UI buttons.
   * Debounced at 40ms to avoid machine-gunning or duplicate pointerdown/click events.
   */
  playClick() {
    if (!this.soundEnabled || this.platformMuted) return;

    const nowMs = performance.now();
    if (nowMs - this.lastClickTime < 40) return;
    this.lastClickTime = nowMs;

    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Soft mechanical/wood tactile click
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.035);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Pleasant crisp pencil checkmark / chime for correct number found
   */
  playCorrect(currentNumber = 1) {
    if (!this.soundEnabled || this.platformMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 440 + Math.min(currentNumber * 4, 400);

    // Primary bell tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, t + 0.12);

    gain.gain.setValueAtTime(0.75, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);

    // Tactile acoustic pencil strike harmonic
    const noiseOsc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noiseOsc.type = 'triangle';
    noiseOsc.frequency.setValueAtTime(baseFreq * 2.5, t);
    noiseGain.gain.setValueAtTime(0.28, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noiseOsc.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseOsc.start(t);
    noiseOsc.stop(t + 0.06);
  }

  /**
   * Strictly NO SOUND for wrong clicks per Master Spec Section 124 & Locked Rule 4.
   */
  playWrong() {
    // Intentionally zero sound / no-op
  }

  /**
   * Subtle tactile hint chime when player activates a hint.
   * Short, warm, crisp (180ms), respects soundEnabled and platformMuted.
   */
  playHint() {
    if (!this.soundEnabled || this.platformMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12); // A5 harmonic

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Organic paper flutter / shuffle sound for Medium/Hard shuffles
   */
  playShuffle() {
    if (!this.soundEnabled || this.platformMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.32;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(450, t + 0.25);
    filter.Q.setValueAtTime(1.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(t);
  }

  // Countdown tick
  playCountdownTick() {
    if (!this.soundEnabled || this.platformMuted) return;
    this.duckMusic(0.5, 0.4);
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Countdown GO!
  playCountdownGo() {
    if (!this.soundEnabled || this.platformMuted) return;
    this.duckMusic(0.4, 0.6);
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // Rewarding, warm victory fanfare for completion of all 100 numbers
  playWin() {
    if (!this.soundEnabled || this.platformMuted) return;
    this.duckMusic(0.2, 1.8);
    this.ensureContext();
    if (!this.ctx) return;

    const chords = [523.25, 659.25, 783.99, 1046.50];
    chords.forEach((freq, idx) => {
      const delay = idx * 0.12;
      const t = this.ctx.currentTime + delay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.75, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }
}

export const audio = new AudioManager();

