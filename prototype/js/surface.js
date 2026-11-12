// KINETIC XI — Playable Prototype
// surface.js : the living pitch (port of engine/src/surface.cpp). Rain soaks the blades,
// low/compacted cells puddle, boots wear the goalmouths, and every contact samples it.
'use strict';
(function (K) {
  const P = K.PITCH;

  K.Surface = class {
    constructor(cell = 2, seed = 7) {
      this.cell = cell;
      this.nx = Math.ceil(P.L / cell);
      this.ny = Math.ceil(P.W / cell);
      const n = this.nx * this.ny;
      this.moisture = new Float32Array(n);
      this.water = new Float32Array(n);
      this.wear = new Float32Array(n);
      this.compaction = new Float32Array(n);
      this.drain = new Float32Array(n);
      this.grassMm = 24;
      this.drainRate = 0.012;   // mm/s (~43 mm/h): a good club pitch; the engine default (0.02) is elite
      for (let j = 0; j < this.ny; j++) {
        for (let i = 0; i < this.nx; i++) {
          const k = j * this.nx + i;
          const x = i * cell - P.HL, y = j * cell - P.HW;
          const nn = 0.7 * K.noise2(x / 12, y / 12, seed) + 0.3 * K.noise2(x / 3, y / 3, seed + 1);
          this.drain[k] = K.clamp(0.95 + 0.6 * nn, 0.15, 1.4);
          const goalmouth = Math.exp(-((Math.abs(x) - P.HL + 6) ** 2 + y * y) / 60);
          const centre = Math.exp(-(x * x + y * y) / 40);
          this.compaction[k] = K.sat(0.15 + 0.35 * goalmouth + 0.15 * centre);
          this.moisture[k] = 0.15;
        }
      }
    }

    idx(x, y) {
      const i = K.clamp(Math.floor((x + P.HL) / this.cell), 0, this.nx - 1);
      const j = K.clamp(Math.floor((y + P.HW) / this.cell), 0, this.ny - 1);
      return j * this.nx + i;
    }

    setUniform(moisture, water = 0, wear = 0) {
      this.moisture.fill(moisture);
      this.water.fill(water);
      this.wear.fill(wear);
    }

    /** weather: {rain mm/h, temp C, humidity 0..1, wind {x,y}}; dt in (accelerated) seconds */
    update(dt, w) {
      const rainS = Math.max(0, w.rain) / 3600;
      const windS = Math.hypot(w.wind.x, w.wind.y);
      const evap = 0.00035 * (1 + Math.max(-5, w.temp) / 20) * (1 - 0.9 * K.sat(w.humidity)) * (1 + windS / 6);
      const n = this.moisture.length;
      for (let k = 0; k < n; k++) {
        let m = this.moisture[k];
        m += (0.004 * w.rain * (1 - m) - evap * m) * dt;
        const infil = this.drainRate * this.drain[k] * (1 - 0.8 * this.compaction[k]);
        let d = this.water[k] + (rainS - infil - evap * 0.5) * dt;
        d = K.clamp(d, 0, 30);
        if (d > 0.05) m = Math.max(m, 0.97);
        this.moisture[k] = K.sat(m);
        this.water[k] = d;
      }
    }

    footfall(x, y, impulse, shear) {
      const k = this.idx(x, y);
      const wet = 1 + 2 * this.moisture[k];
      // Scaled up (x8) versus the engine so wear becomes visible within a short prototype match.
      this.wear[k] = K.sat(this.wear[k] + impulse * K.sat(shear) * 8e-6 * wet);
      this.compaction[k] = K.sat(this.compaction[k] + impulse * 1.5e-6 * (0.5 + this.moisture[k]));
    }

    coeffs(x, y) {
      const k = this.idx(x, y);
      const m = this.moisture[k], wear = this.wear[k];
      const grass = this.grassMm * (1 - 0.7 * wear);
      const puddle = K.sat(this.water[k] / 8);
      const mud = wear * m;
      return {
        e: K.clamp(0.7 - 0.08 * m - 0.28 * puddle - 0.0025 * (grass - 24) + 0.06 * wear * (1 - m), 0.25, 0.82),
        mu: 0.58 * (1 - 0.42 * m) + 0.3 * mud,
        crr: (0.035 + 0.0019 * grass) * (1 - 0.22 * m) + 0.55 * Math.pow(puddle, 1.5) + 0.05 * mud,
        traction: (1 - 0.22 * m) * (1 - 0.3 * puddle) * (1 - 0.25 * mud),
        hardness: K.sat(0.35 + 0.5 * this.compaction[k] - 0.25 * m + 0.2 * wear * (1 - m)),
        moisture: m,
        water: this.water[k],
      };
    }

    avgMoisture() {
      let s = 0;
      for (let k = 0; k < this.moisture.length; k++) s += this.moisture[k];
      return s / this.moisture.length;
    }
    maxWater() {
      let m = 0;
      for (let k = 0; k < this.water.length; k++) m = Math.max(m, this.water[k]);
      return m;
    }
    describe() {
      const m = this.avgMoisture(), w = this.maxWater();
      if (w > 4) return 'Waterlogged — passes die in puddles';
      if (w > 1) return 'Soaked — puddles forming';
      if (m > 0.75) return 'Wet & zippy — ball skids';
      if (m > 0.4) return 'Damp';
      return 'Dry & firm';
    }
  };
})(window.KXI);
