/**
 * GrayScottSimulation - Core physics engine for the Gray-Scott reaction-diffusion system
 * with dynamic timestep hierarchy based on local energy
 */

import { GRID_CONFIG } from './config.js';

export class GrayScottSimulation {
  constructor(state, params) {
    this.state = state;
    this.params = params;
    const { W, H, N } = GRID_CONFIG;
    this.W = W;
    this.H = H;
    this.N = N;
  }

  /**
   * Utility: Clamp value between min and max
   */
  clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
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
   * Compute 5-point stencil Laplacian with periodic boundaries
   * ∇²A = A(x-1,y) + A(x+1,y) + A(x,y-1) + A(x,y+1) - 4*A(x,y)
   */
  laplacian(A, x, y) {
    const xm = this.wrap(x - 1, this.W);
    const xp = this.wrap(x + 1, this.W);
    const ym = this.wrap(y - 1, this.H);
    const yp = this.wrap(y + 1, this.H);

    const c = A[this.idx(x, y)];
    const l = A[this.idx(xm, y)];
    const r = A[this.idx(xp, y)];
    const u = A[this.idx(x, ym)];
    const d = A[this.idx(x, yp)];

    return l + r + u + d - 4 * c;
  }

  /**
   * Compute gradient energy: |∇U|² + |∇V|²
   * Uses central differences for gradient
   */
  gradEnergy(U, V, x, y) {
    const xm = this.wrap(x - 1, this.W);
    const xp = this.wrap(x + 1, this.W);
    const ym = this.wrap(y - 1, this.H);
    const yp = this.wrap(y + 1, this.H);

    const ux = 0.5 * (U[this.idx(xp, y)] - U[this.idx(xm, y)]);
    const uy = 0.5 * (U[this.idx(x, yp)] - U[this.idx(x, ym)]);
    const vx = 0.5 * (V[this.idx(xp, y)] - V[this.idx(xm, y)]);
    const vy = 0.5 * (V[this.idx(x, yp)] - V[this.idx(x, ym)]);

    return ux * ux + uy * uy + vx * vx + vy * vy;
  }

  /**
   * Compute energy field based on selected metric
   * Supports: 'react' (U*V²), 'grad' (|∇U|²+|∇V|²), 'time' (|dU|+|dV|), 'mix' (weighted combination)
   */
  computeEnergy(U, V) {
    const { energyMode, mixAlpha, emaAlpha } = this.params;
    const { Eraw, Eema, dtMap, dU, dV } = this.state;
    const N = this.N;

    // Fill Eraw from selected metric
    if (energyMode === 'react') {
      for (let i = 0; i < N; i++) {
        const u = U[i];
        const v = V[i];
        Eraw[i] = u * v * v; // U*V²
      }
    } else if (energyMode === 'time') {
      for (let i = 0; i < N; i++) {
        Eraw[i] = Math.abs(dU[i]) + Math.abs(dV[i]);
      }
    } else if (energyMode === 'grad') {
      for (let y = 0; y < this.H; y++) {
        for (let x = 0; x < this.W; x++) {
          Eraw[this.idx(x, y)] = this.gradEnergy(U, V, x, y);
        }
      }
    } else if (energyMode === 'mix') {
      // Mix of react + grad
      // First compute react component in Eraw
      for (let i = 0; i < N; i++) {
        const u = U[i];
        const v = V[i];
        Eraw[i] = u * v * v;
      }
      // Compute grad component in dtMap (temporary reuse)
      for (let y = 0; y < this.H; y++) {
        for (let x = 0; x < this.W; x++) {
          dtMap[this.idx(x, y)] = this.gradEnergy(U, V, x, y);
        }
      }
      // Mix both components
      const a = mixAlpha;
      for (let i = 0; i < N; i++) {
        Eraw[i] = a * Eraw[i] + (1 - a) * dtMap[i];
      }
    }

    // Apply EMA smoothing: Eema = α*Eema + (1-α)*Eraw
    const a = emaAlpha;
    const ia = 1 - a;
    for (let i = 0; i < N; i++) {
      Eema[i] = a * Eema[i] + ia * Eraw[i];
    }
  }

  /**
   * Build dynamic timestep map from energy field
   * dt = dtMin + (dtMax - dtMin) * exp(-E/T)
   * High energy → small dt (fast micro dynamics)
   * Low energy → large dt (slow macro dynamics / "frozen")
   */
  buildDtMap() {
    const { dtMin, dtMax, tempScale } = this.params;
    const { Eema, dtMap } = this.state;
    const N = this.N;

    // Find max energy for normalization
    let eMax = 0;
    for (let i = 0; i < N; i++) {
      eMax = Math.max(eMax, Eema[i]);
    }

    // Avoid division by zero
    const scale = eMax > 1e-8 ? 1 / eMax : 1.0;
    const span = dtMax - dtMin;
    const T = Math.max(1e-6, tempScale);

    // Map energy to timestep
    for (let i = 0; i < N; i++) {
      const e = this.clamp(Eema[i] * scale, 0, 1);
      const dt = dtMin + span * Math.exp(-e / T);
      dtMap[i] = this.clamp(dt, Math.min(dtMin, dtMax), Math.max(dtMin, dtMax));
    }
  }

  /**
   * Perform one simulation step using Euler integration
   * Gray-Scott equations:
   *   du/dt = Du*∇²u - u*v² + F*(1-u)
   *   dv/dt = Dv*∇²v + u*v² - (F+K)*v
   *
   * Uses local dynamic timestep dt(x,y) from dtMap
   */
  stepOnce() {
    const { Du, Dv, F, K } = this.params;
    const { U0, V0, U1, V1, dU, dV } = this.state;

    // Compute energy and build dt map from current state
    this.computeEnergy(U0, V0);
    this.buildDtMap();

    // Euler integration with local timestep
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const i = this.idx(x, y);
        const u = U0[i];
        const v = V0[i];

        const Lu = this.laplacian(U0, x, y);
        const Lv = this.laplacian(V0, x, y);

        const uvv = u * v * v;

        // Gray-Scott reaction terms
        const du_dt = Du * Lu - uvv + F * (1 - u);
        const dv_dt = Dv * Lv + uvv - (F + K) * v;

        const dt = this.state.dtMap[i];

        const un = u + dt * du_dt;
        const vn = v + dt * dv_dt;

        U1[i] = this.clamp(un, 0, 1);
        V1[i] = this.clamp(vn, 0, 1);

        // Store activity for time-based energy metric
        dU[i] = U1[i] - u;
        dV[i] = V1[i] - v;
      }
    }

    // Swap buffers
    this.state.swap();
  }

  /**
   * Update simulation parameters
   */
  setParams(params) {
    this.params = { ...this.params, ...params };
  }
}
