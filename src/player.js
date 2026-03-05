import { THREE } from './engine.js';

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.velocity = new THREE.Vector3();
    this.radius = 0.35;
    this.darknessTimer = 0;
  }

  update(dt, input, world) {
    const m = input.getMoveVector();
    const speed = m.sprint ? 5.2 : 3.5;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).setY(0).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).setY(0).normalize();
    const move = forward.multiplyScalar(m.f).add(right.multiplyScalar(m.s));
    if (move.lengthSq() > 1) move.normalize();

    this.velocity.x = move.x * speed;
    this.velocity.z = move.z * speed;

    const prev = this.camera.position.clone();
    this.camera.position.x += this.velocity.x * dt;
    this.camera.position.z += this.velocity.z * dt;

    if (world.collidesCircle(this.camera.position.x, this.camera.position.z, this.radius)) {
      this.camera.position.x = prev.x;
      this.camera.position.z = prev.z;
    }

    const maxR = world.islandRadius - 1.1;
    const r = Math.hypot(this.camera.position.x, this.camera.position.z);
    if (r > maxR) {
      const scale = maxR / r;
      this.camera.position.x *= scale;
      this.camera.position.z *= scale;
    }

    this.camera.position.y = 1.7;
  }
}
