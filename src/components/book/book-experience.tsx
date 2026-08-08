"use client";

import dynamic from "next/dynamic";
import {
  FormEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BOOK_SPREADS, TOTAL_SPREADS } from "./book-content";

const BookScene = dynamic(() => import("./book-scene"), {
  ssr: false,
  loading: () => (
    <div className="book-loading" role="status">
      <span className="book-loading-cover" aria-hidden="true" />
      <span>Binding your book…</span>
    </div>
  ),
});

type LobbyMode = "create" | "join";
type DragDirection = "next" | "previous";
type DragPreview = { direction: DragDirection; progress: number };

const DRAG_AXIS_SLOP = 8;

function FinalPageActions({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <article
      className="model-page-actions"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p>The last page</p>
      <h2>Your next page starts here.</h2>
      <span>Open a room of your own, or arrive with a code.</span>
      <div className="model-page-buttons">
        <button onClick={onCreate} type="button">
          <span className="button-mark" aria-hidden="true">+</span>
          Create a new page
        </button>
        <button className="secondary" onClick={onJoin} type="button">
          <span className="button-mark arrow" aria-hidden="true">→</span>
          Join a page
        </button>
      </div>
    </article>
  );
}

function generateLobbyCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function LobbyDialog({
  mode,
  onClose,
  onComplete,
}: {
  mode: LobbyMode;
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string>();
  const [copied, setCopied] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "create") {
      setCreatedCode(generateLobbyCode());
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();
    if (normalizedCode.length < 4) return;
    onComplete(`Page ${normalizedCode} is ready to join.`);
  };

  const copyCode = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="lobby-dialog-title"
        aria-modal="true"
        className="lobby-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
            <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>

        <p className="dialog-kicker">{mode === "create" ? "New page" : "Have an invite?"}</p>
        <h2 id="lobby-dialog-title">
          {createdCode
            ? "Your page is ready."
            : mode === "create"
              ? "What should we call it?"
              : "Join someone’s page."}
        </h2>
        <p className="dialog-copy">
          {createdCode
            ? "Share this code with the people you want in the room."
            : mode === "create"
              ? "Give the room a name. You can shape everything else together later."
              : "Enter the page code from your invitation."}
        </p>

        {createdCode ? (
          <div className="created-lobby">
            <span className="created-name">{name || "Untitled page"}</span>
            <button className="lobby-code" onClick={copyCode} type="button">
              <span>{createdCode}</span>
              <small>{copied ? "Copied" : "Copy code"}</small>
            </button>
            <button
              className="dialog-primary"
              onClick={() => onComplete(`Page ${createdCode} was created.`)}
              type="button"
            >
              Open the page
            </button>
          </div>
        ) : (
          <form className="dialog-form" onSubmit={submit}>
            <label htmlFor="lobby-field">
              {mode === "create" ? "Page name" : "Page code"}
            </label>
            <input
              autoFocus
              autoComplete="off"
              id="lobby-field"
              maxLength={mode === "create" ? 48 : 8}
              onChange={(event) =>
                mode === "create"
                  ? setName(event.target.value)
                  : setJoinCode(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))
              }
              placeholder={mode === "create" ? "Late-night launch" : "e.g. SUN8UP"}
              required
              value={mode === "create" ? name : joinCode}
            />
            <button className="dialog-primary" type="submit">
              {mode === "create" ? "Create this page" : "Join the page"}
            </button>
          </form>
        )}

        <p className="dialog-note">
          Lobby presence is a preview for now. Persistence and live members can plug into the existing backend next.
        </p>
      </section>
    </div>
  );
}

