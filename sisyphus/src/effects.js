// ── Particle Effects System ──
// Dust, pebbles, sweat, screen vignette

import * as THREE from 'three';
import { getScene } from './scene.js';
import { clamp } from './utils.js';
import { PARTICLE_POOL_SIZE } from './constants.js';

// ── Particle Pool ──

const particles = [];
let particleGeometry = null;
let particleMaterial = null;
let particleMesh = null;
const MAX_PARTICLES = PARTICLE_POOL_SIZE;

const positions = new Float32Array(MAX_PARTICLES * 3);
const colors = new Float32Array(MAX_PARTICLES * 3);
const sizes = new Float32Array(MAX_PARTICLES);

class Particle {
  constructor(index) {
    this.index = index;
    this.alive = false;
    this.life = 0;
    this.maxLife = 1;
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.r = 1; this.g = 1; this.b = 1;
    this.size = 0.1;
    this.fadeOut = true;
    this.gravity = 0;
  }

  spawn(x, y, z, vx, vy, vz, r, g, b, size, life, gravity = 0) {
    this.alive = true;
    this.life = life;
    this.maxLife = life;
    this.x = x; this.y = y; this.z = z;
    this.vx = vx; this.vy = vy; this.vz = vz;
    this.r = r; this.g = g; this.b = b;
    this.size = size;
    this.gravity = gravity;
  }

  update(dt) {
    if (!this.alive) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }
    this.vx *= 0.98;
    this.vy -= this.gravity * dt;
    this.vz *= 0.98;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
  }

  writeToBuffers() {
    const i = this.index;
    const i3 = i * 3;
    if (!this.alive) {
      positions[i3] = 0;
      positions[i3 + 1] = -1000;
      positions[i3 + 2] = 0;
      sizes[i] = 0;
      return;
    }
    const lifeFrac = this.life / this.maxLife;
    const alpha = this.fadeOut ? lifeFrac : 1;

    positions[i3] = this.x;
    positions[i3 + 1] = this.y;
    positions[i3 + 2] = this.z;
    colors[i3] = this.r * alpha;
    colors[i3 + 1] = this.g * alpha;
    colors[i3 + 2] = this.b * alpha;
    sizes[i] = this.size * (0.5 + 0.5 * lifeFrac);
  }
}

let nextParticleIndex = 0;

function getParticle() {
  // Find next dead particle (round-robin)
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const idx = (nextParticleIndex + i) % MAX_PARTICLES;
    if (!particles[idx].alive) {
      nextParticleIndex = (idx + 1) % MAX_PARTICLES;
      return particles[idx];
    }
  }
  // All alive, overwrite oldest
  const p = particles[nextParticleIndex];
  nextParticleIndex = (nextParticleIndex + 1) % MAX_PARTICLES;
  return p;
}

export function initEffects() {
  particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  particleMaterial = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending
  });

  particleMesh = new THREE.Points(particleGeometry, particleMaterial);
  particleMesh.frustumCulled = false;
  getScene().add(particleMesh);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push(new Particle(i));
    positions[i * 3 + 1] = -1000;
    sizes[i] = 0;
  }
}

export function updateEffects(dt) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles[i].update(dt);
    particles[i].writeToBuffers();
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  particleGeometry.attributes.size.needsUpdate = true;
}

// ── Emitters ──

export function emitDust(x, y, z, intensity) {
  const count = Math.ceil(intensity * 3);
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    const spread = 0.3 + intensity * 0.2;
    p.spawn(
      x + (Math.random() - 0.5) * spread,
      y + Math.random() * 0.15,
      z + (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * 0.5,
      0.3 + Math.random() * 0.5,
      (Math.random() - 0.5) * 0.5,
      0.6, 0.55, 0.45,
      0.08 + Math.random() * 0.06,
      0.6 + Math.random() * 0.4,
      0.5
    );
  }
}

export function emitFootstepDust(x, y, z) {
  for (let i = 0; i < 2; i++) {
    const p = getParticle();
    p.spawn(
      x + (Math.random() - 0.5) * 0.15,
      y + 0.02,
      z + (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.3,
      0.15 + Math.random() * 0.25,
      (Math.random() - 0.5) * 0.3,
      0.55, 0.48, 0.38,
      0.05 + Math.random() * 0.04,
      0.4 + Math.random() * 0.3,
      1
    );
  }
}

export function emitPebbles(x, y, z, speed) {
  const count = Math.ceil(speed * 2);
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    p.spawn(
      x + (Math.random() - 0.5) * 0.4,
      y + 0.05,
      z + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * speed * 0.5,
      0.5 + Math.random() * speed * 0.3,
      (Math.random() - 0.5) * speed * 0.5,
      0.4, 0.35, 0.3,
      0.03 + Math.random() * 0.03,
      0.5 + Math.random() * 0.3,
      8
    );
  }
}

export function emitSweat(x, y, z) {
  const p = getParticle();
  p.spawn(
    x + (Math.random() - 0.5) * 0.3,
    y + 1.5 + Math.random() * 0.2,
    z + (Math.random() - 0.5) * 0.3,
    (Math.random() - 0.5) * 0.2,
    0.5,
    (Math.random() - 0.5) * 0.2,
    0.6, 0.7, 0.85,
    0.025,
    0.5,
    5
  );
}

export function emitImpactSparks(x, y, z, intensity) {
  const count = Math.ceil(intensity * 5);
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * intensity * 2;
    p.spawn(
      x, y + 0.1, z,
      Math.cos(angle) * speed,
      1 + Math.random() * speed,
      Math.sin(angle) * speed,
      0.9, 0.8, 0.5,
      0.02 + Math.random() * 0.02,
      0.3 + Math.random() * 0.2,
      12
    );
  }
}

// ── Screen Vignette (CSS-based) ──

let vignetteElement = null;

export function initVignette() {
  vignetteElement = document.createElement('div');
  vignetteElement.id = 'vignette-overlay';
  vignetteElement.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 5;
    background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%);
    opacity: 0.6;
    transition: opacity 0.3s;
  `;
  document.body.appendChild(vignetteElement);
}

export function setVignetteIntensity(intensity) {
  if (!vignetteElement) return;
  vignetteElement.style.opacity = clamp(0.4 + intensity * 0.5, 0, 1).toString();
}

export function setExhaustionVignette(exhausted) {
  if (!vignetteElement) return;
  if (exhausted) {
    vignetteElement.style.background =
      'radial-gradient(ellipse at center, transparent 40%, rgba(80,20,10,0.5) 100%)';
  } else {
    vignetteElement.style.background =
      'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.4) 100%)';
  }
}

export function disposeEffects() {
  if (particleMesh) {
    getScene().remove(particleMesh);
    particleGeometry.dispose();
    particleMaterial.dispose();
  }
  if (vignetteElement) {
    vignetteElement.remove();
  }
}
