import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { PlayerController } from './PlayerController.js';
import { WorldBuilder } from './WorldBuilder.js';
import { GameState } from './GameState.js';
import { HorrorDirector } from './HorrorDirector.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d13);
scene.fog = new THREE.Fog(0x090d13, 8, 40);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 1.7, 9);
scene.add(camera);

const state = new GameState();
const ui = new UIManager();
const audio = new AudioManager();
const world = new WorldBuilder(scene);
world.build();
const player = new PlayerController(camera, renderer.domElement);
const horror = new HorrorDirector(scene, state, audio);

let paused = true;
let inPanel = false;
let currentTarget = null;
const radioMessages = [
  '01:04 — "Keeper, keep the lamp alive. Don\'t let it go dark."',
  '02:17 — [static] "It waits where light does not turn."',
  '03:40 — "If you hear steps, stay calm and keep working."',
  '05:12 — "Dawn soon. Do not answer the knocking."'
];

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const keyState = { e: false };

function setPaused(v) {
  paused = v;
  ui.showPause(v && !state.gameOver && !state.win && !ui.startOverlay.classList.contains('visible'));
}

function tryInteract(held = false, dt = 0) {
  if (!currentTarget) return;
  const t = currentTarget.object.userData.interact;

  if (t === 'fuelcan' && !state.hasFuelCan) {
    state.hasFuelCan = true;
    state.canFilled = false;
    currentTarget.object.visible = false;
    ui.flashMessage('Picked up empty fuel can.');
  }

  if (t === 'barrel' && state.hasFuelCan) {
    state.canFilled = true;
    ui.flashMessage('Fuel can filled.');
  }

  if (t === 'generator') {
    if (state.breakdown && held) {
      state.repairProgress += dt;
      ui.setPrompt(`Holding E... Repair ${(state.repairProgress / 3 * 100).toFixed(0)}%`);
      if (state.repairProgress >= 3) {
        state.breakdown = false;
        state.repairProgress = 0;
        ui.flashMessage('Generator repaired. Main beam restored.');
        audio.beep(420, 0.12, 'sawtooth', 0.12);
      }
      return;
    }

    if (!state.breakdown) {
      inPanel = true;
      setPaused(true);
      ui.showPanel(true);
      document.getElementById('panelText').textContent = state.canFilled
        ? 'Fuel can is ready.'
        : 'Generator running low. You need filled can.';
    }
  }

  if (t === 'radio') {
    const msg = radioMessages[state.radioCount % radioMessages.length];
    state.radioCount++;
    audio.beep(780, 0.09);
    audio.staticBurst();
    ui.flashMessage(msg);
  }
}

function updateInteraction(dt) {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(world.interactables, false);
  currentTarget = hits[0] && hits[0].distance < 2.3 ? hits[0] : null;

  if (!currentTarget) {
    if (!ui.messageTimer) ui.setPrompt('');
    state.repairProgress = 0;
    return;
  }

  const type = currentTarget.object.userData.interact;
  const labels = {
    generator: state.breakdown ? 'Hold E: Repair Generator' : 'E: Open Generator Panel',
    barrel: 'E: Fill Fuel Can',
    fuelcan: state.hasFuelCan ? 'Fuel Can already carried' : 'E: Pick up Fuel Can',
    radio: 'E: Check Radio'
  };
  if (!ui.messageTimer) ui.setPrompt(labels[type]);

  if (keyState.e && type === 'generator' && state.breakdown) tryInteract(true, dt);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    document.exitPointerLock();
    if (!inPanel && !state.gameOver && !state.win && !ui.startOverlay.classList.contains('visible')) setPaused(true);
  }

  if (e.code === 'KeyE') {
    keyState.e = true;
    if (!paused) tryInteract(false, 0);
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyE') {
    keyState.e = false;
    state.repairProgress = 0;
  }
});

function maybeBreakdown() {
  if (!state.breakdown && Math.random() < 0.002) {
    state.breakdown = true;
    ui.flashMessage('Generator failure! Hold E at generator to repair.');
    audio.knock();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (!paused) {
    player.update(dt);
    state.update(dt);
    maybeBreakdown();
    updateInteraction(dt);
    horror.update(dt, camera, world, ui);
    world.update(dt, state);

    if (Math.floor(state.elapsed) % 2 === 0 && (player.move.f || player.move.b || player.move.l || player.move.r)) {
      audio.footstep();
    }

    if (state.gameOver || state.win) {
      setPaused(true);
      ui.showEnd(state.win);
      document.exitPointerLock();
    }
  }

  ui.update(state, player, dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Overlay wiring
const startBtn = document.getElementById('startBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtns = [document.getElementById('restartBtnPause'), document.getElementById('restartBtnEnd')];
const newNightBtn = document.getElementById('newNightBtn');
const sensInput = document.getElementById('sensInput');
const volInput = document.getElementById('volInput');

document.getElementById('refuelBtn').onclick = () => {
  if (state.canFilled) {
    state.generatorFuel = Math.min(100, state.generatorFuel + 45);
    state.canFilled = false;
    ui.flashMessage('Generator refueled.');
    audio.beep(500, 0.1, 'square', 0.08);
  } else {
    ui.flashMessage('No fuel in can.');
  }
};

document.getElementById('closePanelBtn').onclick = () => {
  inPanel = false;
  ui.showPanel(false);
  if (!state.gameOver && !state.win) {
    setPaused(false);
    player.lock();
  }
};

startBtn.onclick = () => {
  audio.init();
  ui.startOverlay.classList.remove('visible');
  setPaused(false);
  sensInput.value = player.sensitivity;
  volInput.value = audio.masterVolume;
  player.lock();
};

resumeBtn.onclick = () => { setPaused(false); player.lock(); };
sensInput.oninput = (e) => player.setSensitivity(parseFloat(e.target.value));
volInput.oninput = (e) => audio.setVolume(parseFloat(e.target.value));
restartBtns.forEach((b) => { b.onclick = () => location.reload(); });
newNightBtn.onclick = () => { localStorage.setItem('nightBoost', '1'); location.reload(); };

if (localStorage.getItem('nightBoost')) {
  state.nightDurationSec = 390;
  localStorage.removeItem('nightBoost');
}

animate();
