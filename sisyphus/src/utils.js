// ── Shared Utility Functions ──

import * as THREE from 'three';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function inverseLerp(a, b, v) {
  return clamp((v - a) / (b - a), 0, 1);
}

export function remap(inMin, inMax, outMin, outMax, v) {
  const t = inverseLerp(inMin, inMax, v);
  return lerp(outMin, outMax, t);
}

export function dampLerp(current, target, smoothing, dt) {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function dampLerpVec3(current, target, smoothing, dt) {
  const factor = 1 - Math.exp(-smoothing * dt);
  current.lerp(target, factor);
  return current;
}

export function angleWrap(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

const _v3a = new THREE.Vector3();
export function flatDistance(a, b) {
  _v3a.set(a.x - b.x, 0, a.z - b.z);
  return _v3a.length();
}

export function createBoxMesh(w, h, d, material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function disposeMesh(mesh) {
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
}

export function disposeGroup(group) {
  group.traverse(child => {
    if (child.isMesh) disposeMesh(child);
  });
}
