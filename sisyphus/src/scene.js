// ── Scene Setup ──
// Three.js scene, renderer, lights, fog, sky gradient

import * as THREE from 'three';
import {
  COLOR_SUN, COLOR_AMBIENT, COLOR_SKY_LOW, COLOR_SKY_HIGH,
  COLOR_FOG_LOW, COLOR_FOG_HIGH
} from './constants.js';
import { lerp } from './utils.js';

let scene, renderer, directionalLight, ambientLight, hemisphereLight;
let sunTarget;

function createSkyGradientTexture(topColor, bottomColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(0.5, bottomColor);
  gradient.addColorStop(1, topColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

export function initScene(canvasElement) {
  renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = createSkyGradientTexture('#8b7560', '#b8a898');
  scene.fog = new THREE.FogExp2(COLOR_FOG_LOW, 0.012);

  // Directional light (sun) — low angle for dramatic shadows
  directionalLight = new THREE.DirectionalLight(COLOR_SUN, 2.2);
  directionalLight.position.set(-20, 35, -15);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -25;
  directionalLight.shadow.camera.right = 25;
  directionalLight.shadow.camera.top = 25;
  directionalLight.shadow.camera.bottom = -25;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 120;
  directionalLight.shadow.bias = -0.001;
  directionalLight.shadow.normalBias = 0.02;

  sunTarget = new THREE.Object3D();
  scene.add(sunTarget);
  directionalLight.target = sunTarget;
  scene.add(directionalLight);

  // Hemisphere light for natural ambient
  hemisphereLight = new THREE.HemisphereLight(0x9bb0c4, 0x704030, 0.5);
  scene.add(hemisphereLight);

  // Ambient fill
  ambientLight = new THREE.AmbientLight(COLOR_AMBIENT, 0.35);
  scene.add(ambientLight);

  window.addEventListener('resize', onResize);

  return { scene, renderer };
}

function onResize() {
  if (!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function updateSceneAtmosphere(playerHeight) {
  // Transition sky and fog based on altitude
  const altFactor = Math.min(1, playerHeight / 300);

  const fogLow = new THREE.Color(COLOR_FOG_LOW);
  const fogHigh = new THREE.Color(COLOR_FOG_HIGH);
  scene.fog.color.copy(fogLow).lerp(fogHigh, altFactor);

  scene.fog.density = lerp(0.012, 0.018, altFactor);

  // Fade sky gradient
  const skyLow = new THREE.Color(COLOR_SKY_LOW);
  const skyHigh = new THREE.Color(COLOR_SKY_HIGH);
  const skyColor = skyLow.clone().lerp(skyHigh, altFactor);
  scene.background = createSkyGradientTexture(
    '#' + skyColor.getHexString(),
    '#' + skyLow.clone().lerp(new THREE.Color(0xb8a898), 1 - altFactor).getHexString()
  );

  // Adjust hemisphere light
  hemisphereLight.intensity = lerp(0.5, 0.35, altFactor);
}

export function updateSunPosition(playerPos) {
  directionalLight.position.set(
    playerPos.x - 20,
    playerPos.y + 35,
    playerPos.z - 15
  );
  sunTarget.position.copy(playerPos);
  directionalLight.shadow.camera.updateProjectionMatrix();
}

export function getScene() { return scene; }
export function getRenderer() { return renderer; }
