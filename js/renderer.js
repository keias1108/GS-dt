/**
 * Renderer - Handles canvas rendering and visualization
 * Supports multiple view modes: V (pattern), U, dt (timestep map), E (energy map)
 */

import { GRID_CONFIG, TILE_CONFIG } from './config.js';

export class Renderer {
  constructor(canvasId) {
    const { W, H, N } = GRID_CONFIG;
    this.W = W;
    this.H = H;
    this.N = N;

    // Canvas setup
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    // Offscreen image for rendering
    this.img = this.ctx.createImageData(W, H);
    this.pix = this.img.data;

    // Persistent offscreen canvas (avoid creating new canvas every frame)
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = W;
    this.offscreen.height = H;
    this.offscreenCtx = this.offscreen.getContext('2d', { alpha: false });

    // Tile mode state
    this.tileMode = false;

    // Setup resize handling
    this.resizeHandler = () => this.resize();
    this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  /**
   * Resize canvas to match CSS dimensions at device pixel ratio
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
  }

  /**
   * Set tile mode (8×4 grid display)
   * @param {boolean} enabled - Whether to enable tile mode
   */
  setTileMode(enabled) {
    this.tileMode = enabled;
    this.resize();
  }

  /**
   * Cleanup method to remove event listeners
   */
  dispose() {
    window.removeEventListener('resize', this.resizeHandler);
  }

  /**
   * Utility: Clamp value between min and max
   */
  clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
  }

  /**
   * Render the simulation state to canvas
   * @param {SimulationState} state - The simulation state
   * @param {string} viewMode - One of: 'V', 'U', 'dt', 'E'
   */
  render(state, viewMode) {
    const { U0, V0, dtMap, Eema } = state;
    const N = this.N;

    // For dt and E views, find min/max for normalization (optimized with conditionals)
    let vMin = 0;
    let vMax = 1;

    if (viewMode === 'dt') {
      vMin = dtMap[0];
      vMax = dtMap[0];
      for (let i = 1; i < N; i++) {
        const val = dtMap[i];
        if (val < vMin) vMin = val;
        if (val > vMax) vMax = val;
      }
      if (!(vMax > vMin)) {
        vMin = 0;
        vMax = 1;
      }
    } else if (viewMode === 'E') {
      vMin = Eema[0];
      vMax = Eema[0];
      for (let i = 1; i < N; i++) {
        const val = Eema[i];
        if (val < vMin) vMin = val;
        if (val > vMax) vMax = val;
      }
      if (!(vMax > vMin)) {
        vMin = 0;
        vMax = 1;
      }
    }

    // Fill pixel data based on view mode
    for (let i = 0; i < N; i++) {
      let v = 0;

      if (viewMode === 'V') {
        v = V0[i];
      } else if (viewMode === 'U') {
        v = U0[i];
      } else if (viewMode === 'dt') {
        const range = vMax - vMin;
        v = range > 1e-10 ? (dtMap[i] - vMin) / range : 0;
      } else if (viewMode === 'E') {
        const range = vMax - vMin;
        v = range > 1e-10 ? (Eema[i] - vMin) / range : 0;
      }

      v = this.clamp(v, 0, 1);

      // Simple perceptual-ish mapping: grayscale
      const c = Math.floor(v * 255);
      const p = i * 4;
      this.pix[p] = c;
      this.pix[p + 1] = c;
      this.pix[p + 2] = c;
      this.pix[p + 3] = 255;
    }

    // Draw scaled to canvas with nearest-neighbor interpolation
    // Reuse persistent offscreen canvas (no per-frame allocation)
    this.offscreenCtx.putImageData(this.img, 0, 0);

    this.ctx.imageSmoothingEnabled = false;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    this.ctx.clearRect(0, 0, cw, ch);

    if (this.tileMode) {
      // Tile mode: Draw 8×4 grid of tiles
      const tileW = this.W;
      const tileH = this.H;
      const totalW = TILE_CONFIG.COLS * tileW;
      const totalH = TILE_CONFIG.ROWS * tileH;

      // Scale to fit canvas while maintaining aspect ratio
      const scaleX = cw / totalW;
      const scaleY = ch / totalH;
      const scale = Math.min(scaleX, scaleY);

      const renderedW = totalW * scale;
      const renderedH = totalH * scale;
      const ox = (cw - renderedW) / 2;
      const oy = (ch - renderedH) / 2;

      // Draw each tile
      for (let row = 0; row < TILE_CONFIG.ROWS; row++) {
        for (let col = 0; col < TILE_CONFIG.COLS; col++) {
          const x = ox + col * tileW * scale;
          const y = oy + row * tileH * scale;
          this.ctx.drawImage(
            this.offscreen,
            0, 0, tileW, tileH,
            x, y, tileW * scale, tileH * scale
          );
        }
      }
    } else {
      // Normal mode: Fit square (centered)
      const s = Math.min(cw, ch);
      const ox = (cw - s) / 2;
      const oy = (ch - s) / 2;
      this.ctx.drawImage(this.offscreen, 0, 0, this.W, this.H, ox, oy, s, s);
    }
  }

  /**
   * Capture a snapshot at original resolution (no scaling)
   * Returns a canvas with the exact pixel dimensions of the simulation
   * @returns {HTMLCanvasElement} Canvas with original resolution snapshot
   */
  captureSnapshot() {
    const snapshotCanvas = document.createElement('canvas');
    const ctx = snapshotCanvas.getContext('2d', { alpha: false });

    if (this.tileMode) {
      // Tile mode: Create 1760×880 canvas with 8×4 grid
      const tileW = this.W;
      const tileH = this.H;
      snapshotCanvas.width = TILE_CONFIG.COLS * tileW;
      snapshotCanvas.height = TILE_CONFIG.ROWS * tileH;

      ctx.imageSmoothingEnabled = false;

      // Draw each tile at original size
      for (let row = 0; row < TILE_CONFIG.ROWS; row++) {
        for (let col = 0; col < TILE_CONFIG.COLS; col++) {
          const x = col * tileW;
          const y = row * tileH;
          ctx.drawImage(this.offscreen, x, y);
        }
      }
    } else {
      // Normal mode: Create 220×220 canvas
      snapshotCanvas.width = this.W;
      snapshotCanvas.height = this.H;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.offscreen, 0, 0);
    }

    return snapshotCanvas;
  }

  /**
   * Convert canvas mouse event coordinates to grid coordinates
   * @param {MouseEvent} event - Mouse event with clientX, clientY
   * @returns {{gx: number, gy: number} | null} Grid coordinates or null if outside
   */
  canvasToGrid(event) {
    // Disable mouse interaction in tile mode
    if (this.tileMode) return null;

    const rect = this.canvas.getBoundingClientRect();

    // Map to centered square view
    const s = Math.min(rect.width, rect.height);
    const ox = (rect.width - s) / 2;
    const oy = (rect.height - s) / 2;

    const sx = (event.clientX - rect.left - ox) / s;
    const sy = (event.clientY - rect.top - oy) / s;

    const gx = Math.floor(sx * this.W);
    const gy = Math.floor(sy * this.H);

    if (gx < 0 || gx >= this.W || gy < 0 || gy >= this.H) {
      return null;
    }

    return { gx, gy };
  }
}
