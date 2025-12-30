/**
 * Configuration constants for Gray-Scott simulation
 * All constants are frozen to prevent accidental mutation
 */

// Grid dimensions
export const GRID_CONFIG = Object.freeze({
  W: 220,
  H: 220,
  get N() { return this.W * this.H; }
});

// Default simulation parameters
export const DEFAULT_PARAMS = Object.freeze({
  // Gray-Scott reaction parameters
  Du: 0.16,
  Dv: 0.08,
  F: 0.035,
  K: 0.06,

  // Dynamic timestep hierarchy parameters
  dtMin: 0.2,
  dtMax: 1.5,
  tempScale: 0.08,  // T in exp(-E/T)

  // Energy computation parameters
  emaAlpha: 0.8,    // Energy smoothing (0..0.99)
  energyMode: 'react',
  mixAlpha: 0.5,

  // UI parameters
  stepsPerFrame: 6,
  brushRadius: 10,
  viewMode: 'V'
});

// LocalStorage key for settings persistence
export const STORAGE_KEY = 'grayScottSettings';
