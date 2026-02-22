export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.masterVolume = 0.7;
    this.wind = null;
    this.ocean = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(this.ctx.destination);
    this.startAmbience();
  }

  setVolume(v) {
    this.masterVolume = v;
    if (this.master) this.master.gain.value = v;
  }

  // Simple procedural white noise node via script processor substitute.
  createNoiseBuffer(seconds = 1) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  startAmbience() {
    const windNoise = this.ctx.createBufferSource();
    windNoise.buffer = this.createNoiseBuffer(2);
    windNoise.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 520;
    const windGain = this.ctx.createGain();
    windGain.gain.value = 0.18;
    windNoise.connect(windFilter).connect(windGain).connect(this.master);
    windNoise.start();
    this.wind = windGain;

    const oceanOsc = this.ctx.createOscillator();
    oceanOsc.type = 'sawtooth';
    oceanOsc.frequency.value = 45;
    const oceanFilter = this.ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 180;
    const oceanGain = this.ctx.createGain();
    oceanGain.gain.value = 0.05;
    oceanOsc.connect(oceanFilter).connect(oceanGain).connect(this.master);
    oceanOsc.start();
    this.ocean = oceanGain;
  }

  beep(freq = 820, duration = 0.12, type = 'square', gain = 0.08) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g).connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + duration);
  }

  footstep() { this.beep(140 + Math.random() * 40, 0.06, 'triangle', 0.06); }
  knock() { this.beep(90, 0.25, 'sine', 0.2); }
  staticBurst() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.createNoiseBuffer(0.25);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1700;
    const g = this.ctx.createGain(); g.gain.value = 0.12;
    src.connect(bp).connect(g).connect(this.master);
    src.start();
  }
  thunder() { this.beep(55, 0.8, 'sawtooth', 0.25); }
  presence(level) {
    if (!this.ctx || !this.wind) return;
    this.wind.gain.value = 0.18 + Math.min(0.2, level * 0.2);
  }
}
