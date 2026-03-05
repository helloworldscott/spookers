import { createEngine } from './src/engine.js';
import { InputController } from './src/input.js';
import { Player } from './src/player.js';
import { World } from './src/world.js';
import { LighthouseSystem } from './src/lighthouse.js';
import { GeneratorSystem } from './src/generator.js';
import { AISystem } from './src/ai.js';
import { NightManager } from './src/nights.js';
import { UI } from './src/ui.js';
import { AudioSystem } from './src/audio.js';

const engine = createEngine(document.getElementById('game'));
const world = new World(engine.scene);
const input = new InputController(engine.camera, engine.renderer.domElement);
const player = new Player(engine.camera);
const lighthouse = new LighthouseSystem(engine.scene, world);
const generator = new GeneratorSystem();
const ai = new AISystem(engine.scene);
const nights = new NightManager();
const ui = new UI();
const audio = new AudioSystem();

const raycaster = new engine.THREE.Raycaster();
let paused = true;
let gameOver = false;
let logbookOpen = false;
let lensPuzzleOpen = false;
let choicesShown = false;
let radioFixed = false;
let radioCallMade = false;
let lensValues = [0, 0, 0];
let lensSolved = false;
let faultWarnCooldown = 0;
let objectiveState = {
  night2cans: 0,
  collectedPages: [],
  currentText: 'Find the key and start the generator.'
};

function resetNightEntities() {
  ai.resetForNight(nights.getConfig());
}
resetNightEntities();

function setPaused(v) {
  paused = v;
}

function getInteractType(object) {
  let cur = object;
  while (cur) {
    if (cur.userData?.interact) return cur.userData.interact;
    cur = cur.parent;
  }
  return null;
}

function updateObjectives() {
  const n = nights.night;
  if (n === 1) {
    if (!generator.hasShackKey) objectiveState.currentText = 'Find key to generator shack (Dock side).';
    else if (!generator.started) objectiveState.currentText = 'Start generator at Generator Shack.';
    else objectiveState.currentText = 'Survive until dawn.';
  } else if (n === 2) {
    objectiveState.currentText = `Deliver fuel cans to generator: ${objectiveState.night2cans}/2`;
  } else if (n === 3) {
    objectiveState.currentText = radioFixed ? 'Survive until dawn.' : 'Repair radio tower fuse box.';
  } else if (n === 4) {
    objectiveState.currentText = lensSolved ? 'Survive until dawn.' : 'Align lighthouse lens (3 knobs).';
  } else if (n === 5) {
    if (!choicesShown) objectiveState.currentText = 'Return to lighthouse control and choose your fate.';
    else if (objectiveState.finalChoice === 'escape' && !radioCallMade) objectiveState.currentText = 'Use dock radio to call rescue, then survive.';
    else objectiveState.currentText = 'Survive until dawn to complete your fate.';
  }
}

function interactTap(type, obj) {
  if (type === 'shack_key' && !generator.hasShackKey) {
    generator.hasShackKey = true;
    world.removeInteractable(obj);
    ui.flash('Picked up shack key.');
    audio.tone(520, 0.08, 'square', 0.06);
  }

  if (type === 'generator') {
    if (!generator.started) {
      if (generator.start()) {
        ui.flash('Generator started. Beam online.');
      } else {
        ui.flash('Generator shack locked. Need key.');
      }
      return;
    }

    if (generator.carryingFuelCan) {
      if (generator.addFuelFromCan()) {
        ui.flash('Fuel can emptied into generator.');
        if (nights.night === 2) objectiveState.night2cans += 1;
      }
      return;
    }

    lighthouse.takeManualControl(6);
    ui.flash('Manual beam control enabled (Arrow Left/Right).', 2.5);
  }

  if (type === 'fuel_can') {
    if (generator.carryingFuelCan) {
      ui.flash('Already carrying a fuel can.');
      return;
    }
    generator.carryingFuelCan = true;
    ui.flash('Picked up fuel can. Bring to generator.');
  }

  if (type === 'radio_fuse' && nights.night >= 3) {
    ui.flash('Hold E to repair fuse box.');
  }

  if (type === 'beam_control') {
    if (nights.night === 4 && !lensSolved) {
      lensPuzzleOpen = true;
      ui.showLens(true, lensValues);
      setPaused(true);
    } else if (nights.night === 5 && !choicesShown) {
      choicesShown = true;
      ui.showChoice(true);
      setPaused(true);
    } else {
      lighthouse.takeManualControl(6);
      ui.flash('Manual beam control enabled (Arrow Left/Right).', 2.5);
    }
  }

  if (type === 'radio_call' && nights.night === 5 && radioFixed) {
    radioCallMade = true;
    ui.flash('Distress call sent. Keep beam alive!');
  }

  if (type === 'log_page') {
    const { pageIndex, pageText } = obj.userData;
    if (!objectiveState.collectedPages.includes(pageIndex)) {
      objectiveState.collectedPages.push(pageIndex);
      objectiveState.collectedPages.sort((a, b) => a - b);
      ui.flash('Log page collected.');
      world.removeInteractable(obj);
      objectiveState.collectedPagesText = objectiveState.collectedPages.map((idx) => {
        const p = world.logs[idx];
        return p?.userData?.pageText || pageText;
      });
    }
  }
}

