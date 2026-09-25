/**
 * Find the Number - High-Precision Monotonic Timer
 * Master Spec Section 60-63.
 */

export class GameTimer {
  constructor(onTick = null) {
    this.onTick = onTick;
    this.accumulatedMs = 0;
    this.startTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.rafId = null;
  }

  start() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.loop();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.accumulatedMs += performance.now() - this.startTime;
    this.isPaused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.startTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.isRunning && !this.isPaused) {
      this.accumulatedMs += performance.now() - this.startTime;
    }
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    return this.getElapsedSeconds();
  }

  reset() {
    this.accumulatedMs = 0;
    this.startTime = 0;
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getElapsedMs() {
    if (!this.isRunning) return this.accumulatedMs;
    if (this.isPaused) return this.accumulatedMs;
    return this.accumulatedMs + (performance.now() - this.startTime);
  }

  getElapsedSeconds() {
    return this.getElapsedMs() / 1000;
  }

  getFormattedTime() {
    const totalSec = Math.floor(this.getElapsedSeconds());
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  getFormattedResultTime() {
    const totalMs = this.getElapsedMs();
    const totalSec = Math.floor(totalMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const hundredths = Math.floor((totalMs % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  loop() {
    if (!this.isRunning || this.isPaused) return;

    if (this.onTick) {
      this.onTick(this.getFormattedTime(), this.getElapsedSeconds());
    }

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
