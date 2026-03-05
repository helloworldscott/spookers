import { THREE } from './engine.js';

export class LighthouseSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.rotation = 0;
    this.autoRotateSpeed = 0.55;
    this.manualControl = false;
    this.manualTimer = 0;
    this.beamOn = true;

    this.root = new THREE.Group();
    this.root.position.set(0, 11.7, 0);

    this.spot = new THREE.SpotLight(0xe6f2ff, 2.2, 44, Math.PI / 7, 0.42, 1);
    this.spot.position.set(0, 0, 0);
    this.target = new THREE.Object3D();
    this.target.position.set(12, -2.8, 0);
    this.root.add(this.spot);
    scene.add(this.target);
    this.spot.target = this.target;

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 20, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xdbe9ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.rotation.z = -Math.PI / 2;
    cone.position.set(9.8, -1.8, 0);
    this.cone = cone;
    this.root.add(cone);
    scene.add(this.root);
  }

  update(dt, input, generator, nightConfig) {
    this.manualTimer = Math.max(0, this.manualTimer - dt);
    if (this.manualTimer <= 0) this.manualControl = false;

    if (this.manualControl) {
      if (input.keys.has('ArrowLeft') || input.keys.has('KeyJ')) this.rotation += dt * 1.2;
      if (input.keys.has('ArrowRight') || input.keys.has('KeyL')) this.rotation -= dt * 1.2;
    } else {
      this.rotation += dt * this.autoRotateSpeed;
    }

    this.root.rotation.y = this.rotation;

    const beamDrain = nightConfig.beamDrain * dt;
    this.beamOn = generator.consumeForBeam(beamDrain);
    this.spot.intensity = this.beamOn ? 2.1 : 0;
    this.cone.visible = this.beamOn;
  }

  takeManualControl(seconds = 5) {
    this.manualControl = true;
    this.manualTimer = seconds;
  }

  isPointLit(point) {
    if (!this.beamOn) return false;
    const origin = this.root.getWorldPosition(new THREE.Vector3());
    const dir = this.target.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const toP = point.clone().sub(origin);
    const dist = toP.length();
    if (dist < 1 || dist > 24) return false;
    toP.normalize();
    return dir.dot(toP) > 0.94;
  }
}
