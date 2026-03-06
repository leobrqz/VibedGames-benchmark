import * as THREE from 'three';

import { WORLD_CONFIG } from '../core/constants.js';
import { clamp, lerp, smoothstep } from '../utils/math.js';

const boxGeometry = new THREE.BoxGeometry(WORLD_CONFIG.cellSize, WORLD_CONFIG.cellSize, WORLD_CONFIG.cellSize);
const topMaterial = new THREE.MeshLambertMaterial({ color: '#6ea54d' });
const fillMaterial = new THREE.MeshLambertMaterial({ color: '#6b4d2f' });
const stoneMaterial = new THREE.MeshLambertMaterial({ color: '#5e626b' });

const bilerp = (h00, h10, h01, h11, fx, fz) => lerp(lerp(h00, h10, fx), lerp(h01, h11, fx), fz);

export const createTerrain = ({ rng, parent }) => {
  const group = new THREE.Group();
  group.name = 'terrain';
  parent.add(group);

  const { size, cellSize, minHeight, maxHeight } = WORLD_CONFIG;
  const half = size / 2;
  const heights = Array.from({ length: size }, () => Array(size).fill(minHeight));

  let topCount = 0;
  let fillCount = 0;
  let stoneCount = 0;

  const sampleNoise = (x, z) => {
    const broad = rng.hash2(Math.floor(x * 0.14), Math.floor(z * 0.14));
    const medium = rng.hash2(Math.floor(x * 0.24 + 100), Math.floor(z * 0.24 - 50));
    const detail = rng.hash2(Math.floor(x * 0.42 - 20), Math.floor(z * 0.42 + 80));
    return broad * 0.56 + medium * 0.31 + detail * 0.13;
  };

  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const nx = x - half;
      const nz = z - half;
      const dist = Math.hypot(nx / half, nz / half);
      const base = sampleNoise(nx, nz);
      const hills = smoothstep(0.18, 0.82, base);
      const plains = smoothstep(0.1, 0.95, 1 - Math.abs(base - 0.52) * 1.4);
      const falloff = clamp(1 - dist * 0.22, 0.72, 1);
      const height = Math.round(lerp(minHeight, maxHeight, hills * 0.58 + plains * 0.22) * falloff);
      heights[x][z] = clamp(height, minHeight, maxHeight);
      topCount += 1;
      fillCount += Math.max(0, height - 2);
      stoneCount += 2;
    }
  }

  for (let pass = 0; pass < 3; pass += 1) {
    const nextHeights = heights.map((row) => [...row]);
    for (let x = 1; x < size - 1; x += 1) {
      for (let z = 1; z < size - 1; z += 1) {
        let total = heights[x][z];
        let count = 1;
        for (let ox = -1; ox <= 1; ox += 1) {
          for (let oz = -1; oz <= 1; oz += 1) {
            if (ox === 0 && oz === 0) {
              continue;
            }
            total += heights[x + ox][z + oz];
            count += 1;
          }
        }
        nextHeights[x][z] = clamp(Math.round(heights[x][z] * 0.55 + (total / count) * 0.45), minHeight, maxHeight);
      }
    }
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        heights[x][z] = nextHeights[x][z];
      }
    }
  }

  for (let pass = 0; pass < 2; pass += 1) {
    for (let x = 0; x < size; x += 1) {
      for (let z = 0; z < size; z += 1) {
        const current = heights[x][z];
        if (x > 0 && Math.abs(current - heights[x - 1][z]) > 1) {
          heights[x][z] = heights[x - 1][z] + Math.sign(current - heights[x - 1][z]);
        }
        if (z > 0 && Math.abs(heights[x][z] - heights[x][z - 1]) > 1) {
          heights[x][z] = heights[x][z - 1] + Math.sign(heights[x][z] - heights[x][z - 1]);
        }
      }
    }
  }

  topCount = 0;
  fillCount = 0;
  stoneCount = 0;
  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const height = heights[x][z];
      topCount += 1;
      fillCount += Math.max(0, height - 2);
      stoneCount += 2;
    }
  }

  const topMesh = new THREE.InstancedMesh(boxGeometry, topMaterial, topCount);
  const fillMesh = new THREE.InstancedMesh(boxGeometry, fillMaterial, fillCount);
  const stoneMesh = new THREE.InstancedMesh(boxGeometry, stoneMaterial, stoneCount);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let topIndex = 0;
  let fillIndex = 0;
  let stoneIndex = 0;

  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const height = heights[x][z];
      const worldX = (x - half) * cellSize;
      const worldZ = (z - half) * cellSize;
      const topY = (height - 0.5) * cellSize;
      const grassTint = 0.85 + rng.hash2(x + 100, z - 100) * 0.18;
      matrix.compose(new THREE.Vector3(worldX, topY, worldZ), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      topMesh.setMatrixAt(topIndex, matrix);
      color.setRGB(0.33 * grassTint, 0.62 * grassTint, 0.25 * grassTint);
      topMesh.setColorAt(topIndex, color);
      topIndex += 1;

      for (let y = 0; y < height - 1; y += 1) {
        matrix.compose(new THREE.Vector3(worldX, (y + 0.5) * cellSize, worldZ), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        if (y < 2) {
          stoneMesh.setMatrixAt(stoneIndex, matrix);
          color.setRGB(0.38 + y * 0.03, 0.39 + y * 0.03, 0.42 + y * 0.03);
          stoneMesh.setColorAt(stoneIndex, color);
          stoneIndex += 1;
          continue;
        }
        fillMesh.setMatrixAt(fillIndex, matrix);
        color.setRGB(0.42, 0.28 + y * 0.01, 0.17);
        fillMesh.setColorAt(fillIndex, color);
        fillIndex += 1;
      }
    }
  }

  topMesh.castShadow = false;
  topMesh.receiveShadow = true;
  fillMesh.castShadow = false;
  fillMesh.receiveShadow = true;
  stoneMesh.castShadow = false;
  stoneMesh.receiveShadow = true;
  group.add(stoneMesh, fillMesh, topMesh);

  const getCell = (x, z) => {
    const gx = Math.floor(x / cellSize + half);
    const gz = Math.floor(z / cellSize + half);
    if (gx < 0 || gz < 0 || gx >= size || gz >= size) {
      return null;
    }
    return { gx, gz };
  };

  const getHeightAt = (x, z) => {
    const localX = x / cellSize + half;
    const localZ = z / cellSize + half;
    const x0 = Math.floor(localX);
    const z0 = Math.floor(localZ);
    const x1 = clamp(x0 + 1, 0, size - 1);
    const z1 = clamp(z0 + 1, 0, size - 1);
    if (x0 < 0 || z0 < 0 || x0 >= size || z0 >= size) {
      return minHeight * cellSize;
    }
    const fx = clamp(localX - x0, 0, 1);
    const fz = clamp(localZ - z0, 0, 1);
    return bilerp(heights[x0][z0], heights[x1][z0], heights[x0][z1], heights[x1][z1], fx, fz) * cellSize;
  };

  const getCellHeight = (gx, gz) => {
    if (gx < 0 || gz < 0 || gx >= size || gz >= size) {
      return minHeight * cellSize;
    }
    return heights[gx][gz] * cellSize;
  };

  const getFlatness = (gx, gz, radius = 1) => {
    let min = Infinity;
    let max = -Infinity;
    for (let x = gx - radius; x <= gx + radius; x += 1) {
      for (let z = gz - radius; z <= gz + radius; z += 1) {
        const h = getCellHeight(x, z);
        min = Math.min(min, h);
        max = Math.max(max, h);
      }
    }
    return max - min;
  };

  const randomSurfacePoint = (margin = 4, maxFlatness = Infinity) => {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const gx = rng.int(margin, size - margin - 1);
      const gz = rng.int(margin, size - margin - 1);
      if (getFlatness(gx, gz, 1) > maxFlatness) {
        continue;
      }
      const x = (gx - half) * cellSize;
      const z = (gz - half) * cellSize;
      return new THREE.Vector3(x, getCellHeight(gx, gz), z);
    }
    const gx = Math.floor(size / 2);
    const gz = Math.floor(size / 2);
    return new THREE.Vector3((gx - half) * cellSize, getCellHeight(gx, gz), (gz - half) * cellSize);
  };

  return {
    group,
    cellSize,
    size,
    halfSize: half,
    heights,
    getCell,
    getHeightAt,
    getCellHeight,
    getFlatness,
    randomSurfacePoint,
    collisionMeshes: [topMesh, fillMesh, stoneMesh],
  };
};