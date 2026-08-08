"use client";

import type { ArenaItem } from "./arena-types";

export function MemoryFlash({ item, ownerName }: { item: ArenaItem; ownerName: string }) {
  return (
    <div className="memory-flash" role="status">
      <div className="memory-flash-image" style={{ backgroundImage: `url(${item.imageUrl})` }} />
      <div className="memory-flash-vignette" aria-hidden="true" />
      <div className="memory-flash-copy">
        <span>Reliving {ownerName}’s memory</span>
        <strong>{item.name}</strong>
        <small>{item.memoryLabel}</small>
      </div>
    </div>
  );
}
