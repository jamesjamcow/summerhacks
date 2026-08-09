"use client";

import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";

import type { TripPortrait } from "@/lib/trip-portrait";

type ViewState = { scale: number; x: number; y: number };

const INITIAL_VIEW: ViewState = { scale: 1, x: 0, y: 0 };

function clampScale(value: number) {
  return Math.min(4, Math.max(1, value));
}

export function PersistentTripPortrait({
  portrait,
  revealToken,
}: {
  portrait?: TripPortrait;
  revealToken: number;
}) {
  const [open, setOpen] = useState(revealToken > 0);
  const [view, setView] = useState(INITIAL_VIEW);
  const drag = useRef<{ pointerId: number; x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!portrait) return null;

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setView((value) => ({ ...value, x: value.x + dx, y: value.y + dy }));
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const zoom = (amount: number) => {
    setView((value) => ({ ...value, scale: clampScale(value.scale + amount) }));
  };

  const wheelZoom = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoom(event.deltaY > 0 ? -0.2 : 0.2);
  };

  return (
    <>
      <button
        aria-label="Open your persistent trip portrait"
        className="trip-portrait-sticker"
        onClick={() => setOpen(true)}
        type="button"
      >
        {/* A normal img preserves the generated image without putting its URL into CSS. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={portrait.imageUrl} />
        <span>Your trip portrait</span>
      </button>

      {open ? (
        <div
          aria-label="Interactive trip portrait"
          aria-modal="true"
          className="trip-portrait-modal"
          role="dialog"
        >
          <header className="trip-portrait-header">
            <div>
              <p>Gemini assembled {portrait.photoCount} trip {portrait.photoCount === 1 ? "photo" : "photos"}</p>
              <h2>The whole trip, together</h2>
            </div>
            <button onClick={() => setOpen(false)} type="button">Minimize</button>
          </header>

          <div
            className="trip-portrait-viewport"
            onPointerCancel={finishDrag}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onWheel={wheelZoom}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`A generated group portrait assembled from ${portrait.photoCount} trip photos`}
              draggable={false}
              src={portrait.imageUrl}
              style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
            />
          </div>

          <footer className="trip-portrait-footer">
            <div className="trip-portrait-controls" aria-label="Portrait controls">
              <button aria-label="Zoom out" onClick={() => zoom(-0.25)} type="button">−</button>
              <button onClick={() => setView(INITIAL_VIEW)} type="button">Reset</button>
              <button aria-label="Zoom in" onClick={() => zoom(0.25)} type="button">+</button>
            </div>
            <p>Drag to explore · Scroll or use the controls to zoom</p>
            <details>
              <summary>Photos woven into this portrait</summary>
              <ul>
                {portrait.photoLabels.map((label, index) => (
                  <li key={`${label}-${index}`}>{label}</li>
                ))}
              </ul>
            </details>
          </footer>
        </div>
      ) : null}
    </>
  );
}
