export const disposeMaterial = (material) => {
  if (!material) {
    return;
  }

  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && typeof value.dispose === 'function') {
      value.dispose();
    }
  }

  if (typeof material.dispose === 'function') {
    material.dispose();
  }
};

export const disposeObject3D = (object) => {
  object?.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach(disposeMaterial);
      return;
    }
    disposeMaterial(child.material);
  });
};