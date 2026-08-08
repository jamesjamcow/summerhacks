import type { ArenaItem } from "./arena-types";

const imageCache = new Map<string, HTMLImageElement>();

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

export async function preloadArenaImages(items: ArenaItem[]) {
  const urls = Array.from(new Set(items.map((item) => item.imageUrl).filter(Boolean)));
  await Promise.all(urls.map(loadImage));
}

export function getPreloadedArenaImage(url: string) {
  return imageCache.get(url);
}
