import * as THREE from 'three';

import { CAMERA_CONFIG } from './constants.js';
import { clamp, damp, lerp } from '../utils/math.js';

const skyColorDay = new THREE.Color('#8fd8ff');
const skyColorSunset = new THREE.Color('#f2bd81');
const skyColorNight = new THREE.Color('#16304e');
const fogDay = new THREE.Color('#9bc8a0');
const fogNight = new THREE.Color('#0f1e2e');

export const createSceneContext = ({ canvas }) => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = skyColorDay.clone();
  scene.fog = new THREE.Fog(fogDay.clone(), 18, 110);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 180);

  const worldRoot = new THREE.Group();
  const entityRoot = new THREE.Group();
  const fxRoot = new THREE.Group();
  worldRoot.name = 'worldRoot';
  entityRoot.name = 'entityRoot';
  fxRoot.name = 'fxRoot';
  scene.add(worldRoot, entityRoot, fxRoot);

  const ambient = new THREE.HemisphereLight('#f5ffdf', '#385238', 1.15);
  const sun = new THREE.DirectionalLight('#fff2c8', 1.35);
  sun.position.set(18, 28, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  scene.add(ambient, sun);

  const cameraTarget = new THREE.Vector3();
  const desiredCameraPosition = new THREE.Vector3();
  const cameraRaycaster = new THREE.Raycaster();

  const setSize = (width, height) => {
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const updateAtmosphere = (timeOfDay) => {
    const cycle = (Math.sin(timeOfDay * Math.PI * 2 - Math.PI / 2) + 1) * 0.5;
    const sunsetMix = 1 - Math.abs(cycle - 0.5) * 2;
    const darkness = clamp(1 - cycle * 1.35, 0, 1);

    scene.background.copy(skyColorNight).lerp(skyColorSunset, sunsetMix * 0.6).lerp(skyColorDay, cycle);
    scene.fog.color.copy(fogNight).lerp(fogDay, cycle);

    ambient.intensity = lerp(0.38, 1.15, cycle);
    ambient.color.set('#d8efff').lerp(new THREE.Color('#fff1d2'), sunsetMix * 0.4);
    sun.intensity = lerp(0.12, 1.35, cycle);
    sun.color.set('#c5d6ff').lerp(new THREE.Color('#ffcc88'), sunsetMix * 0.82).lerp(new THREE.Color('#fff2c8'), cycle);
    sun.position.set(Math.cos(timeOfDay * Math.PI * 2) * 26, lerp(6, 32, cycle), Math.sin(timeOfDay * Math.PI * 2) * 18);
  };

  const updateCamera = ({ focus, yaw, pitch, collisionMeshes, dt }) => {
    cameraTarget.copy(focus);

    const safePitch = clamp(pitch, CAMERA_CONFIG.minPitch, CAMERA_CONFIG.maxPitch);
    desiredCameraPosition.set(
      Math.sin(yaw) * Math.cos(safePitch),
      Math.sin(safePitch),
      Math.cos(yaw) * Math.cos(safePitch),
    );
    desiredCameraPosition.multiplyScalar(-CAMERA_CONFIG.distance).add(cameraTarget);

    let targetDistance = CAMERA_CONFIG.distance;
    const direction = desiredCameraPosition.clone().sub(cameraTarget).normalize();
    cameraRaycaster.set(cameraTarget, direction);
    cameraRaycaster.far = CAMERA_CONFIG.distance;
    const hits = cameraRaycaster.intersectObjects(collisionMeshes, true);
    if (hits.length > 0) {
      targetDistance = Math.max(CAMERA_CONFIG.minDistance, hits[0].distance - 0.25);
    }

    desiredCameraPosition.copy(direction).multiplyScalar(targetDistance).add(cameraTarget);

    camera.position.x = damp(camera.position.x, desiredCameraPosition.x, 16, dt);
    camera.position.y = damp(camera.position.y, desiredCameraPosition.y, 16, dt);
    camera.position.z = damp(camera.position.z, desiredCameraPosition.z, 16, dt);
    camera.lookAt(cameraTarget);
  };

  const render = () => {
    renderer.render(scene, camera);
  };

  const dispose = () => {
    renderer.dispose();
  };

  return {
    renderer,
    scene,
    camera,
    worldRoot,
    entityRoot,
    fxRoot,
    setSize,
    updateAtmosphere,
    updateCamera,
    render,
    dispose,
  };
};