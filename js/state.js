/**
 * SimulationState - Manages all Float32Array buffers for the Gray-Scott simulation
 *
 * Buffers:
 * - U0, V0: Current state (ping)
 * - U1, V1: Next state (pong)
 * - Eraw, Eema: Raw and EMA-smoothed energy
 * - dtMap: Dynamic timestep map
 * - dU, dV: Activity change buffers (for time-based energy metric)
 */

import { GRID_CONFIG } from './config.js';

export class SimulationState {
  constructor() {
    const { W, H, N } = GRID_CONFIG;
    this.W = W;
    this.H = H;
    this.N = N;

    // U,V ping-pong buffers
    this.U0 = new Float32Array(N);
    this.V0 = new Float32Array(N);
    this.U1 = new Float32Array(N);
    this.V1 = new Float32Array(N);

    // Energy buffers
    this.Eraw = new Float32Array(N);
    this.Eema = new Float32Array(N);
    this.dtMap = new Float32Array(N);

    // Activity metric buffers
    this.dU = new Float32Array(N);
    this.dV = new Float32Array(N);

    // Initialize with default seed
    this.seed();
  }

  /**
   * Utility: Get index from (x, y) coordinates
   */
  idx(x, y) {
    return x + y * this.W;
  }

  /**
   * Utility: Wrap coordinate with periodic boundary
   */
  wrap(x, m) {
    return (x + m) % m;
  }

  /**
   * Seed the simulation with a disturbed patch of V
   * Start near U=1, V=0 with a central square of V=1
   */
  seed() {
    const { W, H } = this;

    // Initialize to stable state (U=1, V=0)
    this.U0.fill(1);
    this.V0.fill(0);
    this.U1.fill(1);
    this.V1.fill(0);
    this.Eraw.fill(0);
    this.Eema.fill(0);
    this.dtMap.fill(1.5); // dtMax default
    this.dU.fill(0);
    this.dV.fill(0);

    // Add central disturbance (25x25 square of V)
    const cx = Math.floor(W / 2);
    const cy = Math.floor(H / 2);
    for (let y = cy - 12; y <= cy + 12; y++) {
      for (let x = cx - 12; x <= cx + 12; x++) {
        const xx = this.wrap(x, W);
        const yy = this.wrap(y, H);
        this.V0[this.idx(xx, yy)] = 1.0;
        this.U0[this.idx(xx, yy)] = 0.0;
      }
    }
  }

  /**
   * Clear all buffers to stable state (U=1, V=0)
   */
  clear() {
    this.U0.fill(1);
    this.V0.fill(0);
    this.U1.fill(1);
    this.V1.fill(0);
    this.Eraw.fill(0);
    this.Eema.fill(0);
    this.dtMap.fill(1.5); // dtMax default
    this.dU.fill(0);
    this.dV.fill(0);
  }

  /**
   * Swap ping-pong buffers after simulation step
   * U0 ↔ U1, V0 ↔ V1
   */
  swap() {
    let t = this.U0;
    this.U0 = this.U1;
    this.U1 = t;

    t = this.V0;
    this.V0 = this.V1;
    this.V1 = t;
  }

  /**
   * Getters for read-only access to current state
   */
  getU0() { return this.U0; }
  getV0() { return this.V0; }
  getU1() { return this.U1; }
  getV1() { return this.V1; }
  getEraw() { return this.Eraw; }
  getEema() { return this.Eema; }
  getDtMap() { return this.dtMap; }
  getDU() { return this.dU; }
  getDV() { return this.dV; }
}
