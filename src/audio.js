export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.started = false;
    this.ambientTimer = 0;
  }

  init() {
    if (this.started) return;
    this.started = true;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.12;
    this.master.connect(this.ctx.destination);
  }

  tone(freq = 220, dur = 0.08, type = 'sine', gain = 0.12) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(this.master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.stop(this.ctx.currentTime + dur);
  }

  update(dt, nearDeathPulse) {
    if (!this.ctx) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 1.6 + Math.random() * 2.4;
      this.tone(80 + Math.random() * 40, 0.25, 'triangle', 0.03);
    }
    if (nearDeathPulse > 0.45) this.tone(120 + nearDeathPulse * 90, 0.05, 'sawtooth', 0.07);
  }

  footstep() { this.tone(95 + Math.random() * 35, 0.03, 'square', 0.025); }
  sting() { this.tone(220, 0.2, 'sawtooth', 0.14); setTimeout(() => this.tone(120, 0.2, 'triangle', 0.1), 80); }
  alarm() { this.tone(460, 0.1, 'square', 0.08); }
}
