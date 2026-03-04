import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export const collidables = new Set();

export function registerCollidable(mesh) {
  if (!mesh) return;
  mesh.userData.collider = new THREE.Box3().setFromObject(mesh);
  collidables.add(mesh);
}

export function unregisterCollidable(mesh) {
  if (!mesh) return;
  collidables.delete(mesh);
}

export function updateColliders() {
  collidables.forEach((mesh) => {
    if (!mesh.userData.collider) {
      mesh.userData.collider = new THREE.Box3();
    }
    mesh.userData.collider.setFromObject(mesh);
  });
}
