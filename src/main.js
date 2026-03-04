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
let warnedChargeDepleted = false;
let warnedFuelEmpty = false;
const radioMessages = [
  '01:04 — "Keeper, keep the lamp alive. Don\'t let it go dark."',
  '02:17 — [static] "It waits where light does not turn."',
  '03:40 — "If you hear steps, stay calm and keep working."',
  '05:12 — "Dawn soon. Do not answer the knocking."'
];

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();
const keyState = { e: false };

function getGeneratorPromptText() {
  if (state.breakdown) return 'Generator broken: hold E to repair';
  if (state.generatorFuel <= 0) return 'Out of fuel: refill from can';
  if (state.generatorCharge <= 4) return 'Generator depleted: hold E to charge';
  return 'E: Open Generator Panel / Hold E: Charge';
}

function getGeneratorPanelText() {
  return [
    `Fuel: ${state.generatorFuel.toFixed(0)}%`,
    `Charge: ${state.generatorCharge.toFixed(0)}%`,
    `Breakdown: ${state.breakdown ? 'BROKEN' : 'OK'}`,
    state.canFilled
      ? 'Fuel can is ready. Hold E outside panel to charge coils.'
      : 'Generator running low. Fill can, then refuel. Hold E to charge coils.'
  ].join('\n');
}

function setPaused(v) {
  paused = v;
  ui.showPause(v && !state.gameOver && !state.win && !ui.startOverlay.classList.contains('visible'));
}

function tryInteract(held = false, dt = 0) {
  if (!currentTarget) return;
  const t = getInteractType(currentTarget.object);

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
        state.chargeProgress = 0;
        ui.flashMessage('Generator repaired. Main beam restored.');
        audio.beep(420, 0.12, 'sawtooth', 0.12);
      }
      return;
    }

    if (!state.breakdown && held) {
      state.chargeProgress += dt;
      state.generatorCharge = Math.min(100, state.generatorCharge + dt * 24);
      ui.setPrompt(`Charging coils... ${state.generatorCharge.toFixed(0)}%`);
      if (state.chargeProgress >= 1.5) {
        state.chargeProgress = 0;
        audio.beep(640, 0.08, 'square', 0.09);
      }
      return;
    }

    if (!state.breakdown) {
      inPanel = true;
      setPaused(true);
      ui.showPanel(true);
      document.getElementById('panelText').textContent = getGeneratorPanelText();
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


function getInteractType(hitObject) {
  let cur = hitObject;
  while (cur) {
    if (cur.userData && cur.userData.interact) return cur.userData.interact;
    cur = cur.parent;
  }
  return null;
}

function updateInteraction(dt) {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(world.interactables, true);
  currentTarget = hits[0] && hits[0].distance < 2.3 ? hits[0] : null;

  if (!currentTarget) {
    if (!ui.messageTimer) ui.setPrompt('');
    state.repairProgress = 0;
    state.chargeProgress = 0;
    return;
  }

  const type = getInteractType(currentTarget.object);
  const labels = {
    generator: getGeneratorPromptText(),
    barrel: 'E: Fill Fuel Can',
    fuelcan: state.hasFuelCan ? 'Fuel Can already carried' : 'E: Pick up Fuel Can',
    radio: 'E: Check Radio'
  };
  if (!ui.messageTimer) ui.setPrompt(labels[type]);

  if (keyState.e && type === 'generator') tryInteract(true, dt);
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
    state.chargeProgress = 0;
  }
});

function maybeBreakdown() {
  if (!state.breakdown && Math.random() < 0.002) {
    state.breakdown = true;
    ui.flashMessage('Generator broken: hold E to repair');
    audio.knock();
  }
}

function collidesWithEnemy(pos) {
  if (!horror.entity.visible) return false;
  const d = pos.distanceTo(horror.entity.position);
  if (d < horror.grabRange + 0.05) return false;
  return d < 1.15;
}

function resolvePlayerCollision(prevPos) {
  const p = camera.position;
  const r = 0.35;

  // World blockers
  if (world.collidesCircleAt(p.x, p.z, r) || collidesWithEnemy(p)) {
    const testX = { x: p.x, z: prevPos.z };
    const hitX = world.collidesCircleAt(testX.x, testX.z, r) || collidesWithEnemy(new THREE.Vector3(testX.x, p.y, testX.z));
    const testZ = { x: prevPos.x, z: p.z };
    const hitZ = world.collidesCircleAt(testZ.x, testZ.z, r) || collidesWithEnemy(new THREE.Vector3(testZ.x, p.y, testZ.z));

    if (hitX && hitZ) {
      p.x = prevPos.x;
      p.z = prevPos.z;
    } else if (hitX) {
      p.x = prevPos.x;
    } else if (hitZ) {
      p.z = prevPos.z;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (!paused) {
    const prevPos = camera.position.clone();
    player.update(dt);
    resolvePlayerCollision(prevPos);
    state.update(dt);
    if (!warnedChargeDepleted && state.generatorCharge <= 4 && !state.breakdown) {
      ui.flashMessage('Generator depleted: hold E to charge');
      warnedChargeDepleted = true;
    }
    if (!warnedFuelEmpty && state.generatorFuel <= 0) {
      ui.flashMessage('Out of fuel: refill from can');
      warnedFuelEmpty = true;
    }
    if (state.generatorCharge > 4) warnedChargeDepleted = false;
    if (state.generatorFuel > 0) warnedFuelEmpty = false;
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

  if (inPanel) {
    document.getElementById('panelText').textContent = getGeneratorPanelText();
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
    state.generatorCharge = Math.min(100, state.generatorCharge + 12);
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
