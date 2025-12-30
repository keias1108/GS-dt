/**
 * SettingsManager - Handles settings persistence (localStorage, JSON I/O)
 * Manages save/load/reset operations for all simulation parameters
 */

import { STORAGE_KEY, DEFAULT_PARAMS } from './config.js';

export class SettingsManager {
  constructor() {
    this.storageKey = STORAGE_KEY;
    this.defaults = DEFAULT_PARAMS;
    this.controllers = [];
  }

  /**
   * Register a ParameterController for synchronized updates
   */
  registerController(controller) {
    this.controllers.push(controller);
  }

  /**
   * Get current settings from UI elements
   * Reads directly from DOM to ensure we get the current displayed values
   */
  getCurrentSettings() {
    return {
      Du: parseFloat(document.getElementById('du').value),
      Dv: parseFloat(document.getElementById('dv').value),
      F: parseFloat(document.getElementById('F').value),
      K: parseFloat(document.getElementById('k').value),
      dtMin: parseFloat(document.getElementById('dtMin').value),
      dtMax: parseFloat(document.getElementById('dtMax').value),
      tempScale: parseFloat(document.getElementById('temp').value),
      emaAlpha: parseFloat(document.getElementById('ema').value),
      stepsPerFrame: parseInt(document.getElementById('spf').value),
      energyMode: document.getElementById('energySel').value,
      mixAlpha: parseFloat(document.getElementById('mixA').value),
      brushRadius: parseInt(document.getElementById('br').value),
      viewMode: document.getElementById('viewSel').value
    };
  }

  /**
   * Apply settings to UI and global parameters
   * @param {Object} settings - Settings object to apply
   */
  applySettings(settings) {
    // Update sliders (this will trigger controller updates)
    if (settings.Du !== undefined) {
      document.getElementById('du').value = settings.Du;
    }
    if (settings.Dv !== undefined) {
      document.getElementById('dv').value = settings.Dv;
    }
    if (settings.F !== undefined) {
      document.getElementById('F').value = settings.F;
    }
    if (settings.K !== undefined) {
      document.getElementById('k').value = settings.K;
    }
    if (settings.tempScale !== undefined) {
      document.getElementById('temp').value = settings.tempScale;
    }
    if (settings.emaAlpha !== undefined) {
      document.getElementById('ema').value = settings.emaAlpha;
    }
    if (settings.stepsPerFrame !== undefined) {
      document.getElementById('spf').value = settings.stepsPerFrame;
    }
    if (settings.mixAlpha !== undefined) {
      document.getElementById('mixA').value = settings.mixAlpha;
    }
    if (settings.brushRadius !== undefined) {
      document.getElementById('br').value = settings.brushRadius;
    }

    // Update other UI elements
    if (settings.viewMode !== undefined) {
      document.getElementById('viewSel').value = settings.viewMode;
    }
    if (settings.energyMode !== undefined) {
      document.getElementById('energySel').value = settings.energyMode;
    }
    if (settings.dtMin !== undefined) {
      document.getElementById('dtMin').value = settings.dtMin;
    }
    if (settings.dtMax !== undefined) {
      document.getElementById('dtMax').value = settings.dtMax;
    }

    // Update all controllers to sync input fields
    this.controllers.forEach(ctrl => ctrl.updateFromValue());
  }

  /**
   * Save current settings to localStorage
   * @returns {boolean} Success status
   */
  saveToLocalStorage() {
    try {
      const settings = this.getCurrentSettings();
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }

  /**
   * Load settings from localStorage
   * @returns {boolean} Success status
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const settings = JSON.parse(stored);
        this.applySettings(settings);
        return true;
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return false;
  }

  /**
   * Download current settings as JSON file and canvas screenshot
   * @param {HTMLCanvasElement} canvas - The canvas to capture as screenshot
   */
  downloadJSON(canvas) {
    const settings = this.getCurrentSettings();
    const timestamp = Date.now();
    const baseFilename = `gray-scott-settings-${timestamp}`;

    // Download JSON file
    const json = JSON.stringify(settings, null, 2);
    const jsonBlob = new Blob([json], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${baseFilename}.json`;
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);

    // Download canvas screenshot as PNG
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const imgUrl = URL.createObjectURL(blob);
          const imgLink = document.createElement('a');
          imgLink.href = imgUrl;
          imgLink.download = `${baseFilename}.png`;
          imgLink.click();
          URL.revokeObjectURL(imgUrl);
        }
      }, 'image/png');
    }
  }

  /**
   * Load settings from JSON file
   * @param {File} file - The file to load
   */
  loadJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        this.applySettings(settings);
        alert('Settings loaded successfully!');
      } catch (err) {
        alert('Failed to load settings: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Reset all parameters to default values
   */
  resetToDefaults() {
    if (confirm('Reset all parameters to default values?')) {
      this.applySettings(this.defaults);
    }
  }
}
