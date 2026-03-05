export class GeneratorSystem {
  constructor() {
    this.fuel = 70;
    this.power = 60;
    this.started = false;
    this.faulted = false;
    this.hasShackKey = false;
    this.carryingFuelCan = false;
    this.fuelCansDelivered = 0;
    this.repairProgress = 0;
  }

  update(dt, nightConfig) {
    if (!this.started) return;

    if (this.faulted) {
      this.power = Math.max(0, this.power - dt * (2.3 + nightConfig.drainScale));
      return;
    }

    if (this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - dt * (nightConfig.fuelDrain));
      this.power = Math.min(100, this.power + dt * 4.8);
    } else {
      this.power = Math.max(0, this.power - dt * (1.8 + nightConfig.drainScale));
    }

    if (!this.faulted && Math.random() < nightConfig.faultChance * dt) {
      this.faulted = true;
    }
  }

  consumeForBeam(amount) {
    if (!this.started || this.faulted || this.power <= 0) return false;
    this.power = Math.max(0, this.power - amount);
    return this.power > 0;
  }

  start() {
    if (!this.hasShackKey) return false;
    this.started = true;
    return true;
  }

  addFuelFromCan() {
    if (!this.carryingFuelCan) return false;
    this.carryingFuelCan = false;
    this.fuel = Math.min(100, this.fuel + 35);
    this.fuelCansDelivered += 1;
    return true;
  }

  holdRepair(dt) {
    if (!this.faulted) return false;
    this.repairProgress += dt;
    if (this.repairProgress >= 2.6) {
      this.faulted = false;
      this.repairProgress = 0;
      return true;
    }
    return false;
  }

  stopRepair() {
    this.repairProgress = 0;
  }
}