export function BookExperience() {
  const [spread, setSpread] = useState(0);
  const [dialog, setDialog] = useState<LobbyMode>();
  const [toast, setToast] = useState<string>();
  const [dragPreview, setDragPreview] = useState<DragPreview>();
  const dragStart = useRef<
    | {
        pointerId: number;
        x: number;
        y: number;
        time: number;
      }
    | undefined
  >(undefined);

  const previous = useCallback(() => {
    setSpread((value) => Math.max(0, value - 1));
  }, []);

  const next = useCallback(() => {
    setSpread((value) => Math.min(TOTAL_SPREADS - 1, value + 1));
  }, []);

  const startPageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;

    setDragPreview(undefined);
    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updatePageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < DRAG_AXIS_SLOP || Math.abs(deltaX) <= Math.abs(deltaY)) {
      setDragPreview(undefined);
      return;
    }

    const direction: DragDirection = deltaX < 0 ? "next" : "previous";
    const canTurn = direction === "next" ? spread < TOTAL_SPREADS - 1 : spread > 0;
    if (!canTurn) {
      setDragPreview(undefined);
      return;
    }

    const previewDistance = Math.max(180, event.currentTarget.clientWidth * 0.38);
    setDragPreview({
      direction,
      progress: Math.min(1, Math.abs(deltaX) / previewDistance),
    });
  };

  const finishPageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const elapsed = Math.max(1, performance.now() - start.time);
    const velocity = Math.abs(deltaX) / elapsed;
    const commitDistance = Math.min(96, event.currentTarget.clientWidth * 0.13);
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
    const shouldTurn =
      isHorizontal &&
      (Math.abs(deltaX) >= commitDistance ||
        (Math.abs(deltaX) >= 24 && velocity >= 0.55));

    if (shouldTurn) {
      if (deltaX < 0) next();
      else previous();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = undefined;
    setDragPreview(undefined);
  };

  const cancelPageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    dragStart.current = undefined;
    setDragPreview(undefined);
  };

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (dialog) {
        if (event.key === "Escape") setDialog(undefined);
        return;
      }

      const target = event.target;
      if (
        target instanceof Element &&
        target.matches("input, textarea, select, button, a")
      ) {
        return;
      }

      if (["ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        previous();
      } else if (event.key === "Home") {
        setSpread(0);
      } else if (event.key === "End") {
        setSpread(TOTAL_SPREADS - 1);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [dialog, next, previous]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeSpread = BOOK_SPREADS[spread];
  const progressLabel = useMemo(
    () => `Spread ${spread + 1} of ${TOTAL_SPREADS}: ${activeSpread.title}`,
    [activeSpread.title, spread],
  );

  const finishDialog = (message: string) => {
    setDialog(undefined);
    setToast(message);
  };

  return (
    <main className="book-home">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />

      <section className="book-hero" aria-label="Interactive Summerhacks book">
        <div
          className={dragPreview ? "book-stage is-dragging" : "book-stage"}
          aria-describedby="book-instructions"
          onPointerCancel={cancelPageDrag}
          onPointerDown={startPageDrag}
          onPointerMove={updatePageDrag}
          onPointerUp={finishPageDrag}
        >
          <BookScene
            currentSpread={spread}
            dragPreview={dragPreview}
            onNext={next}
            onPrevious={previous}
          />

          {spread === TOTAL_SPREADS - 1 ? (
            <div className="final-page-overlay">
              <FinalPageActions
                onCreate={() => setDialog("create")}
                onJoin={() => setDialog("join")}
              />
            </div>
          ) : null}
        </div>

        <div className="book-navigation">
          <div className="spread-dots" aria-hidden="true">
            {BOOK_SPREADS.map((item, index) => (
              <button
                className={index === spread ? "spread-dot active" : "spread-dot"}
                key={item.title}
                onClick={() => setSpread(index)}
                tabIndex={-1}
              />
            ))}
          </div>
        </div>

        <p className="book-instructions" id="book-instructions">
          Drag a page left or right to flip · Arrow keys also work
        </p>
        <p className="sr-only" aria-live="polite">
          {progressLabel}
        </p>
      </section>

      {dialog ? (
        <LobbyDialog mode={dialog} onClose={() => setDialog(undefined)} onComplete={finishDialog} />
      ) : null}

      {toast ? (
        <div className="lobby-toast" role="status">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      ) : null}
    </main>
  );
}
