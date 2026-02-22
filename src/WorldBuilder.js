import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
    this.interactables = [];
    this.tempEffects = [];
    this.blackoutTimer = 0;
    this.lightIntensityScale = 1;

    this.materials = {
      ground: new THREE.MeshStandardMaterial({ color: 0x2a302e, flatShading: true }),
      ocean: new THREE.MeshStandardMaterial({ color: 0x101e2e, flatShading: true }),
      wood: new THREE.MeshStandardMaterial({ color: 0x4f3f33, flatShading: true }),
      metal: new THREE.MeshStandardMaterial({ color: 0x6d7885, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: 0x101215, flatShading: true })
    };
  }

  build() {
    const ambient = new THREE.AmbientLight(0x7f8ca1, 0.25);
    this.scene.add(ambient);
    this.mainMoon = new THREE.DirectionalLight(0xa8b2c8, 0.45);
    this.mainMoon.position.set(8, 12, 5);
    this.scene.add(this.mainMoon);

    const island = new THREE.Mesh(new THREE.CylinderGeometry(18, 21, 2, 9), this.materials.ground);
    island.position.y = -1;
    this.scene.add(island);

    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 32, 32), this.materials.ocean);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -1.2;
    this.scene.add(this.ocean);

    this.buildLighthouse();
    this.buildYard();
    this.buildShed();
    this.buildRoom();
  }

  buildLighthouse() {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.5, 11, 8), this.materials.wood);
    tower.position.set(0, 4.5, 0);
    this.scene.add(tower);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.1, 8), this.materials.metal);
    top.position.set(0, 10.8, 0);
    this.scene.add(top);

    this.beamRoot = new THREE.Group();
    this.beamRoot.position.set(0, 11, 0);
    this.mainSpot = new THREE.SpotLight(0xe8f3ff, 2.2, 36, Math.PI / 6, 0.45, 1);
    this.mainSpot.position.set(0, 0, 0);
    this.mainSpot.target.position.set(12, -2, 0);
    this.beamRoot.add(this.mainSpot, this.mainSpot.target);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 17, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xdde9ff, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })
    );
    cone.rotation.z = -Math.PI / 2;
    cone.position.set(8, -1.2, 0);
    this.beamCone = cone;
    this.beamRoot.add(cone);
    this.scene.add(this.beamRoot);
  }

  buildYard() {
    for (let i = 0; i < 20; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.6), this.materials.dark);
      const a = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 8;
      rock.position.set(Math.cos(a) * r, -0.5, Math.sin(a) * r);
      this.scene.add(rock);
    }
    const dock = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 2), this.materials.wood);
    dock.position.set(0, -0.5, -15.5);
    this.scene.add(dock);
  }

  buildShed() {
    const shed = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3, 4), this.materials.wood);
    shed.position.set(9, 0.5, 6);
    this.scene.add(shed);

    this.generator = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1), this.materials.metal);
    this.generator.position.set(8.3, -0.1, 6);
    this.generator.userData.interact = 'generator';
    this.scene.add(this.generator);
    this.interactables.push(this.generator);

    this.breaker = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.25), this.materials.metal);
    this.breaker.position.set(10.4, 0.3, 7.5);
    this.breaker.userData.interact = 'breaker';
    this.scene.add(this.breaker);
    this.interactables.push(this.breaker);

    this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 8), this.materials.dark);
    this.barrel.position.set(10, -0.45, 5.1);
    this.barrel.userData.interact = 'barrel';
    this.scene.add(this.barrel);
    this.interactables.push(this.barrel);

    this.fuelCan = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.25), new THREE.MeshStandardMaterial({ color: 0xa3362b, flatShading: true }));
    this.fuelCan.position.set(9.3, -0.2, 4.9);
    this.fuelCan.userData.interact = 'fuelcan';
    this.scene.add(this.fuelCan);
    this.interactables.push(this.fuelCan);
  }

  buildRoom() {
    const room = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), this.materials.wood);
    room.position.set(-7, 0.5, 6);
    this.scene.add(room);

    this.radio = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.4), this.materials.metal);
    this.radio.position.set(-6.4, 0.45, 6.8);
    this.radio.userData.interact = 'radio';
    this.scene.add(this.radio);
    this.interactables.push(this.radio);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 1), this.materials.dark);
    bed.position.set(-8.4, -0.3, 5.8);
    this.scene.add(bed);
  }

  update(dt, state) {
    this.beamRoot.rotation.y += dt * 0.55;

    const off = !state.mainLightOn || this.blackoutTimer > 0;
    const flicker = state.generatorFuel < 15 ? (Math.sin(state.elapsed * 22) * 0.4 + 0.6) : 1;
    const intensity = off ? 0 : 2.2 * flicker * this.lightIntensityScale;
    this.mainSpot.intensity = intensity;
    this.beamCone.visible = intensity > 0.1;

    this.blackoutTimer = Math.max(0, this.blackoutTimer - dt);
    this.lightIntensityScale += (1 - this.lightIntensityScale) * dt * 2;

    const p = this.ocean.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, Math.sin((x + state.elapsed * 1.6) * 0.08) * 0.12 + Math.cos((y + state.elapsed) * 0.11) * 0.1);
    }
    p.needsUpdate = true;
    this.ocean.geometry.computeVertexNormals();

    this.tempEffects = this.tempEffects.filter((fx) => {
      fx.life -= dt;
      fx.update?.(dt);
      if (fx.life <= 0) this.scene.remove(fx.mesh);
      return fx.life > 0;
    });
  }

  blackout(t) { this.blackoutTimer = Math.max(this.blackoutTimer, t); }
  flickerLights() { this.lightIntensityScale = 0.2; }

  lightning() {
    this.mainMoon.intensity = 1.8;
    this.lightIntensityScale = 1.7;
    setTimeout(() => { this.mainMoon.intensity = 0.45; }, 100);
  }

  showHandprint() {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xd4d9de, transparent: true, opacity: 0.3 })
    );
    mesh.position.set(-6.1, 0.7, 7.2);
    mesh.rotation.y = Math.PI / 2;
    this.scene.add(mesh);
    this.tempEffects.push({ mesh, life: 8 });
  }

  spawnShadowCross() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.4), this.materials.dark);
    mesh.position.set(-14, 0, -8);
    this.scene.add(mesh);
    this.tempEffects.push({ mesh, life: 4, update: (dt) => (mesh.position.x += dt * 7) });
  }
}
