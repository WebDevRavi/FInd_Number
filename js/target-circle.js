/**
 * Find the Number - Hand-Drawn Organic Target Circle
 * Master Spec Locked Rule 12 & Section 86.
 * Creates an organic, non-geometric, hand-drawn pencil/chalk stroke encircling the target number.
 */

export class TargetCircle {
  constructor(boardElement) {
    this.board = boardElement;
    this.element = null;
    this.pathElement = null;
    this.createSVG();
  }

  createSVG() {
    // Create an overlay SVG element positioned over the board
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'target-circle-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '-32 -32 64 64');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';
    svg.style.overflow = 'visible';
    svg.style.width = '64px';
    svg.style.height = '64px';
    svg.style.transform = 'translate(-50%, -50%)';
    svg.style.transition = 'left 450ms cubic-bezier(0.34, 1.25, 0.64, 1), top 450ms cubic-bezier(0.34, 1.25, 0.64, 1)';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'target-circle-stroke');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    this.board.appendChild(svg);

    this.element = svg;
    this.pathElement = path;
  }

  // Generate an organic, slightly wobbly hand-drawn circle path
  generateHandDrawnPath(radius = 26) {
    // 8 points with gentle organic radial jitter and an overlapping sketch tail
    const numPoints = 10;
    const points = [];
    const seed = Math.random() * 10;

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / (numPoints - 1.5)) * Math.PI * 2;
      // organic wobble between -2.5px and +2.5px
      const wobble = (Math.sin(angle * 3 + seed) * 1.5) + (Math.cos(angle * 2) * 1.2);
      const r = radius + wobble;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      points.push({ x, y });
    }

    // Build smooth cubic bezier curve
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

  updatePosition(xPercent, yPercent, animate = false) {
    if (!this.element) return;

    if (!animate) {
      this.element.style.transition = 'none';
    } else {
      this.element.style.transition = 'left 450ms cubic-bezier(0.34, 1.25, 0.64, 1), top 450ms cubic-bezier(0.34, 1.25, 0.64, 1)';
    }

    // Update organic path every time target changes or updates to feel freshly sketched
    this.pathElement.setAttribute('d', this.generateHandDrawnPath(25));

    this.element.style.left = `${xPercent}%`;
    this.element.style.top = `${yPercent}%`;
    this.element.style.transform = 'translate(-50%, -50%)';

    if (!animate) {
      // Re-enable transition on next frame
      requestAnimationFrame(() => {
        if (this.element) {
          this.element.style.transition = 'left 450ms cubic-bezier(0.34, 1.25, 0.64, 1), top 450ms cubic-bezier(0.34, 1.25, 0.64, 1)';
        }
      });
    }
  }

  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  show() {
    if (this.element) {
      this.element.style.display = 'block';
    }
  }
}
