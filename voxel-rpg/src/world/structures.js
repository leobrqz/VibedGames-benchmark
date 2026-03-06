import * as THREE from 'three';

import { WORLD_CONFIG } from '../core/constants.js';

const createSolidBox = ({ width, height, depth, color, position }) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(position);
  return mesh;
};

const createAabbFromMesh = (mesh) => new THREE.Box3().setFromObject(mesh);

const createAabbFromCenterSize = (center, size) => new THREE.Box3().setFromCenterAndSize(center.clone(), size.clone());

export const createStructures = ({ parent, terrain, placement, rng }) => {
  const group = new THREE.Group();
  group.name = 'structures';
  parent.add(group);

  const solids = [];
  const collisionMeshes = [];
  const camps = [];
  const healSpots = [];
  const walkableSurfaces = [];

  for (let i = 0; i < WORLD_CONFIG.towerCount; i += 1) {
    const point = placement.findSpot({ radius: 4.2, maxFlatness: 2.2, minDistance: 6 });
    if (!point) {
      continue;
    }
    placement.register(point, 4.2, 'tower');

    const towerHeight = rng.int(3, 5);
    const tower = new THREE.Group();
    tower.position.copy(point);
    for (let y = 0; y < towerHeight; y += 1) {
      const block = createSolidBox({
        width: 2.2,
        height: 1.5,
        depth: 2.2,
        color: y === towerHeight - 1 ? '#8a9278' : '#756f65',
        position: new THREE.Vector3(0, 0.75 + y * 1.5, 0),
      });
      tower.add(block);
      solids.push(createAabbFromCenterSize(point.clone().add(new THREE.Vector3(0, 0.75 + y * 1.5, 0)), new THREE.Vector3(2.2, 1.5, 2.2)));
      collisionMeshes.push(block);
    }

    const lantern = new THREE.PointLight('#fdbb73', 1.4, 10);
    lantern.position.set(0, towerHeight * 1.5 + 1.1, 0);
    tower.add(lantern);
    group.add(tower);

    healSpots.push({ position: point.clone().add(new THREE.Vector3(2.6, 0, 0)), radius: 2.1, label: 'Tower brazier' });
  }

  for (let i = 0; i < WORLD_CONFIG.campCount; i += 1) {
    const point = placement.findSpot({ radius: 7.2, maxFlatness: 1.4, minDistance: 8, avoid: placement.occupied });
    if (!point) {
      continue;
    }
    placement.register(point, 7.2, 'camp');
    const campId = `camp-${i + 1}`;
    const campGroup = new THREE.Group();
    campGroup.position.copy(point);
    group.add(campGroup);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.6, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: '#5a4636' }),
    );
    floor.position.set(0, 0.2, 0);
    floor.receiveShadow = true;
    campGroup.add(floor);
    walkableSurfaces.push({
      type: 'disk',
      center: point.clone(),
      radius: 4.2,
      height: point.y + 0.45,
    });

    const offsets = [
      new THREE.Vector3(2.5, 0, 1.8),
      new THREE.Vector3(-2.2, 0, -1.5),
      new THREE.Vector3(-2.4, 0, 2.1),
      new THREE.Vector3(2.4, 0, -2.3),
    ];
    offsets.forEach((offset, index) => {
      const size = new THREE.Vector3(index % 2 === 0 ? 2.8 : 0.5, 1.2, index % 2 === 0 ? 0.5 : 2.8);
      const fence = createSolidBox({
        width: size.x,
        height: size.y,
        depth: size.z,
        color: '#7d5c3d',
        position: offset.clone().add(new THREE.Vector3(0, 0.65, 0)),
      });
      campGroup.add(fence);
      solids.push(createAabbFromCenterSize(point.clone().add(offset).add(new THREE.Vector3(0, 0.65, 0)), size));
      collisionMeshes.push(fence);
    });

    const tent = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 2.3, 4),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? '#7d4e48' : '#537864' }),
    );
    tent.rotation.y = Math.PI * 0.25;
    tent.position.set(-1.3, 1.2, 0.8);
    tent.castShadow = true;
    tent.receiveShadow = true;
    campGroup.add(tent);
    solids.push(createAabbFromCenterSize(point.clone().add(new THREE.Vector3(-1.3, 1.15, 0.8)), new THREE.Vector3(2.2, 2.3, 2.2)));
    collisionMeshes.push(tent);

    const crate = createSolidBox({
      width: 1.2,
      height: 1.1,
      depth: 1.2,
      color: '#8b6a46',
      position: new THREE.Vector3(1.8, 0.55, -1.2),
    });
    campGroup.add(crate);
    solids.push(createAabbFromCenterSize(point.clone().add(new THREE.Vector3(1.8, 0.55, -1.2)), new THREE.Vector3(1.2, 1.1, 1.2)));
    collisionMeshes.push(crate);

    const fireBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1, 0.35, 8),
      new THREE.MeshLambertMaterial({ color: '#4c4038' }),
    );
    fireBase.position.set(0.8, 0.18, 1);
    fireBase.receiveShadow = true;
    campGroup.add(fireBase);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#ffb75e' }),
    );
    flame.position.set(0.8, 0.7, 1);
    campGroup.add(flame);

    const light = new THREE.PointLight('#ffb75e', 1.8, 12);
    light.position.copy(flame.position);
    campGroup.add(light);

    healSpots.push({ position: point.clone().add(new THREE.Vector3(0.8, 0, 1)), radius: 2.6, label: 'Campfire' });
    camps.push({
      id: campId,
      center: point.clone(),
      radius: WORLD_CONFIG.campClearRadius,
      cleared: false,
      enemySpawns: [
        point.clone().add(new THREE.Vector3(3, 0, 0)),
        point.clone().add(new THREE.Vector3(-3, 0, 0)),
      ],
    });
  }

  return {
    group,
    solids,
    collisionMeshes,
    camps,
    healSpots,
    walkableSurfaces,
  };
};