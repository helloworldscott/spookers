import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class HorrorDirector {
  constructor(scene, gameState, audio) {
    this.scene = scene;
    this.state = gameState;
    this.audio = audio;
    this.stage = 0;
    this.stageProgress = 0;
    this.nextEvent = 10;
    this.eventCooldown = 0;
    this.grabTriggered = false;
    this.entity = this.makeEntity();
    this.entity.visible = false;
    scene.add(this.entity);
  }

  makeEntity() {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 1 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 2.2, 6), mat);
    body.position.y = 0.9;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 7, 6), mat);
    head.position.y = 1.3;

    // Face indicators so player can read orientation
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7f0000 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.1, 1.33, 0.27);
    eyeR.position.set(0.1, 1.33, 0.27);
    const faceArrow = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), eyeMat);
    faceArrow.rotation.x = Math.PI / 2;
    faceArrow.position.set(0, 1.2, 0.34);

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), mat);
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), mat);
    this.leftArm.position.set(-0.45, 0.95, 0.1);
    this.rightArm.position.set(0.45, 0.95, 0.1);

    root.add(body, head, eyeL, eyeR, faceArrow, this.leftArm, this.rightArm);
    return root;
  }

  update(dt, player, world, ui) {
    if (this.state.win || this.state.gameOver) return;

    const stress = THREE.MathUtils.clamp(this.state.mainLightOffAccum / 25, 0, 2.5);
    this.stageProgress += dt * (0.4 + stress);
    if (this.stageProgress > 22 && this.stage < 5) {
      this.stage += 1;
      this.stageProgress = 0;
    }

    this.eventCooldown -= dt;
    if (this.eventCooldown <= 0 && this.state.elapsed > this.nextEvent) {
      this.triggerEvent(world, ui);
      this.eventCooldown = 18 + Math.random() * 20;
      this.nextEvent += 15 + Math.random() * 25;
    }

    const ringDist = 18 - this.stage * 3;
    const angle = (this.state.elapsed * 0.2) % (Math.PI * 2);
    this.entity.position.set(Math.cos(angle) * ringDist, 0, Math.sin(angle) * ringDist);
    this.entity.lookAt(player.position.x, 0.8, player.position.z);
    this.entity.visible = this.stage >= 1;

    // Wild arm motion escalates as the entity gets closer.
    const armWobble = this.state.elapsed * 7 + this.stage * 0.8;
    this.leftArm.rotation.z = Math.sin(armWobble) * 0.8;
    this.rightArm.rotation.z = -Math.cos(armWobble * 1.1) * 0.8;

    const dist = player.position.distanceTo(this.entity.position);
    this.audio.presence(1 - Math.min(1, dist / 12));

    if (player.flashlightOn && dist < 10) {
      const dir = new THREE.Vector3();
      player.getWorldDirection(dir);
      const toEntity = this.entity.position.clone().sub(player.position).normalize();
      if (dir.dot(toEntity) > 0.92) this.stageProgress = Math.max(0, this.stageProgress - dt * 8);
    }

    if (!this.grabTriggered && this.stage >= 5 && dist < 1.8) {
      this.grabTriggered = true;
      this.leftArm.scale.y = 2.2;
      this.rightArm.scale.y = 2.2;
      this.entity.position.lerp(player.position.clone().setY(0.8), 0.85);
      ui.triggerJumpscare();
      this.audio.jumpscare();
      this.state.gameOver = true;
    }
  }

  triggerEvent(world, ui) {
    const events = [
      () => { ui.flashMessage('Knocking echoes from the keeper room door.'); this.audio.knock(); ui.shake(0.2); },
      () => { ui.flashMessage('Footsteps circle the lighthouse stairs.'); this.audio.footstep(); },
      () => { ui.flashMessage('Radio spits static and a whisper.'); this.audio.staticBurst(); },
      () => { ui.flashMessage('A shadow crosses the beam offshore.'); world.spawnShadowCross(); },
      () => { ui.flashMessage('Window fog blooms with a handprint.'); world.showHandprint(); },
      () => { ui.flashMessage('Lights flicker violently.'); world.flickerLights(); },
      () => { ui.flashMessage('Brief blackout.'); world.blackout(1.6); },
      () => { ui.flashMessage('Lightning tears open the sky.'); world.lightning(); this.audio.thunder(); }
    ];
    events[Math.floor(Math.random() * events.length)]();
  }
}
