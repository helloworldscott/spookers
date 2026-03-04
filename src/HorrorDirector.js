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

    this.vanishTimer = 0;
    this.reappearCooldown = 12;
    this.currentAngle = Math.random() * Math.PI * 2;
    this.grabRange = 2.2;

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

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9a0000 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.1, 1.33, 0.27);
    eyeR.position.set(0.1, 1.33, 0.27);

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), mat);
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), mat);
    this.leftArm.position.set(-0.45, 0.95, 0.1);
    this.rightArm.position.set(0.45, 0.95, 0.1);

    root.add(body, head, eyeL, eyeR, this.leftArm, this.rightArm);
    return root;
  }

  update(dt, player, world, ui) {
    if (this.state.win || this.state.gameOver) return;

    const stressLight = THREE.MathUtils.clamp(this.state.mainLightOffAccum / 20, 0, 3);
    const stressPower = this.state.generatorCharge < 25 ? 1.2 : 0;
    this.stageProgress += dt * (0.55 + stressLight + stressPower);
    if (this.stageProgress > 16 && this.stage < 6) {
      this.stage += 1;
      this.stageProgress = 0;
      ui.flashMessage('Something moved in the fog.');
    }

    this.eventCooldown -= dt;
    if (this.eventCooldown <= 0 && this.state.elapsed > this.nextEvent) {
      this.triggerEvent(world, ui);
      this.eventCooldown = 14 + Math.random() * 14;
      this.nextEvent += 12 + Math.random() * 20;
    }

    const pressure = this.stage >= 2 || this.state.mainLightOffAccum > 8;
    this.reappearCooldown -= dt;
    if (pressure && this.vanishTimer <= 0 && this.reappearCooldown <= 0) {
      this.vanishTimer = 1.2 + Math.random() * 2.4;
      this.reappearCooldown = 9 + Math.random() * 9;
      this.entity.visible = false;
    }

    if (this.vanishTimer > 0) {
      this.vanishTimer -= dt;
      if (this.vanishTimer <= 0) {
        this.currentAngle = Math.random() * Math.PI * 2;
      }
    }

    const baseDist = Math.max(3.2, 17 - this.stage * 2.1);
    const closeBoost = this.state.mainLightOn ? 0 : 2.2;
    const ringDist = Math.max(2.8, baseDist - closeBoost);
    const sweepSpeed = 0.2 + this.stage * 0.1 + (this.state.mainLightOn ? 0 : 0.2);
    this.currentAngle = (this.currentAngle + dt * sweepSpeed) % (Math.PI * 2);

    this.entity.position.set(Math.cos(this.currentAngle) * ringDist, 0, Math.sin(this.currentAngle) * ringDist);
    if (this.vanishTimer <= 0) this.entity.visible = this.stage >= 1;
    this.entity.lookAt(player.position.x, 0.8, player.position.z);

    const armWobble = this.state.elapsed * (8 + this.stage);
    this.leftArm.rotation.z = Math.sin(armWobble) * 1.0;
    this.rightArm.rotation.z = -Math.cos(armWobble * 1.2) * 1.0;

    const dist = player.position.distanceTo(this.entity.position);
    this.audio.presence(1 - Math.min(1, dist / 13));

    if (player.flashlightOn && dist < 10 && this.entity.visible) {
      const dir = new THREE.Vector3();
      player.getWorldDirection(dir);
      const toEntity = this.entity.position.clone().sub(player.position).normalize();
      if (dir.dot(toEntity) > 0.91) this.stageProgress = Math.max(0, this.stageProgress - dt * 6.5);
    }

    if (!this.grabTriggered && this.entity.visible && this.stage >= 4 && dist < this.grabRange) {
      this.grabTriggered = true;
      this.leftArm.scale.y = 2.3;
      this.rightArm.scale.y = 2.3;
      this.entity.position.lerp(player.position.clone().setY(0.8), 0.9);
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
