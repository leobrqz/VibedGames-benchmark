// ── Procedural Terrain Generation ──
// Infinite mountain with chunked generation, noise-based heightmap, decorations

import * as THREE from 'three';
import { noise } from './noise.js';
import { getScene } from './scene.js';
import { disposeGroup, lerp, smoothstep, clamp } from './utils.js';
import {
  TERRAIN_CHUNK_LENGTH, TERRAIN_CHUNK_WIDTH, TERRAIN_SEGMENTS,
  TERRAIN_CHUNKS_AHEAD, TERRAIN_CHUNKS_BEHIND,
  TERRAIN_BASE_SLOPE, TERRAIN_PATH_HALF_WIDTH, TERRAIN_WALL_STEEPNESS,
  COLOR_TERRAIN_WARM, COLOR_TERRAIN_COLD
} from './constants.js';

const chunks = new Map();
let terrainMaterial = null;
let decorMaterial = null;
const _normal = new THREE.Vector3();

// ── Height Function (deterministic, continuous) ──

export function getHeightAt(x, z) {
  // Flat starting zone, gradual transition into slope
  const slopeFactor = smoothstep(5, 28, z);
  const slopeVariation = noise.noise2d(0.5, z * 0.006) * 0.08;
  const slope = (TERRAIN_BASE_SLOPE + slopeVariation);

  let y = z * slope * slopeFactor;

  // Occasional rest platforms: locally reduce slope
  const platformNoise = noise.noise2d(1.0, z * 0.012);
  if (platformNoise > 0.6) {
    const platformStrength = smoothstep(0.6, 0.75, platformNoise);
    y -= platformStrength * 3.0;
  }

  // Feature scale ramps up away from the start
  const featureScale = smoothstep(0, 40, z);

  // Large terrain undulations
  y += noise.noise2d(x * 0.025, z * 0.018) * 3.2 * featureScale;

  // Medium bumps
  y += noise.noise2d(x * 0.07, z * 0.055) * 1.0;

  // Small rock detail
  y += noise.noise2d(x * 0.18, z * 0.18) * 0.35;

  // Fine gravel
  y += noise.noise2d(x * 0.45, z * 0.45) * 0.08;

  // Side walls — raise terrain at the edges of the path
  const edgeDist = Math.max(0, Math.abs(x) - TERRAIN_PATH_HALF_WIDTH * 0.65);
  if (edgeDist > 0) {
    y += edgeDist * edgeDist * TERRAIN_WALL_STEEPNESS;
    // Add wall texture variation
    y += noise.noise2d(x * 0.15, z * 0.1) * edgeDist * 0.15;
  }

  return y;
}

export function getNormalAt(x, z) {
  const eps = 0.25;
  const hL = getHeightAt(x - eps, z);
  const hR = getHeightAt(x + eps, z);
  const hD = getHeightAt(x, z - eps);
  const hU = getHeightAt(x, z + eps);

  _normal.set(
    (hL - hR) / (2 * eps),
    1,
    (hD - hU) / (2 * eps)
  ).normalize();

  return _normal;
}

export function getSlopeAngle(x, z) {
  const n = getNormalAt(x, z);
  return Math.acos(clamp(n.y, 0, 1));
}

// ── Chunk Generation ──

function createTerrainMaterial() {
  if (terrainMaterial) return terrainMaterial;
  terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.03,
    flatShading: true,
    side: THREE.FrontSide
  });
  return terrainMaterial;
}

function createDecorMaterial() {
  if (decorMaterial) return decorMaterial;
  decorMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b6055,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true
  });
  return decorMaterial;
}

function buildChunkMesh(chunkIndex) {
  const chunkStartZ = chunkIndex * TERRAIN_CHUNK_LENGTH;
  const chunkCenterZ = chunkStartZ + TERRAIN_CHUNK_LENGTH / 2;

  const geometry = new THREE.PlaneGeometry(
    TERRAIN_CHUNK_WIDTH, TERRAIN_CHUNK_LENGTH,
    TERRAIN_SEGMENTS, TERRAIN_SEGMENTS
  );
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = lx;
    const wz = lz + chunkCenterZ;
    const wy = getHeightAt(wx, wz);

    pos.setY(i, wy);

    // Vertex color: altitude-dependent warm→cold
    const altFactor = clamp(wy / 250, 0, 1);
    const nv = noise.noise2d(wx * 0.25 + 300, wz * 0.25) * 0.07;

    const r = clamp(lerp(COLOR_TERRAIN_WARM.r, COLOR_TERRAIN_COLD.r, altFactor) + nv, 0, 1);
    const g = clamp(lerp(COLOR_TERRAIN_WARM.g, COLOR_TERRAIN_COLD.g, altFactor) + nv * 0.8, 0, 1);
    const b = clamp(lerp(COLOR_TERRAIN_WARM.b, COLOR_TERRAIN_COLD.b, altFactor) + nv * 0.6, 0, 1);

    // Darken edges (wall areas)
    const edgeDark = smoothstep(TERRAIN_PATH_HALF_WIDTH * 0.5, TERRAIN_PATH_HALF_WIDTH, Math.abs(wx));
    const darken = 1 - edgeDark * 0.25;

    // Groove lines (worn paths from previous climbs)
    const grooveNoise = noise.noise2d(wx * 0.5, wz * 0.02);
    const groove = grooveNoise > 0.7 ? 0.88 : 1.0;

    colors[i * 3]     = r * darken * groove;
    colors[i * 3 + 1] = g * darken * groove;
    colors[i * 3 + 2] = b * darken * groove;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, createTerrainMaterial());
  mesh.position.set(0, 0, chunkCenterZ);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  return mesh;
}

