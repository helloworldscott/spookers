import { THREE } from './engine.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.islandRadius = 22;
    this.colliders = [];
    this.interactables = [];
    this.logs = [];

    this.poi = {};
    this.build();
  }

  addBoxCollider(cx, cz, sx, sz) {
    this.colliders.push({ cx, cz, hx: sx * 0.5, hz: sz * 0.5 });
  }

  collidesCircle(x, z, r) {
    for (const c of this.colliders) {
      const nx = Math.max(c.cx - c.hx, Math.min(x, c.cx + c.hx));
      const nz = Math.max(c.cz - c.hz, Math.min(z, c.cz + c.hz));
      const dx = x - nx;
      const dz = z - nz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  build() {
    const ambient = new THREE.AmbientLight(0x7d8ea4, 0.22);
    this.scene.add(ambient);
    const moon = new THREE.DirectionalLight(0x9db2cd, 0.45);
    moon.position.set(10, 14, 4);
    this.scene.add(moon);

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(this.islandRadius - 1, this.islandRadius + 2, 2.2, 36),
      new THREE.MeshStandardMaterial({ color: 0x2a342f, flatShading: true })
    );
    ground.position.y = -1.1;
    this.scene.add(ground);

    this.ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(280, 280, 40, 40),
      new THREE.MeshStandardMaterial({ color: 0x112436, flatShading: true, transparent: true, opacity: 0.95 })
    );
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -1.35;
    this.scene.add(this.ocean);

    this.buildLighthouse();
    this.buildGeneratorShack();
    this.buildRadioTower();
    this.buildStorageShed();
    this.buildDock();
    this.scatterRocks();
    this.spawnLogs();
  }

  buildLighthouse() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb2c0cf, flatShading: true });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 4.1, 12, 10), mat);
    base.position.set(0, 4.9, 0);
    this.scene.add(base);
    this.addBoxCollider(0, 0, 7.5, 7.5);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0x5f6c7b, flatShading: true }));
    top.position.set(0, 11.5, 0);
    this.scene.add(top);

    const control = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x7dc3ff, flatShading: true, emissive: 0x1f4d72, emissiveIntensity: 0.8 }));
    control.position.set(5.2, 0.1, 0);
    control.userData = { interact: 'beam_control' };
    this.scene.add(control);
    this.interactables.push(control);
    this.poi.lighthouseControl = control;
  }

  buildGeneratorShack() {
    const shack = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.2, 4.6), new THREE.MeshStandardMaterial({ color: 0x574839, flatShading: true }));
    shack.position.set(9, 0.5, 7);
    this.scene.add(shack);
    this.addBoxCollider(9, 7, 5.8, 4.6);

    const generator = new THREE.Mesh(new THREE.BoxGeometry(2, 1.3, 1.4), new THREE.MeshStandardMaterial({ color: 0x58616e, flatShading: true }));
    generator.position.set(6.2, -0.2, 7);
    generator.userData = { interact: 'generator' };
    this.scene.add(generator);
    this.interactables.push(generator);
    this.poi.generator = generator;

    const key = new THREE.Mesh(new THREE.TorusKnotGeometry(0.16, 0.05, 45, 6), new THREE.MeshStandardMaterial({ color: 0xd6b05a, flatShading: true }));
    key.position.set(-10.5, 0.05, -12.8);
    key.userData = { interact: 'shack_key' };
    this.scene.add(key);
    this.interactables.push(key);
    this.poi.shackKey = key;
  }

  buildRadioTower() {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 9, 6), new THREE.MeshStandardMaterial({ color: 0x708096, flatShading: true }));
    pole.position.set(-12, 3.5, 8.8);
    this.scene.add(pole);

    const fuse = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: 0x8597b0, flatShading: true }));
    fuse.position.set(-11.2, 0.2, 8.6);
    fuse.userData = { interact: 'radio_fuse' };
    this.scene.add(fuse);
    this.interactables.push(fuse);
    this.poi.fuseBox = fuse;
  }

  buildStorageShed() {
    const shed = new THREE.Mesh(new THREE.BoxGeometry(5, 3.1, 4.2), new THREE.MeshStandardMaterial({ color: 0x4f4033, flatShading: true }));
    shed.position.set(-10, 0.5, -8.2);
    this.scene.add(shed);
    this.addBoxCollider(-10, -8.2, 5, 4.2);

    const can = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.3), new THREE.MeshStandardMaterial({ color: 0xa84332, flatShading: true }));
    can.position.set(-7.8, -0.18, -7.1);
    can.userData = { interact: 'fuel_can' };
    this.scene.add(can);
    this.interactables.push(can);
    this.poi.fuelCan = can;
  }

  buildDock() {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.45, 2.2), new THREE.MeshStandardMaterial({ color: 0x4f4033, flatShading: true }));
    dock.position.set(0, -0.5, -16.6);
    this.scene.add(dock);

    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.6), new THREE.MeshStandardMaterial({ color: 0x71839d, flatShading: true }));
    radio.position.set(0.4, -0.1, -15.8);
    radio.userData = { interact: 'radio_call' };
    this.scene.add(radio);
    this.interactables.push(radio);
    this.poi.radioCall = radio;
  }

  scatterRocks() {
    const m = new THREE.MeshStandardMaterial({ color: 0x1a2028, flatShading: true });
    for (let i = 0; i < 35; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.65), m);
      const a = Math.random() * Math.PI * 2;
      const r = 7 + Math.random() * 13;
      rock.position.set(Math.cos(a) * r, -0.55, Math.sin(a) * r);
      this.scene.add(rock);
    }
  }

  spawnLogs() {
    const pages = [
      { pos: [13, -0.2, -4], text: 'Page 1: The beam is a promise.' },
      { pos: [-13, -0.2, 2], text: 'Page 2: They wait for shadow.' },
      { pos: [2, -0.2, 14], text: 'Page 3: Keep fuel close.' },
      { pos: [-4, -0.2, -14], text: 'Page 4: The fifth dawn lies.' },
      { pos: [15, -0.2, 10], text: 'Page 5: Destroying light frees it.' }
    ];
    for (const [i, p] of pages.entries()) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0xe8e1d2, flatShading: true }));
      mesh.position.set(...p.pos);
      mesh.userData = { interact: 'log_page', pageIndex: i, pageText: p.text };
      this.scene.add(mesh);
      this.interactables.push(mesh);
      this.logs.push(mesh);
    }
  }

  raycastInteract(raycaster, camera, maxDist = 2.5) {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = raycaster.intersectObjects(this.interactables, true);
    const hit = hits.find((h) => h.distance <= maxDist);
    return hit || null;
  }

  removeInteractable(obj) {
    obj.visible = false;
    this.interactables = this.interactables.filter((x) => x !== obj);
  }

  update(dt, elapsed, fogDensity) {
    const p = this.ocean.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, Math.sin((x + elapsed * 1.8) * 0.08) * 0.12 + Math.cos((y + elapsed) * 0.11) * 0.1);
    }
    p.needsUpdate = true;
    this.ocean.geometry.computeVertexNormals();
    this.scene.fog.density = fogDensity;
  }
}
