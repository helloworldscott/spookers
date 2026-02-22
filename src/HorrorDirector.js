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
    this.entity = this.makeEntity();
    this.entity.visible = false;
    scene.add(this.entity);
  }

  makeEntity() {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 2.2, 6), mat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 6, 6), mat);
    head.position.y = 1.3;
    body.position.y = 0.9;
    root.add(body, head);
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
      this.triggerEvent(player, world, ui);
      this.eventCooldown = 18 + Math.random() * 20;
      this.nextEvent += 15 + Math.random() * 25;
    }

    const ringDist = 18 - this.stage * 3;
    const angle = (this.state.elapsed * 0.2) % (Math.PI * 2);
    this.entity.position.set(Math.cos(angle) * ringDist, 0, Math.sin(angle) * ringDist);
    this.entity.visible = this.stage >= 1;

    const dist = player.position.distanceTo(this.entity.position);
    this.audio.presence(1 - Math.min(1, dist / 12));

    if (player.flashlightOn && dist < 10) {
      const dir = new THREE.Vector3();
      player.getWorldDirection(dir);
      const toEntity = this.entity.position.clone().sub(player.position).normalize();
      if (dir.dot(toEntity) > 0.92) {
        this.stageProgress = Math.max(0, this.stageProgress - dt * 8);
      }
    }

    if (this.stage >= 5 && dist < 1.8) {
      this.state.gameOver = true;
      ui.flashMessage('The thing in the fog found you.');
      this.audio.knock();
      this.audio.staticBurst();
    }
  }

  triggerEvent(player, world, ui) {
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
