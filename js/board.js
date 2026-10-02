/**
 * Find the Number - Board & Placement Engine
 * Handles 100-number generation, organic non-overlapping placement,
 * true frame-rate independent 600ms continuous A -> B shuffles,
 * full 0°-360° random rotations in Hard mode, input locking,
 * and permanent hand-drawn found circles that travel with their numbers.
 */

import { CONFIG } from './config.js';

/**
 * Smooth cubic ease-in-out curve
 * Starts gently, accelerates smoothly, settles cleanly without bounce.
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Calculates the shortest angular delta between two angles in degrees (-180° to +180°).
 * Prevents spinning 340° in the reverse direction when moving between e.g. 350° and 10°.
 */
function getShortestAngleDelta(startAngle, targetAngle) {
  return ((targetAngle - startAngle + 540) % 360) - 180;
}

/**
 * Generates an organic, slightly wobbly hand-drawn pencil/chalk circle path.
 * Centered at (0, 0) with radius ~23px inside a 64x64 viewBox (-32 -32 64 64).
 */
function generateHandDrawnCirclePath(radius = 23) {
  const numPoints = 10;
  const points = [];
  const seed = Math.random() * 20;

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / (numPoints - 1.5)) * Math.PI * 2;
    // Organic wobble between -2.2px and +2.2px
    const wobble = (Math.sin(angle * 3 + seed) * 1.4) + (Math.cos(angle * 2 + seed * 0.7) * 1.1);
    const r = radius + wobble;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    points.push({ x, y });
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  return d;
}

export class BoardManager {
  constructor(boardContainer, onNumberClick) {
    this.container = boardContainer;
    this.onNumberClick = onNumberClick;
    this.numbers = []; // number items { value, element, found, slotIndex, xPercent, yPercent, rotation, ... }
    this.slots = [];   // Array of slot positions { xPercent, yPercent }
    this.totalNumbers = CONFIG.TOTAL_NUMBERS || 100;
    this.isInputLocked = false;
    this.isShuffling = false;
    this.isAnimPaused = false;
    this.currentDifficulty = 'medium';
    this.shuffleOnCorrect = true;
    this.rotateOnShuffle = false;

    // Animation handles
    this.animFrameId = null;
    this.animIntervalId = null;
    this.animStartTime = 0;
    this.animPausedElapsed = 0;
    this.animDuration = CONFIG.SHUFFLE_DURATION_MS; // 500ms
    this.animOnComplete = null;
    this.animStep = null;

    // Hint handles
    this.activeHintItem = null;
    this.hintTimeoutId = null;

    this.initDOM(this.totalNumbers);
  }

