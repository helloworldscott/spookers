import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class PlayerController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.isLocked = false;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.move = { f: 0, b: 0, l: 0, r: 0, sprint: false };
    this.pitch = 0;
    this.yaw = 0;
    this.sensitivity = 0.002;
    this.stamina = 100;
    this.flashlightBattery = 100;
    this.flashlightOn = false;
    this.height = 1.7;
    this.bounds = 19;

    this.flashlight = new THREE.SpotLight(0xddeeff, 0, 15, Math.PI / 6, 0.65, 1.2);
    this.flashlightTarget = new THREE.Object3D();
    camera.add(this.flashlight);
    camera.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.position.set(0.05, -0.05, 0.2);
    this.flashlightTarget.position.set(0, 0, -4);

    this.addEvents();
  }

  addEvents() {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') this.move.f = 1;
      if (e.code === 'KeyS') this.move.b = 1;
      if (e.code === 'KeyA') this.move.l = 1;
      if (e.code === 'KeyD') this.move.r = 1;
      if (e.code === 'ShiftLeft') this.move.sprint = true;
      if (e.code === 'KeyF') this.toggleFlashlight();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') this.move.f = 0;
      if (e.code === 'KeyS') this.move.b = 0;
      if (e.code === 'KeyA') this.move.l = 0;
      if (e.code === 'KeyD') this.move.r = 0;
      if (e.code === 'ShiftLeft') this.move.sprint = false;
    });
  }

  lock() { this.domElement.requestPointerLock(); }
  setSensitivity(v) { this.sensitivity = v; }

  toggleFlashlight() {
    if (this.flashlightBattery <= 1) return;
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 1.8 : 0;
  }

  update(dt) {
    const speed = this.move.sprint && this.stamina > 0 ? 6 : 3.2;
    const usingSprint = speed > 3.2 && (this.move.f || this.move.b || this.move.l || this.move.r);
    this.stamina += usingSprint ? -22 * dt : 14 * dt;
    this.stamina = THREE.MathUtils.clamp(this.stamina, 0, 100);

    if (this.flashlightOn) {
      this.flashlightBattery = Math.max(0, this.flashlightBattery - 4.2 * dt);
      if (this.flashlightBattery <= 0) this.toggleFlashlight();
    } else {
      this.flashlightBattery = Math.min(100, this.flashlightBattery + 1.2 * dt);
    }

    const forward = (this.move.f - this.move.b);
    const right = (this.move.r - this.move.l);
    this.direction.set(right, 0, forward).normalize();

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const dx = (this.direction.x * cos - this.direction.z * sin) * speed * dt;
    const dz = (this.direction.z * cos + this.direction.x * sin) * speed * dt;
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x + dx, -this.bounds, this.bounds);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z + dz, -this.bounds, this.bounds);
    this.camera.position.y = this.height;
  }
}
