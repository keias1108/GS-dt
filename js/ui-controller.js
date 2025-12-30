/**
 * UIController - Coordinates all UI interactions and the animation loop
 * Handles buttons, keyboard shortcuts, mouse painting, and parameter synchronization
 */

import { ParameterController } from './parameter-controller.js';

export class UIController {
  constructor(simulation, renderer, state, settingsManager, params) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.state = state;
    this.settingsManager = settingsManager;
    this.params = params;

    // Animation state
    this.running = false;
    this.lastT = performance.now();
    this.acc = 0;
    this.frames = 0;

    // Painting state
    this.painting = false;

    // Initialize all UI components
    this.initializeParameterControllers();
    this.initializeViewAndEnergyControls();
    this.initializeDtBounds();
    this.initializeButtons();
    this.initializePainting();
    this.initializeKeyboardShortcuts();

    // Auto-load settings from localStorage
    this.settingsManager.loadFromLocalStorage();
  }

  /**
   * Utility: Clamp value between min and max
   */
  clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
  }

  /**
   * Initialize parameter controllers for sliders
   */
  initializeParameterControllers() {
    // Initialize sliders with params values before creating controllers
    document.getElementById('du').value = this.params.Du;
    document.getElementById('dv').value = this.params.Dv;
    document.getElementById('F').value = this.params.F;
    document.getElementById('k').value = this.params.K;
    document.getElementById('temp').value = this.params.tempScale;
    document.getElementById('ema').value = this.params.emaAlpha;
    document.getElementById('spf').value = this.params.stepsPerFrame;
    document.getElementById('mixA').value = this.params.mixAlpha;
    document.getElementById('br').value = this.params.brushRadius;

    new ParameterController(
      'du', 'duTxt',
      (v) => { this.params.Du = v; },
      (v) => v.toFixed(3),
      this.settingsManager
    );

    new ParameterController(
      'dv', 'dvTxt',
      (v) => { this.params.Dv = v; },
      (v) => v.toFixed(3),
      this.settingsManager
    );

    new ParameterController(
      'F', 'FTxt',
      (v) => { this.params.F = v; },
      (v) => v.toFixed(4),
      this.settingsManager
    );

    new ParameterController(
      'k', 'kTxt',
      (v) => { this.params.K = v; },
      (v) => v.toFixed(4),
      this.settingsManager
    );

    new ParameterController(
      'temp', 'tempTxt',
      (v) => { this.params.tempScale = v; },
      (v) => v.toFixed(3),
      this.settingsManager
    );

    new ParameterController(
      'ema', 'emaTxt',
      (v) => { this.params.emaAlpha = v; },
      (v) => v.toFixed(2),
      this.settingsManager
    );

    new ParameterController(
      'spf', 'spfTxt',
      (v) => { this.params.stepsPerFrame = v | 0; },
      (v) => String(v | 0),
      this.settingsManager
    );

    new ParameterController(
      'mixA', 'mixATxt',
      (v) => { this.params.mixAlpha = v; },
      (v) => v.toFixed(2),
      this.settingsManager
    );

    new ParameterController(
      'br', 'brTxt',
      (v) => { this.params.brushRadius = v | 0; },
      (v) => String(v | 0),
      this.settingsManager
    );
  }

  /**
   * Initialize view mode and energy mode controls
   */
  initializeViewAndEnergyControls() {
    // Initialize select elements with params values
    const energySel = document.getElementById('energySel');
    const viewSel = document.getElementById('viewSel');

    energySel.value = this.params.energyMode;
    viewSel.value = this.params.viewMode;

    energySel.addEventListener('change', () => {
      this.params.energyMode = energySel.value;
    });

    viewSel.addEventListener('change', () => {
      this.params.viewMode = viewSel.value;
    });
  }

  /**
   * Initialize dt bounds inputs
   */
  initializeDtBounds() {
    const dtMinEl = document.getElementById('dtMin');
    const dtMaxEl = document.getElementById('dtMax');

    // Initialize with params values
    dtMinEl.value = this.params.dtMin;
    dtMaxEl.value = this.params.dtMax;

    const updateDtBounds = () => {
      let dtMin = parseFloat(dtMinEl.value);
      let dtMax = parseFloat(dtMaxEl.value);

      if (!isFinite(dtMin)) dtMin = 0.2;
      if (!isFinite(dtMax)) dtMax = 1.5;

      // Keep sane bounds
      dtMin = this.clamp(dtMin, 0.001, 10);
      dtMax = this.clamp(dtMax, 0.001, 10);

      this.params.dtMin = dtMin;
      this.params.dtMax = dtMax;
    };

    dtMinEl.addEventListener('change', updateDtBounds);
    dtMaxEl.addEventListener('change', updateDtBounds);
  }

  /**
   * Initialize all button handlers
   */
  initializeButtons() {
    // Run/Pause button
    const runBtn = document.getElementById('runBtn');
    runBtn.addEventListener('click', () => {
      this.running = !this.running;
      runBtn.textContent = this.running ? '⏸ Pause' : '▶ Run';
    });

    // Step button
    document.getElementById('stepBtn').addEventListener('click', () => {
      for (let i = 0; i < this.params.stepsPerFrame; i++) {
        this.simulation.stepOnce();
      }
      this.renderer.render(this.state, document.getElementById('viewSel').value);
    });

    // Seed button
    document.getElementById('seedBtn').addEventListener('click', () => {
      this.state.seed();
    });

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.state.clear();
    });

    // Settings buttons
    document.getElementById('saveJsonBtn').addEventListener('click', () => {
      this.settingsManager.downloadJSON(this.renderer.canvas);
    });

    document.getElementById('loadJsonBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    document.getElementById('saveLocalBtn').addEventListener('click', () => {
      const success = this.settingsManager.saveToLocalStorage();
      if (success) {
        alert('Settings saved to localStorage!');
      } else {
        alert('Failed to save settings to localStorage. Check console for details.');
      }
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.settingsManager.loadJSON(file);
      }
      e.target.value = ''; // Reset input
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.settingsManager.resetToDefaults();
    });
  }

  /**
   * Initialize keyboard shortcuts
   */
  initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt+Z: Reseed
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.state.seed();
      }

      // Alt+S: Save JSON
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.settingsManager.downloadJSON(this.renderer.canvas);
      }

      // Space: Run/Pause (only if not focused on input)
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        this.running = !this.running;
        const runBtn = document.getElementById('runBtn');
        runBtn.textContent = this.running ? '⏸ Pause' : '▶ Run';
      }
    });
  }

  /**
   * Initialize mouse painting functionality
   */
  initializePainting() {
    const canvas = this.renderer.canvas;

    const paintAt = (gx, gy) => {
      const mode = document.getElementById('brushSel').value;
      const r = this.params.brushRadius;
      const { U0, V0 } = this.state;
      const { W, H } = this.state;

      for (let yy = gy - r; yy <= gy + r; yy++) {
        for (let xx = gx - r; xx <= gx + r; xx++) {
          const dx = xx - gx;
          const dy = yy - gy;
          if (dx * dx + dy * dy > r * r) continue;

          const x = this.state.wrap(xx, W);
          const y = this.state.wrap(yy, H);
          const i = this.state.idx(x, y);

          if (mode === 'erase') {
            U0[i] = 1.0;
            V0[i] = 0.0;
          } else if (mode === 'V') {
            V0[i] = 1.0;
            U0[i] = 0.0;
          } else if (mode === 'U') {
            U0[i] = 1.0;
            V0[i] = 0.0;
          } else if (mode === 'UV') {
            U0[i] = 0.5;
            V0[i] = 0.5;
          }
        }
      }
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.painting = true;
      const g = this.renderer.canvasToGrid(e);
      if (g) paintAt(g.gx, g.gy);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.painting) return;
      const g = this.renderer.canvasToGrid(e);
      if (g) paintAt(g.gx, g.gy);
    });

    window.addEventListener('pointerup', () => {
      this.painting = false;
    });
  }

  /**
   * Start the animation loop
   */
  startAnimationLoop() {
    const fpsEl = document.getElementById('fps');

    const tick = () => {
      const now = performance.now();
      const dt = now - this.lastT;
      this.lastT = now;
      this.acc += dt;
      this.frames++;

      // Update FPS every 500ms
      if (this.acc >= 500) {
        const fps = (this.frames * 1000) / this.acc;
        fpsEl.textContent = 'FPS: ' + fps.toFixed(1);
        this.acc = 0;
        this.frames = 0;
      }

      // Run simulation steps if running
      if (this.running) {
        for (let i = 0; i < this.params.stepsPerFrame; i++) {
          this.simulation.stepOnce();
        }
      } else {
        // Still update dtMap/energy when paused so dt/E view isn't stale
        this.simulation.computeEnergy(this.state.U0, this.state.V0);
        this.simulation.buildDtMap();
      }

      // Render current state
      const viewMode = document.getElementById('viewSel').value;
      this.renderer.render(this.state, viewMode);

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}