function addChunkDecorations(chunkGroup, chunkIndex) {
  const chunkStartZ = chunkIndex * TERRAIN_CHUNK_LENGTH;
  const mat = createDecorMaterial();

  // Scattered rocks
  const rockCount = 6 + Math.floor(noise.noise2d(chunkIndex * 3.7, 0) * 4 + 4);
  for (let i = 0; i < rockCount; i++) {
    const rx = noise.noise2d(chunkIndex * 7 + i * 2.3, i * 5.1) * TERRAIN_PATH_HALF_WIDTH * 0.8;
    const rz = chunkStartZ + (noise.noise2d(i * 3.7, chunkIndex * 4.1) * 0.5 + 0.5) * TERRAIN_CHUNK_LENGTH;
    const ry = getHeightAt(rx, rz);

    // Skip if on the side walls
    if (Math.abs(rx) > TERRAIN_PATH_HALF_WIDTH * 0.7) continue;

    const scale = 0.15 + Math.abs(noise.noise2d(i * 11.3, chunkIndex * 7.7)) * 0.5;
    const rockGeo = new THREE.IcosahedronGeometry(scale, 0);

    // Deform the rock slightly
    const rockPos = rockGeo.attributes.position;
    for (let v = 0; v < rockPos.count; v++) {
      const vx = rockPos.getX(v);
      const vy = rockPos.getY(v);
      const vz = rockPos.getZ(v);
      const deform = 1 + noise.noise2d(vx * 5 + i, vz * 5 + chunkIndex) * 0.3;
      rockPos.setXYZ(v, vx * deform, vy * deform * 0.6, vz * deform);
    }
    rockGeo.computeVertexNormals();

    const rockMat = mat.clone();
    const tint = 0.7 + noise.noise2d(i * 2.1, chunkIndex * 3.3) * 0.3;
    rockMat.color.setScalar(tint * 0.42);

    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(rx, ry + scale * 0.2, rz);
    rock.rotation.set(
      noise.noise2d(i, chunkIndex) * 0.5,
      noise.noise2d(chunkIndex, i) * Math.PI,
      noise.noise2d(i * 2, chunkIndex * 2) * 0.3
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    chunkGroup.add(rock);
  }

  // Dead vegetation at lower altitudes
  const avgHeight = getHeightAt(0, chunkStartZ + TERRAIN_CHUNK_LENGTH / 2);
  if (avgHeight < 80) {
    const shrubCount = Math.floor((1 - avgHeight / 80) * 4);
    for (let i = 0; i < shrubCount; i++) {
      const sx = noise.noise2d(chunkIndex * 5 + i * 9.1, 100) * TERRAIN_PATH_HALF_WIDTH * 0.5;
      const sz = chunkStartZ + (noise.noise2d(i * 7.3, chunkIndex * 3 + 100) * 0.5 + 0.5) * TERRAIN_CHUNK_LENGTH;
      const sy = getHeightAt(sx, sz);

      const shrubGroup = new THREE.Group();
      shrubGroup.position.set(sx, sy, sz);

      // Simple dead branch geometry
      const branchMat = new THREE.MeshStandardMaterial({
        color: 0x4a3a2a,
        roughness: 0.95,
        flatShading: true
      });

      for (let b = 0; b < 3; b++) {
        const bh = 0.3 + Math.random() * 0.4;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.025, bh, 4),
          branchMat
        );
        branch.position.set(
          (noise.noise2d(b * 3, i * 7 + chunkIndex) - 0.5) * 0.1,
          bh / 2,
          (noise.noise2d(b * 5, i * 3 + chunkIndex) - 0.5) * 0.1
        );
        branch.rotation.z = (noise.noise2d(b, i + chunkIndex) - 0.5) * 0.6;
        branch.castShadow = true;
        shrubGroup.add(branch);
      }

      chunkGroup.add(shrubGroup);
    }
  }
}

// ── Terrain Manager ──

export function initTerrain() {
  updateChunks(0);
}

export function updateChunks(playerZ) {
  const scene = getScene();
  const currentChunk = Math.floor(playerZ / TERRAIN_CHUNK_LENGTH);
  const minChunk = currentChunk - TERRAIN_CHUNKS_BEHIND;
  const maxChunk = currentChunk + TERRAIN_CHUNKS_AHEAD;

  // Generate new chunks
  for (let ci = minChunk; ci <= maxChunk; ci++) {
    if (chunks.has(ci)) continue;

    const group = new THREE.Group();
    const terrainMesh = buildChunkMesh(ci);
    group.add(terrainMesh);
    addChunkDecorations(group, ci);
    scene.add(group);

    chunks.set(ci, { group, terrainMesh });
  }

  // Remove old chunks
  for (const [ci, chunk] of chunks) {
    if (ci < minChunk || ci > maxChunk) {
      scene.remove(chunk.group);
      disposeGroup(chunk.group);
      chunks.delete(ci);
    }
  }
}

export function disposeTerrain() {
  const scene = getScene();
  for (const [, chunk] of chunks) {
    scene.remove(chunk.group);
    disposeGroup(chunk.group);
  }
  chunks.clear();
}
