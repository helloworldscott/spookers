export class UIManager {
  constructor() {
    this.timeLabel = document.getElementById('timeLabel');
    this.objectives = document.getElementById('objectives');
    this.status = document.getElementById('status');
    this.prompt = document.getElementById('prompt');
    this.panelText = document.getElementById('panelText');
    this.startOverlay = document.getElementById('startOverlay');
    this.pauseOverlay = document.getElementById('pauseOverlay');
    this.panelOverlay = document.getElementById('panelOverlay');
    this.endOverlay = document.getElementById('endOverlay');
    this.endTitle = document.getElementById('endTitle');
    this.endText = document.getElementById('endText');
    this.messageTimer = 0;
  }

  update(state, player, dt) {
    this.timeLabel.textContent = state.getTimeLabel();
    this.objectives.innerHTML = state.getObjectives().map((o) => `<div>${o}</div>`).join('');
    this.status.innerHTML = [
      `Generator: ${state.generatorFuel.toFixed(0)}%`,
      `Main Light: ${state.mainLightOn ? 'ON' : 'OFF'}`,
      `Flashlight: ${player.flashlightBattery.toFixed(0)}%`,
      `Stamina: ${player.stamina.toFixed(0)}%`
    ].map((s) => `<div>${s}</div>`).join('');

    if (this.messageTimer > 0) this.messageTimer -= dt;
  }

  setPrompt(text = '') {
    this.prompt.textContent = text;
    this.prompt.classList.toggle('visible', !!text);
  }

  showPause(show) { this.pauseOverlay.classList.toggle('visible', show); }
  showPanel(show) { this.panelOverlay.classList.toggle('visible', show); }

  flashMessage(text) {
    this.setPrompt(text);
    this.messageTimer = 2;
  }

  shake(amount = 0.1) {
    document.body.style.transform = `translate(${(Math.random() - 0.5) * amount * 8}px, ${(Math.random() - 0.5) * amount * 8}px)`;
    setTimeout(() => { document.body.style.transform = ''; }, 80);
  }

  showEnd(win) {
    this.endTitle.textContent = win ? 'You Survived' : 'Game Over';
    this.endText.textContent = win ? 'Dawn breaks over the island.' : 'The fog claimed the keeper.';
    this.endOverlay.classList.add('visible');
  }
}
