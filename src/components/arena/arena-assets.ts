import type { ArenaItem } from "./arena-types";

import {
  fetchMemoryModelSpec,
  type MemoryModelSpec,
} from "@/lib/memory-model";

const imageCache = new Map<string, HTMLImageElement>();
const imageLoadCache = new Map<string, Promise<HTMLImageElement>>();
const modelCache = new Map<string, MemoryModelSpec>();
const modelLoadCache = new Map<string, Promise<MemoryModelSpec>>();

function loadImage(url: string) {
  const cached = imageCache.get(url);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  const pending = imageLoadCache.get(url);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
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
  imageLoadCache.set(url, promise);
  void promise.then(
    () => imageLoadCache.delete(url),
    () => imageLoadCache.delete(url),
  );
  return promise;
}

async function loadModel(url: string) {
  const cached = modelCache.get(url);
  if (cached) return cached;
  const pending = modelLoadCache.get(url);
  if (pending) return pending;
  const promise = fetchMemoryModelSpec(url).then((spec) => {
    modelCache.set(url, spec);
    return spec;
  });
  modelLoadCache.set(url, promise);
  void promise.then(
    () => modelLoadCache.delete(url),
    () => modelLoadCache.delete(url),
  );
  return promise;
}

export async function preloadArenaAssets(items: ArenaItem[]) {
  const imageUrls = Array.from(new Set(
    items.flatMap((item) => [item.imageUrl, item.originalImageUrl].filter(
      (url): url is string => Boolean(url),
    )),
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
  const image = imageCache.get(url);
  return image?.complete && image.naturalWidth > 0 ? image : undefined;
}

export function getPreloadedArenaModel(url: string) {
  return modelCache.get(url);
}
