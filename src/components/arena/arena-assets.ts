import type { ArenaItem } from "./arena-types";

import {
  fetchMemoryModelSpec,
  type MemoryModelSpec,
} from "@/lib/memory-model";

const imageCache = new Map<string, HTMLImageElement>();
const modelCache = new Map<string, MemoryModelSpec>();

function loadImage(url: string) {
  const cached = imageCache.get(url);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = cached ?? new Image();
    image.decoding = "async";
    image.onload = () => {
      imageCache.set(url, image);
      void image.decode().catch(() => undefined).finally(() => resolve(image));
    };
    image.onerror = () => {
      imageCache.delete(url);
      reject(new Error(`Could not preload ${url}`));
    };
    imageCache.set(url, image);
    if (!cached) image.src = url;
  });
}

async function loadModel(url: string) {
  const cached = modelCache.get(url);
  if (cached) return cached;
  const spec = await fetchMemoryModelSpec(url);
  modelCache.set(url, spec);
  return spec;
}

export async function preloadArenaAssets(items: ArenaItem[]) {
  const imageUrls = Array.from(new Set(
    items.flatMap((item) => item.imageUrl ? [item.imageUrl] : []),
  ));
  const modelUrls = Array.from(new Set(
    items.flatMap((item) => item.modelUrl ? [item.modelUrl] : []),
  ));
  await Promise.all([
    ...imageUrls.map(loadImage),
    ...modelUrls.map(loadModel),
  ]);
}

export function getPreloadedArenaImage(url: string) {
  return imageCache.get(url);
}

export function getPreloadedArenaModel(url: string) {
  return modelCache.get(url);
}
