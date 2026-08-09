"use client";

import { MemoryModelPreview } from "@/components/memory-model-preview";

import type { ArenaItem } from "./arena-types";

export function MemoryFlash({ item, ownerName }: { item: ArenaItem; ownerName: string }) {
  return (
    <div className="memory-flash" role="status">
      {item.modelUrl ? (
        <MemoryModelPreview
          className="memory-flash-model"
          modelUrl={item.modelUrl}
          name={item.name}
        />
      ) : (
        <div
          className="memory-flash-image"
          style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
        />
      )}
      <div className="memory-flash-vignette" aria-hidden="true" />
      <div className="memory-flash-copy">
        <span>Reliving {ownerName}’s memory</span>
        <strong>{item.name}</strong>
        <small>{item.memoryLabel}</small>
      </div>
    </div>
  );
}
