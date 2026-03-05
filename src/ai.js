import { THREE } from './engine.js';

export class AISystem {
  constructor(scene) {
    this.scene = scene;
    this.creatures = [];
    this.lastKnownPlayer = new THREE.Vector3();
    this.nearDeathPulse = 0;
  }

  resetForNight(config) {
    for (const c of this.creatures) this.scene.remove(c.mesh);
    this.creatures = [];

    for (let i = 0; i < config.stalkers; i++) this.creatures.push(this.makeCreature('stalker'));
    for (let i = 0; i < config.crawlers; i++) this.creatures.push(this.makeCreature('crawler'));
  }

  makeCreature(type) {
    const fast = type === 'crawler';
    const mesh = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: fast ? 0x1a1518 : 0x0f1013, flatShading: true });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, fast ? 0.7 : 1.3, 0.8), mat);
    body.position.y = fast ? 0.2 : 0.65;
    mesh.add(body);
    const x = (Math.random() - 0.5) * 30;
    const z = (Math.random() - 0.5) * 30;
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    return {
      type,
      speed: fast ? 2.6 : 1.7,
      mesh,
      freezeTimer: 0,
      recoilDir: new THREE.Vector3()
    };
  }

  update(dt, playerPos, lighthouse, darknessAggro) {
    this.lastKnownPlayer.lerp(playerPos, 0.08);
    let lethal = false;
    let nearest = 999;

    for (const c of this.creatures) {
      const pos = c.mesh.position;
      const lit = lighthouse.isPointLit(pos);

      if (lit) {
        c.freezeTimer = 0.38;
        c.recoilDir.copy(pos).sub(playerPos).setY(0).normalize();
      }

      if (c.freezeTimer > 0) {
        c.freezeTimer -= dt;
        c.mesh.position.addScaledVector(c.recoilDir, dt * 0.9);
      } else {
        const target = this.lastKnownPlayer.clone();
        const dir = target.sub(pos).setY(0);
        if (dir.lengthSq() > 0.0001) {
          dir.normalize();
          const boost = darknessAggro > 4 ? 1.5 : 1;
          c.mesh.position.addScaledVector(dir, dt * c.speed * boost);
          c.mesh.lookAt(playerPos.x, 0.2, playerPos.z);
        }
      }

      const d = pos.distanceTo(playerPos);
      nearest = Math.min(nearest, d);
      if (d < 1.15 && darknessAggro > 0.5) lethal = true;
    }

    this.nearDeathPulse = nearest < 4 ? (1 - nearest / 4) : 0;
    return { lethal, nearestDist: nearest, nearDeathPulse: this.nearDeathPulse };
  }
}
