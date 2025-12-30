/**
 * ParameterController - Bidirectional synchronization between slider and input field
 * Supports mouse wheel and arrow key adjustments
 */

export class ParameterController {
  /**
   * @param {string} sliderId - ID of the range input (slider)
   * @param {string} inputId - ID of the number input field
   * @param {function} onChange - Callback when value changes (receives new value)
   * @param {function} formatter - Function to format value for display
   * @param {SettingsManager} settingsManager - Settings manager for registration (optional)
   */
  constructor(sliderId, inputId, onChange, formatter, settingsManager = null) {
    this.slider = document.getElementById(sliderId);
    this.input = document.getElementById(inputId);
    this.onChange = onChange;
    this.formatter = formatter;

    this.min = parseFloat(this.slider.min);
    this.max = parseFloat(this.slider.max);
    this.step = parseFloat(this.slider.step);

    this.init();

    // Register with settings manager if provided
    if (settingsManager) {
      settingsManager.registerController(this);
    }
  }

  /**
   * Utility: Clamp value between min and max
   */
  clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
  }

  /**
   * Initialize event listeners
   */
  init() {
    // Slider change -> update input and call onChange
    this.slider.addEventListener('input', () => this.updateFromSlider());

    // Input change -> update slider and call onChange
    this.input.addEventListener('input', () => this.updateFromInput());

    // Mouse wheel on slider
    this.slider.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Mouse wheel on input
    this.input.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Arrow keys on input
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Initialize value
    this.updateFromSlider();
  }

  /**
   * Update from slider value (user moved slider)
   */
  updateFromSlider() {
    const value = parseFloat(this.slider.value);
    this.input.value = this.formatter(value);
    this.onChange(value);
  }

  /**
   * Update from input value (user typed in input field)
   */
  updateFromInput() {
    let value = parseFloat(this.input.value);
    if (isNaN(value)) return;

    // Clamp to min/max
    value = this.clamp(value, this.min, this.max);

    this.slider.value = value;
    this.input.value = this.formatter(value);
    this.onChange(value);
  }

  /**
   * Update UI from current slider value (used when loading settings)
   */
  updateFromValue() {
    const value = parseFloat(this.slider.value);
    this.input.value = this.formatter(value);
  }

  /**
   * Handle mouse wheel events
   */
  handleWheel(e) {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -this.step : this.step;
    let value = parseFloat(this.slider.value) + delta;
    value = this.clamp(value, this.min, this.max);

    this.slider.value = value;
    this.input.value = this.formatter(value);
    this.onChange(value);
  }

  /**
   * Handle arrow key events on input
   */
  handleKeydown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();

      const delta = e.key === 'ArrowUp' ? this.step : -this.step;
      let value = parseFloat(this.slider.value) + delta;
      value = this.clamp(value, this.min, this.max);

      this.slider.value = value;
      this.input.value = this.formatter(value);
      this.onChange(value);
    }
  }
}
