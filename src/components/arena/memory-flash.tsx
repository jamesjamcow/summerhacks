"use client";

import { MemoryModelPreview } from "@/components/memory-model-preview";

import type { ArenaItem } from "./arena-types";

export function MemoryFlash({ item, ownerName }: { item: ArenaItem; ownerName: string }) {
  const revealImageUrl = item.originalImageUrl || item.imageUrl;

  return (
    <div className="memory-flash" role="status">
      {revealImageUrl ? (
        <div
          aria-label={`Original memory uploaded for ${item.name}`}
          className="memory-flash-image"
          role="img"
          style={{ backgroundImage: `url(${revealImageUrl})` }}
        />
      ) : item.modelUrl ? (
        <MemoryModelPreview
          className="memory-flash-model"
          modelUrl={item.modelUrl}
          name={item.name}
        />
      ) : (
        <div className="memory-flash-image" />
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
