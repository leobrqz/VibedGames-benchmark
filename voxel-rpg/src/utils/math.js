import * as THREE from 'three';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (from, to, alpha) => from + (to - from) * alpha;
export const inverseLerp = (min, max, value) => (value - min) / (max - min);
export const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

export const yawToForward = (yaw) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

export const xzDistance = (a, b) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
};

export const directionToYaw = (vector) => Math.atan2(vector.x, vector.z);

export const tempVector = () => new THREE.Vector3();

export const tempBox = () => new THREE.Box3();