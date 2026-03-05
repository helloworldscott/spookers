export class NightManager {
  constructor() {
    this.night = 1;
    this.elapsed = 0;
    this.duration = 180;
    this.inDawn = false;
    this.completed = false;
  }

  getConfig() {
    const n = this.night;
    return {
      fog: 0.032 + n * 0.006,
      beamDrain: 3.4 + n * 0.65,
      fuelDrain: 1.1 + n * 0.34,
      drainScale: n * 0.45,
      faultChance: n >= 3 ? 0.012 + n * 0.002 : 0.003,
      stalkers: 1 + Math.floor((n - 1) / 2),
      crawlers: Math.max(0, n - 2)
    };
  }

  update(dt) {
    if (this.inDawn || this.completed) return;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.inDawn = true;
    }
  }

  beginNextNight() {
    this.inDawn = false;
    this.elapsed = 0;
    this.night += 1;
    if (this.night > 5) this.completed = true;
  }
}
