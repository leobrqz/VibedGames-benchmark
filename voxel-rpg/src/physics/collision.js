import * as THREE from 'three';

import { clamp } from '../utils/math.js';

const tempVector = new THREE.Vector3();

export const createCollisionSystem = ({ terrain, solids, walkableSurfaces = [] }) => {
  const getGroundHeight = (x, z) => {
    let groundHeight = terrain.getHeightAt(x, z);

    for (const surface of walkableSurfaces) {
      if (surface.type === 'disk') {
        const dx = x - surface.center.x;
        const dz = z - surface.center.z;
        if (dx * dx + dz * dz <= surface.radius * surface.radius) {
          groundHeight = Math.max(groundHeight, surface.height);
        }
      }
    }

    return groundHeight;
  };

  const resolveSolids = (position, radius, height) => {
    const minY = position.y;
    const maxY = position.y + height;

    for (const solid of solids) {
      if (maxY <= solid.min.y || minY >= solid.max.y) {
        continue;
      }

      const closestX = clamp(position.x, solid.min.x, solid.max.x);
      const closestZ = clamp(position.z, solid.min.z, solid.max.z);
      const dx = position.x - closestX;
      const dz = position.z - closestZ;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= radius * radius) {
        continue;
      }

      const distance = Math.max(Math.sqrt(distanceSq), 0.0001);
      const overlap = radius - distance;
      position.x += (dx / distance) * overlap;
      position.z += (dz / distance) * overlap;
    }

    return position;
  };

  const resolveDynamicBodies = (subject, others) => {
    for (const other of others) {
      if (!other.active || other === subject) {
        continue;
      }
      tempVector.copy(subject.position).sub(other.position);
      const distance = Math.max(tempVector.length(), 0.0001);
      const minDistance = subject.radius + other.radius;
      if (distance >= minDistance) {
        continue;
      }
      const push = (minDistance - distance) * 0.5;
      tempVector.normalize().multiplyScalar(push);
      subject.position.add(tempVector);
      other.position.sub(tempVector);
    }
  };

  return {
    getGroundHeight,
    resolveSolids,
    resolveDynamicBodies,
  };
};