let radioRepairHold = 0;
function interactHold(type, dt) {
  if (type === 'generator' && generator.faulted) {
    const fixed = generator.holdRepair(dt);
    ui.setPrompt(`Repairing generator... ${(generator.repairProgress / 2.6 * 100).toFixed(0)}%`, true);
    if (fixed) {
      ui.flash('Generator repaired.');
      audio.alarm();
    }
    return;
  }

  if (type === 'radio_fuse' && nights.night >= 3 && !radioFixed) {
    radioRepairHold += dt;
    ui.setPrompt(`Repairing fuse box... ${(radioRepairHold / 2.8 * 100).toFixed(0)}%`, true);
    if (radioRepairHold >= 2.8) {
      radioFixed = true;
      radioRepairHold = 0;
      ui.flash('Radio tower fuse repaired.');
      audio.alarm();
    }
  }
}

function releaseHold() {
  generator.stopRepair();
  radioRepairHold = 0;
}

function showContextPrompt(type) {
  const prompts = {
    shack_key: 'E: Pick up shack key',
    generator: generator.faulted
      ? 'HOLD E: Repair generator fault'
      : (generator.carryingFuelCan ? 'E: Pour fuel into generator' : 'E: Start/Control generator'),
    fuel_can: generator.carryingFuelCan ? 'Carrying fuel can' : 'E: Pick up fuel can',
    radio_fuse: nights.night >= 3 ? (radioFixed ? 'Fuse box fixed' : 'HOLD E: Repair fuse box') : 'Fuse box (Night 3 objective)',
    beam_control: nights.night === 4 && !lensSolved ? 'E: Align lens knobs' : (nights.night === 5 ? 'E: Final choice' : 'E: Beam controls'),
    radio_call: nights.night === 5 ? (radioFixed ? 'E: Call for rescue' : 'Repair radio tower first') : 'Radio set',
    log_page: 'E: Collect log page'
  };
  ui.setPrompt(prompts[type] || 'E: Interact');
}

function evaluateEnding() {
  if (nights.night < 5) return;
  if (generator.power <= 0 || !lighthouse.beamOn) {
    gameOver = true;
    ui.showEnd('DARKNESS', 'The beam failed on the final night. The island swallowed you.');
  }
}

function finishNight() {
  if (nights.night === 1 && !generator.started) {
    gameOver = true;
    ui.showEnd('DARKNESS', 'You never started the generator. Night took the island.');
    return;
  }
  if (nights.night === 2 && objectiveState.night2cans < 2) {
    gameOver = true;
    ui.showEnd('DARKNESS', 'You failed to deliver enough fuel on Night 2.');
    return;
  }
  if (nights.night === 3 && !radioFixed) {
    gameOver = true;
    ui.showEnd('DARKNESS', 'The radio tower remained broken. The signals died.');
    return;
  }
  if (nights.night === 4 && !lensSolved) {
    gameOver = true;
    ui.showEnd('DARKNESS', 'You failed to align the lighthouse lens.');
    return;
  }

  if (nights.night < 5) {
    ui.showDawn(`Night ${nights.night} survived. Logs: ${objectiveState.collectedPages.length}/5`);
    setPaused(true);
    return;
  }

  if (objectiveState.finalChoice === 'escape' && radioCallMade) {
    gameOver = true;
    ui.showEnd('ESCAPE', 'Rescue horn across the sea. You survived and escaped.');
    return;
  }

  if (objectiveState.finalChoice === 'keeper') {
    gameOver = true;
    ui.showEnd('KEEPER', 'You remain. At dusk, the beam turns by itself, and so do you.');
    return;
  }

  if (objectiveState.finalChoice === 'destroy') {
    const truth = objectiveState.collectedPages.length === 5;
    gameOver = true;
    ui.showEnd(truth ? 'TRUTH' : 'DARKNESS', truth
      ? 'With all pages found, you shattered the lens and learned the light fed the creatures, not you.'
      : 'You destroyed the lighthouse blind. Darkness consumed the island.');
    return;
  }

  gameOver = true;
  ui.showEnd('DARKNESS', 'Night 5 ended without a completed fate.');
}