  initDOM(totalNumbers = 100) {
    this.totalNumbers = totalNumbers;
    this.container.innerHTML = '';
    this.numbers = [];

    // Apply board size class based on number count for responsive typography & touch targets
    this.container.classList.remove('count-tiny', 'count-small', 'count-medium', 'count-large');
    if (totalNumbers <= 15) {
      this.container.classList.add('count-tiny');
    } else if (totalNumbers <= 30) {
      this.container.classList.add('count-small');
    } else if (totalNumbers <= 55) {
      this.container.classList.add('count-medium');
    } else {
      this.container.classList.add('count-large');
    }

    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= totalNumbers; i++) {
      const el = document.createElement('div');
      el.className = 'board-number';
      el.dataset.value = i;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Number ${i}`);

      // 1. Permanent hand-drawn found marker circle (SVG)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'found-circle-svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('viewBox', '-32 -32 64 64');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'found-circle-stroke');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('d', generateHandDrawnCirclePath(23));

      svg.appendChild(path);
      el.appendChild(svg);

      // 2. Internal text span for crisp typography
      const span = document.createElement('span');
      span.className = 'number-text';
      span.textContent = i;
      el.appendChild(span);

      // 3. Generous invisible hit target
      const hitArea = document.createElement('div');
      hitArea.className = 'number-hit-target';
      el.appendChild(hitArea);

      // Pointer event handler (touch & mouse)
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handlePointerClick(i);
      });

      // Keyboard accessibility (Space or Enter)
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handlePointerClick(i);
        }
      });

      this.numbers.push({
        value: i,
        element: el,
        svgCircle: svg,
        pathElement: path,
        slotIndex: i - 1,
        xPercent: 50,
        yPercent: 50,
        rotation: 0,
        found: false,
        startX: 50,
        startY: 50,
        startRot: 0,
        targetX: 50,
        targetY: 50,
        targetRot: 0,
        rotDelta: 0
      });

      fragment.appendChild(el);
    }

    this.container.appendChild(fragment);
  }

  handlePointerClick(numberVal) {
    if (this.isInputLocked || this.isShuffling) return;
    if (this.onNumberClick) {
      this.onNumberClick(numberVal);
    }
  }

  /**
   * Generates guaranteed non-overlapping organic slots
   * based on the board container's aspect ratio and the dynamic number count.
   * Small counts (10–30) enjoy expansive physical spacing and huge touch zones.
   */
  generateSlots(isPortrait = false) {
    const total = this.totalNumbers || 100;
    let cols, rows;

    if (total <= 12) {
      cols = isPortrait ? 3 : 4;
      rows = isPortrait ? 4 : 3;
    } else if (total <= 20) {
      cols = isPortrait ? 4 : 5;
      rows = isPortrait ? 5 : 4;
    } else if (total <= 35) {
      cols = isPortrait ? 5 : 7;
      rows = isPortrait ? 7 : 5;
    } else if (total <= 55) {
      cols = isPortrait ? 6 : 9;
      rows = isPortrait ? 9 : 6;
    } else if (total <= 75) {
      cols = isPortrait ? 7 : 11;
      rows = isPortrait ? 11 : 7;
    } else {
      cols = isPortrait ? 8 : 13;
      rows = isPortrait ? 13 : 8;
    }

    const padX = CONFIG.BOARD.PADDING_PERCENT;
    const padY = CONFIG.BOARD.PADDING_PERCENT;
    const usableW = 100 - (padX * 2);
    const usableH = 100 - (padY * 2);

    const cellW = usableW / cols;
    const cellH = usableH / rows;

    const candidateGrid = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        candidateGrid.push({ c, r });
      }
    }

    // Shuffle grid cells to pick slots randomly
    for (let i = candidateGrid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateGrid[i], candidateGrid[j]] = [candidateGrid[j], candidateGrid[i]];
    }

    const isDesktop = !isPortrait && window.innerWidth > 950 && window.innerHeight > 520;
    const pickedCells = candidateGrid.slice(0, total);

    const slots = pickedCells.map(({ c, r }) => {
      const jitterFactor = isDesktop ? (total <= 25 ? 0.4 : 0.6) : (isPortrait ? 0.28 : 0.32);
      const jitterX = (Math.random() - 0.5) * jitterFactor;
      const jitterY = (Math.random() - 0.5) * jitterFactor;

      const xPercent = padX + (c + 0.5 + jitterX) * cellW;
      const yPercent = padY + (r + 0.5 + jitterY) * cellH;

      return {
        xPercent: Math.max(padX, Math.min(100 - padX, xPercent)),
        yPercent: Math.max(padY, Math.min(100 - padY, yPercent))
      };
    });

    // Relaxation to eliminate crowding
    const baseMinDist = total <= 15 ? 18.0 : total <= 25 ? 12.0 : total <= 50 ? 8.0 : 5.5;

    if (isDesktop) {
      const minDistance = baseMinDist;
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const dx = slots[j].xPercent - slots[i].xPercent;
            const dy = slots[j].yPercent - slots[i].yPercent;
            const dist = Math.hypot(dx, dy);
            if (dist < minDistance && dist > 0.001) {
              const overlap = (minDistance - dist) / 2;
              const nx = (dx / dist) * overlap;
              const ny = (dy / dist) * overlap;

              slots[i].xPercent = Math.max(padX, Math.min(100 - padX, slots[i].xPercent - nx));
              slots[i].yPercent = Math.max(padY, Math.min(100 - padY, slots[i].yPercent - ny));
              slots[j].xPercent = Math.max(padX, Math.min(100 - padX, slots[j].xPercent + nx));
              slots[j].yPercent = Math.max(padY, Math.min(100 - padY, slots[j].yPercent + ny));
            }
          }
        }
      }
    } else {
      const boardW = this.container?.clientWidth || (isPortrait ? 380 : 800);
      const boardH = this.container?.clientHeight || (isPortrait ? 680 : 400);
      const aspect = Math.max(0.3, Math.min(3.0, boardW / boardH));

      const minDistanceNorm = total <= 15 ? 18.0 : total <= 25 ? 12.5 : total <= 50 ? 8.5 : (isPortrait ? 6.8 : 5.8);
      const passes = 4;

      for (let pass = 0; pass < passes; pass++) {
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const dxNorm = (slots[j].xPercent - slots[i].xPercent) * aspect;
            const dy = slots[j].yPercent - slots[i].yPercent;
            const dist = Math.hypot(dxNorm, dy);
            if (dist < minDistanceNorm && dist > 0.001) {
              const overlap = (minDistanceNorm - dist) / 2;
              const nx = ((dxNorm / dist) * overlap) / aspect;
              const ny = (dy / dist) * overlap;

              slots[i].xPercent = Math.max(padX, Math.min(100 - padX, slots[i].xPercent - nx));
              slots[i].yPercent = Math.max(padY, Math.min(100 - padY, slots[i].yPercent - ny));
              slots[j].xPercent = Math.max(padX, Math.min(100 - padX, slots[j].xPercent + nx));
              slots[j].yPercent = Math.max(padY, Math.min(100 - padY, slots[j].yPercent + ny));
            }
          }
        }
      }
    }

    this.slots = slots;
  }

  /**
   * Sets up a new round: generates slots, assigns initial positions,
   * resets found states and permanent circles.
   */
  setupNewGame(options = 'medium', isPortrait = false) {
    this.clearHintHighlight();
    this.cancelAnimation();
    this.unlockInput();

    let diff = 'medium';
    let total = 100;
    let shuffle = true;
    let rotate = false;

    if (typeof options === 'string') {
      diff = options;
      const diffCfg = CONFIG.DIFFICULTIES[diff];
      total = diffCfg?.totalNumbers || 100;
      shuffle = diffCfg?.shuffleOnCorrect ?? true;
      rotate = diffCfg?.rotateOnShuffle ?? false;
    } else if (typeof options === 'object') {
      diff = options.difficulty || 'medium';
      const diffCfg = CONFIG.DIFFICULTIES[diff];
      total = options.totalNumbers || diffCfg?.totalNumbers || 100;
      shuffle = options.shuffle !== undefined ? options.shuffle : (diffCfg?.shuffleOnCorrect ?? true);
      rotate = options.rotate !== undefined ? options.rotate : (diffCfg?.rotateOnShuffle ?? false);
    }

    this.currentDifficulty = diff;
    this.shuffleOnCorrect = shuffle;
    this.rotateOnShuffle = rotate;

    if (total !== this.totalNumbers || this.numbers.length !== total) {
      this.initDOM(total);
    }

    this.generateSlots(isPortrait);

    // Permute slot indices
    const slotIndices = Array.from({ length: this.totalNumbers }, (_, i) => i);
    for (let i = slotIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slotIndices[i], slotIndices[j]] = [slotIndices[j], slotIndices[i]];
    }

    // Apply positions immediately without transition
    this.numbers.forEach((item, idx) => {
      item.found = false;
      item.element.classList.remove('is-found', 'just-found', 'is-onboarding-pulse');

      const sIdx = slotIndices[idx];
      item.slotIndex = sIdx;
      item.xPercent = this.slots[sIdx].xPercent;
      item.yPercent = this.slots[sIdx].yPercent;
      item.rotation = 0;

      item.element.style.transition = 'none';
      item.element.style.left = `${item.xPercent}%`;
      item.element.style.top = `${item.yPercent}%`;
      item.element.style.transform = `translate(-50%, -50%) rotate(${item.rotation.toFixed(1)}deg)`;
    });
  }

  /**
   * Highlights target number with a gentle onboarding pulse for instant first-tap recognition.
   */
  pulseOnboardingTarget(value = 1) {
    const item = this.numbers.find(n => n.value === value);
    if (item && !item.found) {
      item.element.classList.add('is-onboarding-pulse');
    }
  }

  clearOnboardingPulse() {
    this.numbers.forEach(item => {
      item.element.classList.remove('is-onboarding-pulse');
    });
  }

  /**
   * Temporarily highlights the current unfound target number for assistance.
   * Does NOT click, does NOT advance target, does NOT create permanent circle.
   */
  highlightTargetHint(value, durationMs = 1200) {
    this.clearHintHighlight();
    const item = this.numbers.find(n => n.value === value);
    if (!item || item.found) return false;

    this.activeHintItem = item;
    item.element.classList.add('is-hint-spotlight');

    this.hintTimeoutId = setTimeout(() => {
      this.clearHintHighlight();
    }, durationMs);

    return true;
  }

  /**
   * Clears any active temporary hint highlight and its timer.
   */
  clearHintHighlight() {
    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = null;
    }
    if (this.activeHintItem) {
      if (this.activeHintItem.element) {
        this.activeHintItem.element.classList.remove('is-hint-spotlight');
      }
      this.activeHintItem = null;
    }
  }

  /**
   * Marks a number as permanently found.
   * Immediately displays its permanent hand-drawn circle.
   */
  markNumberFound(value) {
    this.clearHintHighlight();
    const item = this.numbers.find(n => n.value === value);
    if (item && !item.found) {
      item.found = true;
      item.element.classList.add('is-found', 'just-found');
      setTimeout(() => {
        if (item.element) {
          item.element.classList.remove('just-found');
        }
      }, 250);
    }
  }

  /**
   * Triggers visual feedback (shake/red flash) on wrong number tap.
   */
  triggerWrongNumber(value) {
    const item = this.numbers.find(n => n.value === value);
    if (item && !item.found) {
      item.element.classList.remove('is-wrong');
      void item.element.offsetWidth; // re-trigger CSS animation
      item.element.classList.add('is-wrong');
      setTimeout(() => {
        if (item.element) {
          item.element.classList.remove('is-wrong');
        }
      }, 350);
    }
  }

  /**
   * Continuous A -> B shuffle animation over 600ms.
   * Frame-rate independent: driven by elapsed time via performance.now().
   * Hybrid rAF + interval loop ensures smooth 60/120fps and prevents throttling.
   * Every number (including the found one) smoothly travels from its old (x,y,rot)
   * to its new (x,y,rot), with found circles traveling in perfect sync.
   * Input is strictly locked for the entire 600ms duration.
   */
  shuffleAll(onShuffleEnd = null) {
    this.clearHintHighlight();
    if (!this.shuffleOnCorrect) {
      if (onShuffleEnd) onShuffleEnd();
      return;
    }

    // Strictly cancel previous animation then lock board input
    this.cancelAnimation();
    this.lockInput();

    const count = this.numbers.length;
    const newSlotIndices = Array.from({ length: count }, (_, i) => i);
    for (let i = newSlotIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newSlotIndices[i], newSlotIndices[j]] = [newSlotIndices[j], newSlotIndices[i]];
    }

    const isRotate = this.rotateOnShuffle;

    // Capture start states (A) and calculate target states (B) for all numbers
    for (let i = 0; i < count; i++) {
      const item = this.numbers[i];
      const sIdx = newSlotIndices[i];
      item.slotIndex = sIdx;

      item.startX = item.xPercent;
      item.startY = item.yPercent;
      item.startRot = item.rotation;

      item.targetX = this.slots[sIdx].xPercent;
      item.targetY = this.slots[sIdx].yPercent;

      if (isRotate) {
        // Full random rotation 0° -> 360°
        item.targetRot = Math.random() * 360;
        item.rotDelta = getShortestAngleDelta(item.startRot, item.targetRot);
      } else {
        item.targetRot = 0;
        item.rotDelta = 0;
      }

      item.element.style.transition = 'none';
    }

    const boardW = this.container.clientWidth || 800;
    const boardH = this.container.clientHeight || 600;

    this.isShuffling = true;
    this.isAnimPaused = false;
    this.animStartTime = performance.now();
    this.animDuration = CONFIG.SHUFFLE_DURATION_MS; // 600ms
    this.animOnComplete = onShuffleEnd;

    const animateStep = () => {
      if (this.isAnimPaused || !this.isShuffling) return;

      const now = performance.now();
      const elapsed = now - this.animStartTime;
      const rawProgress = Math.min(1.0, Math.max(0.0, elapsed / this.animDuration));
      const eased = easeInOutCubic(rawProgress);

      for (let i = 0; i < this.numbers.length; i++) {
        const item = this.numbers[i];
        const deltaX_px = ((item.targetX - item.startX) / 100) * boardW * eased;
        const deltaY_px = ((item.targetY - item.startY) / 100) * boardH * eased;
        const curRot = item.startRot + item.rotDelta * eased;

        item.element.style.transform = `translate3d(${deltaX_px.toFixed(2)}px, ${deltaY_px.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg)`;
      }

      if (rawProgress < 1.0) {
        this.animFrameId = requestAnimationFrame(animateStep);
      } else {
        // Animation complete: guarantee exact landing on destination values
        const cb = this.animOnComplete;
        this.cancelAnimation();

        for (let i = 0; i < this.numbers.length; i++) {
          const item = this.numbers[i];
          item.xPercent = item.targetX;
          item.yPercent = item.targetY;
          item.rotation = item.targetRot;

          item.element.style.left = `${item.xPercent}%`;
          item.element.style.top = `${item.yPercent}%`;
          item.element.style.transform = `translate(-50%, -50%) rotate(${item.rotation.toFixed(1)}deg)`;
        }

        this.isShuffling = false;
        this.unlockInput();

        if (cb) {
          cb();
        }
      }
    };

    this.animStep = animateStep;
    this.animFrameId = requestAnimationFrame(animateStep);
  }

  pauseAnimation() {
    if (this.isShuffling && !this.isAnimPaused) {
      this.isAnimPaused = true;
      this.animPausedElapsed = performance.now() - this.animStartTime;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    }
  }

  resumeAnimation() {
    if (this.isShuffling && this.isAnimPaused) {
      this.isAnimPaused = false;
      this.animStartTime = performance.now() - (this.animPausedElapsed || 0);
      if (this.animStep) {
        this.animFrameId = requestAnimationFrame(this.animStep);
      }
    }
  }

  cancelAnimation() {
    this.clearHintHighlight();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isShuffling = false;
    this.isAnimPaused = false;
    this.animOnComplete = null;
    this.unlockInput();
  }

  lockInput() {
    this.isInputLocked = true;
    this.container.classList.add('input-locked');
  }

  unlockInput() {
    this.isInputLocked = false;
    this.container.classList.remove('input-locked');
  }

  resize(isPortrait) {
    if (this.isShuffling) {
      // Snap to destination immediately on resize
      for (let i = 0; i < this.numbers.length; i++) {
        const item = this.numbers[i];
        item.xPercent = item.targetX;
        item.yPercent = item.targetY;
        item.rotation = item.targetRot;
      }
      this.cancelAnimation();
      this.unlockInput();
    }

    this.generateSlots(isPortrait);
    this.numbers.forEach(item => {
      if (this.slots[item.slotIndex]) {
        item.xPercent = this.slots[item.slotIndex].xPercent;
        item.yPercent = this.slots[item.slotIndex].yPercent;
        item.element.style.left = `${item.xPercent}%`;
        item.element.style.top = `${item.yPercent}%`;
        item.element.style.transform = `translate(-50%, -50%) rotate(${item.rotation.toFixed(1)}deg)`;
      }
    });
  }
}
