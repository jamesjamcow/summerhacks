import * as THREE from "three";

import type { MemoryModelPart, MemoryModelSpec } from "@/lib/memory-model";

function geometryForPart(part: MemoryModelPart): THREE.BufferGeometry {
  switch (part.shape) {
    case "sphere":
      return new THREE.SphereGeometry(0.5, 18, 12);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    case "cone":
      return new THREE.ConeGeometry(0.5, 1, 16);
    case "capsule":
      return new THREE.CapsuleGeometry(0.34, 0.5, 6, 12);
    case "torus":
      return new THREE.TorusGeometry(0.38, 0.13, 10, 20);
    case "dodecahedron":
      return new THREE.DodecahedronGeometry(0.5, 0);
    case "box":
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function createMemoryModel(spec: MemoryModelSpec, targetSize = 1) {
  const model = new THREE.Group();
  const content = new THREE.Group();
  model.name = spec.name;
  model.userData.memoryModel = true;

  spec.parts.forEach((part) => {
    const mesh = new THREE.Mesh(
      geometryForPart(part),
      new THREE.MeshStandardMaterial({
        color: part.color,
        flatShading: true,
        metalness: 0.05,
        roughness: 0.78,
      }),
    );
    mesh.position.set(...part.position);
    mesh.rotation.set(...part.rotation);
    mesh.scale.set(...part.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    content.add(mesh);
  });

  model.add(content);
  content.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(content);
  const size = bounds.getSize(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
  content.scale.setScalar(targetSize / largestDimension);
  content.updateMatrixWorld(true);

  bounds.setFromObject(content);
  const center = bounds.getCenter(new THREE.Vector3());
  content.position.set(-center.x, -bounds.min.y, -center.z);

  return model;
}

export function disposeMemoryModel(model: THREE.Object3D) {
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
}
