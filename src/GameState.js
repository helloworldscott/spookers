export class GameState {
  constructor() {
    this.nightDurationSec = 360;
    this.elapsed = 0;
    this.generatorFuel = 100;
    this.generatorCharge = 75;
    this.breakdown = false;
    this.mainLightOn = true;
    this.mainLightOffAccum = 0;
    this.hasFuelCan = false;
    this.canFilled = false;
    this.radioCount = 0;
    this.repairProgress = 0;
    this.chargeProgress = 0;
    this.gameOver = false;
    this.win = false;
  }

  update(dt) {
    if (this.gameOver || this.win) return;
    this.elapsed += dt;

    this.generatorFuel -= dt * 1.3;
    this.generatorCharge -= dt * 2.1;

    this.generatorFuel = Math.max(0, this.generatorFuel);
    this.generatorCharge = Math.max(0, this.generatorCharge);

    this.mainLightOn = !this.breakdown && this.generatorFuel > 0 && this.generatorCharge > 4;
    if (!this.mainLightOn) this.mainLightOffAccum += dt;

    if (this.elapsed >= this.nightDurationSec) this.win = true;
  }

  getBeamCause() {
    if (this.breakdown) return 'BROKEN';
    if (this.generatorFuel <= 0) return 'NO FUEL';
    if (this.generatorCharge <= 4) return 'NO CHARGE';
    return 'OK';
  }

  getTimeLabel() {
    const progress = Math.min(1, this.elapsed / this.nightDurationSec);
    const totalMin = 360 * progress;
    const hour24 = Math.floor(totalMin / 60);
    const min = Math.floor(totalMin % 60);
    const hour12 = ((hour24 + 11) % 12) + 1;
    return `${hour12}:${String(min).padStart(2, '0')} AM`;
  }

  getObjectives() {
    return [
      `${this.mainLightOn ? '✓' : '✗'} Keep main beam running`,
      `${this.generatorFuel > 20 ? '✓' : '…'} Maintain generator fuel`,
      `${this.generatorCharge > 30 ? '✓' : '…'} Charge generator coils (keep above 30%)`,
      `${!this.breakdown ? '✓' : '✗'} Repair generator when it breaks`,
      `${this.radioCount > 0 ? '✓' : '…'} Check radio`
    ];
  }
}
