/**
 * Main entry point for Gray-Scott simulation
 * Orchestrates all modules and starts the application
 */

import { DEFAULT_PARAMS } from './config.js';
import { SimulationState } from './state.js';
import { GrayScottSimulation } from './simulation.js';
import { Renderer } from './renderer.js';
import { SettingsManager } from './settings-manager.js';
import { UIController } from './ui-controller.js';

/**
 * Initialize and start the application
 */
function init() {
  try {
    // Create mutable parameters object from defaults
    const params = { ...DEFAULT_PARAMS };

    // Create state manager
    const state = new SimulationState();

    // Create simulation engine
    const simulation = new GrayScottSimulation(state, params);

    // Create renderer
    const renderer = new Renderer('c');

    // Create settings manager
    const settingsManager = new SettingsManager();

    // Create UI controller and wire everything together
    const uiController = new UIController(
      simulation,
      renderer,
      state,
      settingsManager,
      params
    );

    // Start the animation loop
    uiController.startAnimationLoop();

    console.log('Gray-Scott simulation initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gray-Scott simulation:', error);
    alert('Failed to initialize simulation. Check console for details.');
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
