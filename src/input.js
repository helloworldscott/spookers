import { THREE } from './engine.js';

export class InputController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.pitch = 0;
    this.yaw = 0;
    this.sensitivity = 0.0021;
    this.locked = false;

    this.keys = new Set();
    this.interactPressed = false;
    this.interactHeld = false;
    this.toggleLogPressed = false;

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === domElement;
    });

    domElement.addEventListener('click', () => {
      if (!this.locked) domElement.requestPointerLock();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * this.sensitivity, -1.45, 1.45);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyE') {
        if (!this.interactHeld) this.interactPressed = true;
        this.interactHeld = true;
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleLogPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyE') this.interactHeld = false;
    });
  }

  consumeInteractPressed() {
    const v = this.interactPressed;
    this.interactPressed = false;
    return v;
  }

  consumeLogToggle() {
    const v = this.toggleLogPressed;
    this.toggleLogPressed = false;
    return v;
  }

  getMoveVector() {
    const f = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    const s = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    return { f, s, sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') };
  }
}
