export class GameState {
  constructor() {
    this.nightDurationSec = 360;
    this.elapsed = 0;
    this.generatorFuel = 100;
    this.breakdown = false;
    this.mainLightOn = true;
    this.mainLightOffAccum = 0;
    this.hasFuelCan = false;
    this.canFilled = false;
    this.radioCount = 0;
    this.repairProgress = 0;
    this.gameOver = false;
    this.win = false;
  }

  update(dt) {
    if (this.gameOver || this.win) return;
    this.elapsed += dt;
    this.generatorFuel -= dt * 1.3;

    if (this.breakdown) {
      this.mainLightOn = false;
    } else {
      this.mainLightOn = this.generatorFuel > 0;
    }

    if (!this.mainLightOn) this.mainLightOffAccum += dt;
    this.generatorFuel = Math.max(0, this.generatorFuel);

    if (this.elapsed >= this.nightDurationSec) this.win = true;
  }

  getTimeLabel() {
    const progress = Math.min(1, this.elapsed / this.nightDurationSec);
    const totalMin = 360 * progress;
    const hour24 = 0 + Math.floor(totalMin / 60);
    const min = Math.floor(totalMin % 60);
    const hour12 = ((hour24 + 11) % 12) + 1;
    return `${hour12}:${String(min).padStart(2, '0')} AM`;
  }

  getObjectives() {
    return [
      `${this.mainLightOn ? '✓' : '✗'} Keep main beam running`,
      `${this.generatorFuel > 20 ? '✓' : '…'} Maintain generator fuel`,
      `${!this.breakdown ? '✓' : '✗'} Repair breaker when broken`,
      `${this.radioCount > 0 ? '✓' : '…'} Check radio`
    ];
  }
}
