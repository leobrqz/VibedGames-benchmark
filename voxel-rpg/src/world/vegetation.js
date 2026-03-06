import * as THREE from 'three';

export const createVegetation = ({ parent, terrain, placement, rng }) => {
  const group = new THREE.Group();
  group.name = 'vegetation';
  parent.add(group);
  const solids = [];
  const collisionMeshes = [];

  const treeMaterial = new THREE.MeshLambertMaterial({ color: '#48764a' });
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: '#6f5138' });
  const bushMaterial = new THREE.MeshLambertMaterial({ color: '#5d8f4f' });

  for (let i = 0; i < 36; i += 1) {
    const point = placement.findSpot({ radius: 2.4, maxFlatness: 2.6, minDistance: 0.5 });
    if (!point) {
      continue;
    }
    placement.register(point, 1.8, 'tree');

    const tree = new THREE.Group();
    tree.position.copy(point);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.8, 6), trunkMaterial);
    trunk.castShadow = true;
    trunk.position.y = 0.9;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.2 + rng.range(-0.15, 0.18), 2.4, 6), treeMaterial);
    crown.castShadow = true;
    crown.position.y = 2.4;
    tree.add(trunk, crown);
    group.add(tree);
    solids.push(new THREE.Box3().setFromCenterAndSize(point.clone().add(new THREE.Vector3(0, 0.9, 0)), new THREE.Vector3(0.9, 1.8, 0.9)));
    collisionMeshes.push(trunk);
  }

  for (let i = 0; i < 54; i += 1) {
    const point = terrain.randomSurfacePoint();
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(rng.range(0.32, 0.6), 8, 8),
      bushMaterial,
    );
    bush.position.copy(point).add(new THREE.Vector3(rng.range(-0.4, 0.4), rng.range(0.35, 0.6), rng.range(-0.4, 0.4)));
    bush.scale.set(1, rng.range(0.7, 1.2), 1);
    bush.castShadow = true;
    group.add(bush);
  }

  return { group, solids, collisionMeshes };
};