ui.startBtn.onclick = () => {
  audio.init();
  ui.startOverlay.classList.remove('visible');
  setPaused(false);
  ui.flash('Click game to lock pointer. Keep beam active.', 3);
};
ui.nextNightBtn.onclick = () => {
  ui.hideDawn();
  nights.beginNextNight();
  if (!nights.completed) {
    generator.faulted = false;
    generator.repairProgress = 0;
    resetNightEntities();
    setPaused(false);
  }
};
ui.restartBtn.onclick = () => location.reload();

ui.choiceEscape.onclick = () => {
  objectiveState.finalChoice = 'escape';
  ui.showChoice(false);
  setPaused(false);
  ui.flash('Use dock radio now. Keep the beam alive.');
};
ui.choiceKeeper.onclick = () => {
  objectiveState.finalChoice = 'keeper';
  ui.showChoice(false);
  setPaused(false);
  ui.flash('Remain until dawn to become keeper.');
};
ui.choiceDestroy.onclick = () => {
  objectiveState.finalChoice = 'destroy';
  ui.showChoice(false);
  setPaused(false);
  ui.flash('Destroy path chosen. Survive to finish the ritual.');
};

ui.lensK1.onclick = () => { lensValues[0] = (lensValues[0] + 1) % 4; ui.showLens(true, lensValues); };
ui.lensK2.onclick = () => { lensValues[1] = (lensValues[1] + 1) % 4; ui.showLens(true, lensValues); };
ui.lensK3.onclick = () => { lensValues[2] = (lensValues[2] + 1) % 4; ui.showLens(true, lensValues); };
ui.lensClose.onclick = () => { lensPuzzleOpen = false; ui.showLens(false, lensValues); setPaused(false); };

function updateLensPuzzle() {
  if (!lensSolved && lensValues[0] === 2 && lensValues[1] === 2 && lensValues[2] === 2) {
    lensSolved = true;
    lensPuzzleOpen = false;
    ui.showLens(false, lensValues);
    setPaused(false);
    ui.flash('Lens aligned. Beam focus restored.');
    lighthouse.autoRotateSpeed = 0.65;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = engine.getDelta();

  if (!paused && !gameOver) {
    player.update(dt, input, world);

    const nightConfig = nights.getConfig();
    generator.update(dt, nightConfig);
    lighthouse.update(dt, input, generator, nightConfig);

    const inLight = lighthouse.isPointLit(engine.camera.position);
    player.darknessTimer = inLight ? Math.max(0, player.darknessTimer - dt * 2) : Math.min(12, player.darknessTimer + dt);

    const aiState = ai.update(dt, engine.camera.position, lighthouse, player.darknessTimer);
    if (aiState.lethal && !inLight) {
      gameOver = true;
      audio.sting();
      ui.showEnd('DARKNESS', 'A creature reached you in the dark.');
    }

    if (Math.random() < 0.07 && input.getMoveVector().f !== 0) audio.footstep();
    audio.update(dt, aiState.nearDeathPulse);

    const hit = world.raycastInteract(raycaster, engine.camera, 2.5);
    if (hit) {
      const type = getInteractType(hit.object);
      showContextPrompt(type);
      if (input.consumeInteractPressed()) interactTap(type, hit.object);
      if (input.interactHeld) interactHold(type, dt);
      else releaseHold();
    } else {
      releaseHold();
      ui.setPrompt('');
    }

    faultWarnCooldown = Math.max(0, faultWarnCooldown - dt);
    if (generator.faulted && faultWarnCooldown <= 0) {
      ui.flash('Generator FAULT! Repair immediately.', 1.2);
      faultWarnCooldown = 2.5;
      audio.alarm();
    }

    nights.update(dt);
    if (nights.inDawn) {
      finishNight();
    }
    evaluateEnding();

    world.update(dt, nights.elapsed, nightConfig.fog);
  }

  if (input.consumeLogToggle()) {
    logbookOpen = !logbookOpen;
    ui.showLogbook(logbookOpen, objectiveState.collectedPages.map((idx) => world.logs[idx]?.userData?.pageText || `Page ${idx + 1}`));
  }

  updateObjectives();
  updateLensPuzzle();
  ui.update({ nights, generator, objectives: objectiveState }, dt);
  engine.render();
}

animate();
