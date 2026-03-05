export class UI {
  constructor() {
    this.nightLabel = document.getElementById('nightLabel');
    this.fuelLabel = document.getElementById('fuelLabel');
    this.powerLabel = document.getElementById('powerLabel');
    this.objectiveLabel = document.getElementById('objectiveLabel');
    this.prompt = document.getElementById('prompt');

    this.startOverlay = document.getElementById('startOverlay');
    this.startBtn = document.getElementById('startBtn');

    this.dawnOverlay = document.getElementById('dawnOverlay');
    this.dawnTitle = document.getElementById('dawnTitle');
    this.dawnText = document.getElementById('dawnText');
    this.nextNightBtn = document.getElementById('nextNightBtn');

    this.endOverlay = document.getElementById('endOverlay');
    this.endTitle = document.getElementById('endTitle');
    this.endText = document.getElementById('endText');
    this.restartBtn = document.getElementById('restartBtn');

    this.choiceOverlay = document.getElementById('choiceOverlay');
    this.choiceEscape = document.getElementById('choiceEscape');
    this.choiceKeeper = document.getElementById('choiceKeeper');
    this.choiceDestroy = document.getElementById('choiceDestroy');

    this.lensOverlay = document.getElementById('lensOverlay');
    this.lensStatus = document.getElementById('lensStatus');
    this.lensK1 = document.getElementById('lensK1');
    this.lensK2 = document.getElementById('lensK2');
    this.lensK3 = document.getElementById('lensK3');
    this.lensClose = document.getElementById('lensClose');

    this.logbook = document.getElementById('logbook');
    this.logCount = document.getElementById('logCount');
    this.logList = document.getElementById('logList');

    this.promptTimer = 0;
  }

  update(game, dt) {
    const { nights, generator, objectives } = game;
    this.nightLabel.textContent = `Night ${nights.night}`;
    this.fuelLabel.textContent = `Fuel: ${generator.fuel.toFixed(0)}%`;
    this.powerLabel.textContent = `Power: ${generator.power.toFixed(0)}%${generator.faulted ? ' (FAULT)' : ''}`;
    this.objectiveLabel.textContent = `Objective: ${objectives.currentText}`;

    if (this.promptTimer > 0) this.promptTimer -= dt;
    if (this.promptTimer <= 0 && !this.prompt.dataset.sticky) this.setPrompt('');
  }

  setPrompt(text, sticky = false) {
    this.prompt.textContent = text;
    if (sticky) this.prompt.dataset.sticky = '1'; else delete this.prompt.dataset.sticky;
    if (text) this.prompt.classList.add('visible'); else this.prompt.classList.remove('visible');
  }

  flash(text, t = 2) {
    this.promptTimer = t;
    this.setPrompt(text);
  }

  showDawn(text) {
    this.dawnTitle.textContent = 'Dawn';
    this.dawnText.textContent = text;
    this.dawnOverlay.classList.add('visible');
  }

  hideDawn() { this.dawnOverlay.classList.remove('visible'); }

  showEnd(title, text) {
    this.endTitle.textContent = title;
    this.endText.textContent = text;
    this.endOverlay.classList.add('visible');
  }

  showLogbook(show, pages) {
    this.logbook.classList.toggle('visible', show);
    this.logCount.textContent = `Pages: ${pages.length}/5`;
    this.logList.innerHTML = pages.map((p) => `<div class="page-item">${p}</div>`).join('');
  }

  showLens(show, values) {
    this.lensOverlay.classList.toggle('visible', show);
    if (show) this.lensStatus.textContent = `A:${values[0]} B:${values[1]} C:${values[2]} | target: 2`;
  }

  showChoice(show) { this.choiceOverlay.classList.toggle('visible', show); }
}
