"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import {
  FALLBACK_CHARACTER_AVATAR,
  fetchCharacterAvatarSpec,
} from "@/lib/character-avatar";
import { createMemoryModel, disposeMemoryModel } from "@/lib/three-memory-model";

export function CharacterAvatarPreview({
  className,
  modelUrl,
  name,
}: {
  className?: string;
  modelUrl?: string;
  name: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const observer = new IntersectionObserver(([entry]) => {
      setActive(Boolean(entry?.isIntersecting));
    }, { rootMargin: "150px" });
    observer.observe(mount);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !active) return;

    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    camera.position.set(2.7, 1.8, 4.8);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff8df", "#725443", 2.7));
    const keyLight = new THREE.DirectionalLight("#fffdf4", 3.1);
    keyLight.position.set(3, 6, 5);
    scene.add(keyLight);

    let model = createMemoryModel(FALLBACK_CHARACTER_AVATAR, 2.65);
    scene.add(model);

    if (modelUrl) {
      void fetchCharacterAvatarSpec(modelUrl)
        .then((spec) => {
          if (disposed) return;
          const nextModel = createMemoryModel(spec, 2.65);
          scene.remove(model);
          disposeMemoryModel(model);
          model = nextModel;
          scene.add(model);
        })
        .catch((error) => {
          console.warn("Character avatar preview could not be loaded", error);
        });
    }

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    const timer = new THREE.Timer();
    timer.connect(document);
    let frame = 0;
    const render = (timestamp: number) => {
      timer.update(timestamp);
      model.rotation.y += Math.min(timer.getDelta(), 0.05) * 0.42;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      timer.dispose();
      disposeMemoryModel(model);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [active, modelUrl]);

  return (
    <div
      aria-label={`Generated 3D avatar of ${name}`}
      className={className ? `character-avatar-preview ${className}` : "character-avatar-preview"}
      ref={mountRef}
      role="img"
    />
  );
}
