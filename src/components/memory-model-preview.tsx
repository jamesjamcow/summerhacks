"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import {
  FALLBACK_MEMORY_MODEL,
  fetchMemoryModelSpec,
} from "@/lib/memory-model";
import { createMemoryModel, disposeMemoryModel } from "@/lib/three-memory-model";

export function MemoryModelPreview({
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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(2.4, 1.8, 3.2);
    camera.lookAt(0, 0.55, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#fff8df", "#6f5545", 2.4));
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.8);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    let model = createMemoryModel(FALLBACK_MEMORY_MODEL, 1.45);
    scene.add(model);

    if (modelUrl) {
      void fetchMemoryModelSpec(modelUrl)
        .then((spec) => {
          if (disposed) return;
          const nextModel = createMemoryModel(spec, 1.45);
          scene.remove(model);
          disposeMemoryModel(model);
          model = nextModel;
          scene.add(model);
        })
        .catch((error) => {
          console.warn("Memory model preview could not be loaded", error);
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
      model.rotation.y += Math.min(timer.getDelta(), 0.05) * 0.65;
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
      aria-label={`Generated 3D model of ${name}`}
      className={className ? `memory-model-preview ${className}` : "memory-model-preview"}
      ref={mountRef}
      role="img"
    />
  );
}
