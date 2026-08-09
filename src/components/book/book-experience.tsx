"use client";

import dynamic from "next/dynamic";
import {
  FormEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { CharacterPhotoUpload } from "@/components/character-photo-upload";
import { MemoryModelPreview } from "@/components/memory-model-preview";
import { UploadPanel } from "@/components/upload-panel";
import type { MemoryArtifact } from "@/lib/memory-artifacts";

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

const ArenaMatch = dynamic(() => import("@/components/arena/arena-match"), {
  ssr: false,
  loading: () => <div className="arena-game-loading">Loading arena…</div>,
});

type LobbyMode = "create" | "join";
type ExperienceStep = "cover" | "opening" | "lobby" | "scrapbook";

type Viewer = {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
};

type ScrapbookSession = {
  code: string;
  name: string;
};

type MemoryItem = MemoryArtifact & {
  ability?: string;
};

type ScrapbookOverlay = "upload" | "arena";
type DragDirection = "next" | "previous";
type DragPreview = { direction: DragDirection; progress: number };

const DRAG_AXIS_SLOP = 8;
const OPENING_SPREAD = Math.floor(TOTAL_SPREADS / 2);

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

function LobbyDialog({
  mode,
  onClose,
  onComplete,
}: {
  mode: LobbyMode;
  onClose: () => void;
  onComplete: (session: ScrapbookSession) => void;
}) {
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createdSession, setCreatedSession] = useState<ScrapbookSession>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/scrapbooks", {
        body: JSON.stringify(
          mode === "create"
            ? { action: "create", name }
            : { action: "join", code: joinCode },
        ),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as ScrapbookSession & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not enter the scrapbook");
      if (mode === "create") setCreatedSession({ code: result.code, name: result.name });
      else onComplete({ code: result.code, name: result.name });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not enter the scrapbook");
    } finally {
      setPending(false);
    }
  };

  const copyCode = async () => {
    if (!createdSession) return;
    try {
      await navigator.clipboard.writeText(createdSession.code);
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
        <button className="dialog-close" onClick={onClose} aria-label="Close dialog" type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
            <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>

        <div className="lobby-dialog-content">
          <header className="lobby-dialog-heading">
            <p className="dialog-kicker">{mode === "create" ? "New scrapbook" : "Have an invite?"}</p>
            <h2 id="lobby-dialog-title">
              {createdSession
                ? "Your page is ready."
                : mode === "create"
                  ? "What should we call it?"
                  : "Join someone’s page."}
            </h2>
            <p className="dialog-copy">
              {createdSession
                ? "Share this code with the people you want in the scrapbook."
                : mode === "create"
                  ? "Give this scrapbook a name. You can fill it together from there."
                  : "Enter the page code from your invitation."}
            </p>
          </header>

          {createdSession ? (
            <div className="created-lobby">
              <div className="created-lobby-field">
                <span className="created-name">{createdSession.name}</span>
                <button className="lobby-code" onClick={copyCode} type="button">
                  <span>{createdSession.code}</span>
                  <small>{copied ? "Copied" : "Copy code"}</small>
                </button>
              </div>
              <button
                className="dialog-primary"
                onClick={() => onComplete(createdSession)}
                type="button"
              >
                Open the scrapbook
              </button>
            </div>
          ) : (
            <form className="dialog-form" onSubmit={submit}>
              <div className="dialog-field">
                <label htmlFor="lobby-field">
                  {mode === "create" ? "Scrapbook name" : "Page code"}
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
                  placeholder={mode === "create" ? "Summer we turned twenty" : "e.g. SUN8UP"}
                  required
                  value={mode === "create" ? name : joinCode}
                />
              </div>
              {error ? <p className="dialog-error" role="alert">{error}</p> : null}
              <button className="dialog-primary" disabled={pending} type="submit">
                {pending ? "Opening…" : mode === "create" ? "Create this page" : "Join the page"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function MemberCharacter({
  currentUserId,
  selected,
  viewer,
  onSelect,
}: {
  currentUserId: string;
  selected: boolean;
  viewer: Viewer;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={selected ? "scrapbook-member is-selected" : "scrapbook-member"}
      onClick={onSelect}
      type="button"
    >
      <p className="member-name">{viewer.name}</p>
      <div className="member-scene">
        {viewer.avatarUrl ? (
          <div
            aria-label={`${viewer.name} character`}
            className="member-avatar"
            role="img"
            style={{ backgroundImage: `url(${viewer.avatarUrl})` }}
          />
        ) : (
          <div className="stick-person" aria-label={`${viewer.name} character placeholder`} role="img">
            <span className="stick-head">{viewer.initials}</span>
            <span className="stick-body" />
            <span className="stick-arms" />
            <span className="stick-leg stick-leg-left" />
            <span className="stick-leg stick-leg-right" />
          </div>
        )}
        <span className="member-chest" aria-hidden="true">
          <span className="chest-lid" />
          <span className="chest-lock" />
        </span>
      </div>
      <span className="member-note">
        {viewer.id === currentUserId ? "You · memory keeper" : "Scrapbook member"}
      </span>
      <span className="member-card-action">{selected ? "Viewing profile" : "Open profile"}</span>
    </button>
  );
}

function InventoryItemCard({ item }: { item: MemoryItem }) {
  return (
    <article className="inventory-item">
      {item.artifactModelUrl ? (
        <MemoryModelPreview
          className="inventory-item-art"
          modelUrl={item.artifactModelUrl}
          name={item.name}
        />
      ) : (
        <div
          aria-label={`Legacy illustration of ${item.name}`}
          className="inventory-item-art legacy-artifact-image"
          role="img"
          style={item.artifactImageUrl ? { backgroundImage: `url(${item.artifactImageUrl})` } : undefined}
        />
      )}
      <div>
        <h4>{item.name}</h4>
        {item.ability ? <p>{item.ability}</p> : null}
        {item.originalMemory ? <small>{item.originalMemory}</small> : null}
        {item.addedBy ? <span>Added by {item.addedBy}</span> : null}
      </div>
    </article>
  );
}

function UploadMemoryOverlay({
  recipient,
  roomCode,
  onArtifactsGenerated,
  onClose,
}: {
  recipient: Viewer;
  roomCode: string;
  onArtifactsGenerated: (artifacts: MemoryArtifact[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="scrapbook-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="upload-memory-title"
        aria-modal="true"
        className="scrapbook-modal upload-memory-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="scrapbook-modal-close" onClick={onClose} aria-label="Close upload memory" type="button">×</button>
        <header className="overlay-heading">
          <p>For {recipient.name}</p>
          <h2 id="upload-memory-title">Upload a memory</h2>
          <span>Every file becomes one generated 3D object for {recipient.name}’s collection.</span>
        </header>

        <div className="memory-flow-steps" aria-label="Memory upload steps">
          <span className="active"><strong>1</strong> Add memories</span>
          <span><strong>2</strong> Build 3D keepsakes</span>
          <span><strong>3</strong> Attach to {recipient.name}</span>
        </div>

        <div className="scrapbook-uploader modal-uploader" data-recipient-id={recipient.id}>
          <UploadPanel
            onArtifactsGenerated={onArtifactsGenerated}
            recipientUserId={recipient.id}
            roomCode={roomCode}
          />
        </div>

        <section className="memory-recipient" aria-labelledby="recipient-title">
          <span className="memory-step">Recipient selected</span>
          <h3 id="recipient-title">{recipient.name}</h3>
          <p>
            One memory makes one object. Finished keepsakes appear in this
            member’s inventory automatically.
          </p>
        </section>
      </section>
    </div>
  );
}

function SelectedMemberProfile({
  currentUserId,
  items,
  member,
  onArena,
  onAvatarGenerated,
  onBack,
  onUpload,
}: {
  currentUserId: string;
  items: MemoryItem[];
  member: Viewer;
  onArena: () => void;
  onAvatarGenerated: (avatarUrl: string) => void;
  onBack: () => void;
  onUpload: () => void;
}) {
  const isCurrentUser = member.id === currentUserId;

  return (
    <div className="right-page-content member-profile-content" key={member.id}>
      <div className="member-profile-toolbar">
        <button className="profile-back" onClick={onBack} type="button">← Scrapbook overview</button>
        <button className="profile-arena" onClick={onArena} type="button">⚔ Arena</button>
      </div>

      <header className="selected-member-header">
        {member.avatarUrl ? (
          <div
            aria-label={`${member.name} character`}
            className="selected-member-avatar"
            role="img"
            style={{ backgroundImage: `url(${member.avatarUrl})` }}
          />
        ) : (
          <div className="selected-member-portrait" aria-hidden="true">
            <span>{member.initials}</span>
            <i className="portrait-body" />
            <i className="portrait-arms" />
          </div>
        )}
        <div>
          <p>{isCurrentUser ? "You · Memory keeper" : "Scrapbook member"}</p>
          <h2>{member.name}</h2>
          <span>Every keepsake added for {member.name} will collect on this page.</span>
        </div>
        <div className="profile-chest" aria-hidden="true">
          <span />
          <i />
        </div>
      </header>

      <div className="profile-inventory-heading">
        <div>
          <p>Inventory</p>
          <h3>Memory keepsakes</h3>
        </div>
        <span>{items.length}</span>
      </div>

      {items.length ? (
        <div className="inventory-grid profile-inventory-grid">
          {items.map((item) => <InventoryItemCard item={item} key={item.id} />)}
        </div>
      ) : (
        <div className="profile-empty-inventory">
          <div className="profile-empty-mark" aria-hidden="true">✦</div>
          <div>
            <h3>No keepsakes yet.</h3>
            <p>Add a memory to start their collection.</p>
          </div>
        </div>
      )}

      <div className="profile-memory-action">
        {isCurrentUser ? (
          <>
            <button disabled type="button">+ Upload Memory</button>
            <p>Others add memories to you.</p>
          </>
        ) : (
          <button onClick={onUpload} type="button">+ Upload Memory for {member.name}</button>
        )}
      </div>

      {isCurrentUser ? (
        <div className="profile-character-action">
          <h3>{member.avatarUrl ? "Update your character" : "Create your character"}</h3>
          <p>Upload a photo of yourself and we&apos;ll draw your character for the scrapbook and arena.</p>
          <CharacterPhotoUpload onAvatarGenerated={onAvatarGenerated} />
        </div>
      ) : null}
    </div>
  );
}

function ArenaOverlay({
  characterImageUrl,
  items,
  onClose,
  roomCode,
  viewer,
}: {
  characterImageUrl?: string;
  items: MemoryItem[];
  onClose: () => void;
  roomCode: string;
  viewer: Viewer;
}) {
  return (
    <div className="scrapbook-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="arena-title"
        aria-modal="true"
        className="scrapbook-modal arena-modal arena-game-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="sr-only" id="arena-title">Memory Arena</h2>
        <button className="scrapbook-modal-close arena-game-close" onClick={onClose} aria-label="Close arena" type="button">×</button>
        <ArenaMatch characterImageUrl={characterImageUrl} items={items} roomCode={roomCode} viewer={viewer} />
      </section>
    </div>
  );
}

function Scrapbook({
  session,
  viewer: initialViewer,
}: {
  session: ScrapbookSession;
  viewer: Viewer;
}) {
  const [viewer, setViewer] = useState(initialViewer);
  const [members, setMembers] = useState<Viewer[]>([initialViewer]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [overlay, setOverlay] = useState<ScrapbookOverlay>();
  const [artifacts, setArtifacts] = useState<MemoryArtifact[]>([]);
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const viewerArtifacts = artifacts.filter(
    (artifact) => artifact.recipientId === viewer.id,
  );

  const handleAvatarGenerated = (avatarUrl: string) => {
    setViewer((current) => ({ ...current, avatarUrl }));
    setMembers((current) => current.map((member) =>
      member.id === initialViewer.id ? { ...member, avatarUrl } : member,
    ));
  };

  const addArtifacts = (newArtifacts: MemoryArtifact[]) => {
    setArtifacts((current) => {
      const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
      newArtifacts.forEach((artifact) => byId.set(artifact.id, artifact));
      return Array.from(byId.values());
    });
  };

  useEffect(() => {
    if (!selectedMemberId && !overlay) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (overlay) setOverlay(undefined);
        else setSelectedMemberId(undefined);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedMemberId, overlay]);

  useEffect(() => {
    let cancelled = false;
    const syncMembers = async () => {
      try {
        const response = await fetch(`/api/scrapbooks/${encodeURIComponent(session.code)}`, { cache: "no-store" });
        const result = await response.json() as {
          artifacts?: MemoryArtifact[];
          members?: Array<Omit<Viewer, "avatarUrl"> & { avatarUrl?: string | null }>;
        };
        if (response.ok && result.members && !cancelled) {
          setMembers(result.members.map((member) => ({
            ...member,
            avatarUrl:
              member.avatarUrl ??
              (member.id === viewer.id ? viewer.avatarUrl : undefined),
          })));
          if (result.artifacts) setArtifacts(result.artifacts);
        }
      } catch {
        // Keep the last known member list while the room connection recovers.
      }
    };
    void syncMembers();
    const timer = window.setInterval(() => { void syncMembers(); }, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session.code, viewer.avatarUrl, viewer.id]);

  return (
    <section className="scrapbook-stage" aria-label={`${session.name} scrapbook`}>
      <div className="scrapbook-book">
        <div className="scrapbook-binding" aria-hidden="true" />
        <div className="scrapbook-page scrapbook-page-left">
          <header className="scrapbook-heading">
            <p>Our scrapbook</p>
            <h1>{session.name}</h1>
            <span>Page code · {session.code}</span>
          </header>

          <div className="torn-rule" aria-hidden="true" />
          <div className="member-list-heading">
            <div>
              <p>The people in this book</p>
              <span>Characters are placeholders for now.</span>
            </div>
            <strong>{members.length}</strong>
          </div>
          <div className="scrapbook-members">
            {members.map((member) => (
              <MemberCharacter
                currentUserId={viewer.id}
                key={member.id}
                selected={selectedMemberId === member.id}
                viewer={member}
                onSelect={() => setSelectedMemberId(member.id)}
              />
            ))}
          </div>
        </div>

        <div className="scrapbook-page scrapbook-page-right">
          {selectedMember ? (
            <SelectedMemberProfile
              currentUserId={viewer.id}
              items={artifacts.filter(
                (artifact) => artifact.recipientId === selectedMember.id,
              )}
              member={selectedMember}
              onArena={() => setOverlay("arena")}
              onAvatarGenerated={handleAvatarGenerated}
              onBack={() => setSelectedMemberId(undefined)}
              onUpload={() => setOverlay("upload")}
            />
          ) : (
            <div className="right-page-content overview-page-content">
              <div className="scrapbook-actions overview-actions">
                <button className="arena-action" onClick={() => setOverlay("arena")} type="button">
                  <span aria-hidden="true">⚔</span> Enter Arena
                </button>
              </div>

              <header className="memory-heading scrapbook-world-heading">
                <p>A shared world</p>
                <h2>Made by remembering.</h2>
                <span>Every person carries a chest. Select someone from the left page to see the keepsakes growing with them.</span>
              </header>

              <div className="scrapbook-stats" aria-label="Scrapbook details">
                <div>
                  <strong>{members.length}</strong>
                  <span>{members.length === 1 ? "Member" : "Members"}</span>
                </div>
                <div>
                  <strong>{artifacts.length}</strong>
                  <span>Memory items</span>
                </div>
              </div>

              <section className="memory-wall" aria-labelledby="memory-wall-title">
                <span className="memory-wall-tape" aria-hidden="true" />
                <p>Open someone’s page</p>
                <h3 id="memory-wall-title">Every person keeps a different part of the story.</h3>
                <span>Select a member card to view their character, chest, and growing memory inventory.</span>
              </section>
            </div>
          )}
        </div>
      </div>

      {overlay === "upload" && selectedMember
        ? createPortal(
            <UploadMemoryOverlay
              recipient={selectedMember}
              roomCode={session.code}
              onArtifactsGenerated={addArtifacts}
              onClose={() => setOverlay(undefined)}
            />,
            document.body,
          )
        : null}
      {overlay === "arena"
        ? createPortal(
            <ArenaOverlay
              characterImageUrl={viewer.avatarUrl}
              items={viewerArtifacts}
              onClose={() => setOverlay(undefined)}
              roomCode={session.code}
              viewer={viewer}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

export function BookExperience({
  greetingName,
  viewer,
}: {
  greetingName: string;
  viewer: Viewer;
}) {
  const [step, setStep] = useState<ExperienceStep>("cover");
  const [dialog, setDialog] = useState<LobbyMode>();
  const [session, setSession] = useState<ScrapbookSession>();
  const [spread, setSpread] = useState(OPENING_SPREAD);
  const [dragPreview, setDragPreview] = useState<DragPreview>();
  const openingTimer = useRef<number | undefined>(undefined);
  const dragStart = useRef<
    | {
        pointerId: number;
        x: number;
        y: number;
        time: number;
      }
    | undefined
  >(undefined);

  useEffect(() => () => window.clearTimeout(openingTimer.current), []);

  const previous = useCallback(() => {
    setSpread((value) => Math.max(0, value - 1));
  }, []);

  const next = useCallback(() => {
    setSpread((value) => Math.min(TOTAL_SPREADS - 1, value + 1));
  }, []);

  const startPageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (step !== "lobby") return;
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
    if (step !== "lobby") return;

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
  }, [dialog, next, previous, step]);

  const openBook = () => {
    if (step !== "cover") return;
    setStep("opening");
    const animationLength = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 1_750;
    openingTimer.current = window.setTimeout(() => setStep("lobby"), animationLength);
  };

  const enterScrapbook = (nextSession: ScrapbookSession) => {
    setDialog(undefined);
    setSession(nextSession);
    setStep("scrapbook");
  };

  const activeSpread = BOOK_SPREADS[spread] ?? BOOK_SPREADS[0];
  const progressLabel = `Spread ${spread + 1} of ${TOTAL_SPREADS}: ${activeSpread.title}`;

  return (
    <main className="book-home">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />

      {step !== "scrapbook" ? (
        <section
          className="book-hero"
          aria-label={step === "cover" ? "Closed 3D scrapbook" : "Interactive 3D scrapbook"}
        >
          <div
            aria-describedby={step === "lobby" ? "book-instructions" : undefined}
            className={
              dragPreview
                ? "book-stage setup-book-stage is-dragging"
                : step === "cover"
                  ? "book-stage setup-book-stage is-cover"
                  : step === "opening"
                    ? "book-stage setup-book-stage is-opening"
                    : "book-stage setup-book-stage"
            }
            onPointerCancel={cancelPageDrag}
            onPointerDown={startPageDrag}
            onPointerMove={updatePageDrag}
            onPointerUp={finishPageDrag}
          >
            <BookScene
              currentSpread={spread}
              dragPreview={dragPreview}
              greetingName={greetingName}
              interactive={step === "lobby"}
              onNext={next}
              onOpen={openBook}
              onPrevious={previous}
              open={step !== "cover"}
            />
            {step === "cover" ? (
              <div className="three-cover-overlay">
                <button onClick={openBook} type="button">
                  Open Scrapbook <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : null}
            {step === "lobby" && spread === TOTAL_SPREADS - 1 && !dragPreview ? (
              <div className="final-page-overlay">
                <FinalPageActions
                  onCreate={() => setDialog("create")}
                  onJoin={() => setDialog("join")}
                />
              </div>
            ) : null}
          </div>

          {step === "cover" ? <p className="cover-hint">Open when you’re ready</p> : null}
          {step === "lobby" ? (
            <>
              <div className="book-navigation" aria-label="Scrapbook pages">
                <div className="spread-dots">
                  {BOOK_SPREADS.map((item, index) => (
                    <button
                      aria-current={index === spread ? "page" : undefined}
                      aria-label={`Open spread ${index + 1}: ${item.title}`}
                      className={index === spread ? "spread-dot active" : "spread-dot"}
                      key={item.title}
                      onClick={() => setSpread(index)}
                      type="button"
                    />
                  ))}
                </div>
              </div>
              <p className="book-instructions" id="book-instructions">
                Drag or click a page to flip · Arrow keys also work
              </p>
              <p className="sr-only" aria-live="polite">{progressLabel}</p>
            </>
          ) : null}
        </section>
      ) : null}

      {step === "scrapbook" && session ? (
        <Scrapbook
          session={session}
          viewer={viewer}
        />
      ) : null}

      {dialog ? (
        <LobbyDialog mode={dialog} onClose={() => setDialog(undefined)} onComplete={enterScrapbook} />
      ) : null}
    </main>
  );
}
