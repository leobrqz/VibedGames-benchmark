import * as THREE from 'three';

import { WORLD_CONFIG } from '../core/constants.js';
import { xzDistance } from '../utils/math.js';

export const createPlacementSystem = ({ terrain, rng }) => {
  const occupied = [];

  const canPlace = ({ point, radius, maxFlatness = 1.5, minDistance = 0, avoid = [] }) => {
    const cell = terrain.getCell(point.x, point.z);
    if (!cell) {
      return false;
    }

    if (terrain.getFlatness(cell.gx, cell.gz, Math.ceil(radius / terrain.cellSize)) > maxFlatness) {
      return false;
    }

    for (const entry of occupied) {
      if (xzDistance(entry.point, point) < entry.radius + radius + minDistance) {
        return false;
      }
    }

    for (const entry of avoid) {
      if (xzDistance(entry.point, point) < entry.radius + radius + minDistance) {
        return false;
      }
    }

    return true;
  };

  const register = (point, radius, tag) => {
    occupied.push({ point: point.clone(), radius, tag });
  };

  const findSpot = ({ radius, maxFlatness, margin = 4, minDistance = 1, avoid = [] }) => {
    for (let attempt = 0; attempt < WORLD_CONFIG.maxPlacementAttempts; attempt += 1) {
      const point = terrain.randomSurfacePoint(margin);
      if (!canPlace({ point, radius, maxFlatness, minDistance, avoid })) {
        continue;
      }
      return point;
    }
    return null;
  };

  return {
    register,
    findSpot,
    occupied,
  };
};