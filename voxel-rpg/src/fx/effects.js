import * as THREE from 'three';

export const createEffectsSystem = ({ parent }) => {
  const effects = [];

  const spawnBurst = ({ position, color = '#ffffff', count = 8, speed = 3, lifetime = 0.5, size = 0.14 }) => {
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(size, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      );
      particle.position.copy(position);
      parent.add(particle);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed,
      );
      effects.push({ type: 'particle', mesh: particle, velocity, age: 0, lifetime });
    }
  };

  const spawnRing = ({ position, color = '#e0b15c', lifetime = 0.35, startScale = 0.4, endScale = 1.8 }) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 8, 18),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(position);
    ring.scale.setScalar(startScale);
    parent.add(ring);
    effects.push({ type: 'ring', mesh: ring, age: 0, lifetime, startScale, endScale });
  };

  const update = (dt) => {
    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      effect.age += dt;
      const alpha = effect.age / effect.lifetime;
      if (alpha >= 1) {
        parent.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        effects.splice(i, 1);
        continue;
      }

      if (effect.type === 'particle') {
        effect.velocity.y -= 8 * dt;
        effect.mesh.position.addScaledVector(effect.velocity, dt);
        effect.mesh.material.opacity = 1 - alpha;
      }

      if (effect.type === 'ring') {
        const scale = effect.startScale + (effect.endScale - effect.startScale) * alpha;
        effect.mesh.scale.setScalar(scale);
        effect.mesh.material.opacity = 0.8 * (1 - alpha);
      }
    }
  };

  return {
    spawnBurst,
    spawnRing,
    update,
  };
};