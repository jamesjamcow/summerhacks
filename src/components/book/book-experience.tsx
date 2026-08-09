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
import { CharacterAvatarPreview } from "@/components/character-avatar-preview";
import { MemoryModelPreview } from "@/components/memory-model-preview";
import { UploadPanel } from "@/components/upload-panel";
import type { MemoryArtifact } from "@/lib/memory-artifacts";
import type { ScrapbookMatchPage } from "@/lib/scrapbook-pages";
import {
  parseTripPortrait,
  tripPortraitStorageKey,
  type TripPortrait,
} from "@/lib/trip-portrait";

import { BOOK_SPREADS, TOTAL_SPREADS } from "./book-content";
import { PersistentTripPortrait } from "./persistent-trip-portrait";

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
  avatarImageUrl?: string;
  avatarModelUrl?: string;
};

type ScrapbookSession = {
  code: string;
  name: string;
};

type MemoryItem = MemoryArtifact & {
  ability?: string;
};

type ScrapbookOverlay = "arena";
type DragDirection = "next" | "previous";
type DragPreview = { direction: DragDirection; progress: number };

const DRAG_AXIS_SLOP = 8;
const OPENING_SPREAD = 0;

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
          <svg aria-hidden="true" className="model-page-button-icon" viewBox="0 0 96 96">
            <path d="M25 13.5h34l14 14v55H25z" />
            <path d="M59 13.5v14h14M48.5 42v25M36 54.5h25" />
          </svg>
          <span>Create a new page</span>
        </button>
        <button className="secondary" onClick={onJoin} type="button">
          <svg aria-hidden="true" className="model-page-button-icon" viewBox="0 0 96 96">
            <path d="M45 13.5h24l14 14v55H45z" />
            <path d="M69 13.5v14h14M13 52h45M46 40l12 12-12 12" />
          </svg>
          <span>Join a page</span>
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
        {viewer.avatarModelUrl ? (
          <CharacterAvatarPreview
            className="member-avatar-model"
            modelUrl={viewer.avatarModelUrl}
            name={viewer.name}
          />
        ) : viewer.avatarImageUrl ? (
          <div
            aria-label={`${viewer.name} legacy character illustration`}
            className="member-avatar"
            role="img"
            style={{ backgroundImage: `url(${viewer.avatarImageUrl})` }}
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
      <div className="inventory-item-details">
        <h4>{item.name}</h4>
        {item.itemType ? (
          <p>{item.itemType === "power-up" ? "Power-up · +20% movement speed" : "Weapon · throwable memory"}</p>
        ) : item.ability ? <p>{item.ability}</p> : null}
        {item.originalMemory ? <small>{item.originalMemory}</small> : null}
        {item.addedBy ? <span>Added by {item.addedBy}</span> : null}
      </div>
    </article>
  );
}

function SelectedMemberProfile({
  currentUserId,
  items,
  member,
  onArtifactsGenerated,
  onAvatarGenerated,
  roomCode,
}: {
  currentUserId: string;
  items: MemoryItem[];
  member: Viewer;
  onArtifactsGenerated: (artifacts: MemoryArtifact[]) => void;
  onAvatarGenerated: (avatarModelUrl: string) => void;
  roomCode: string;
}) {
  const isCurrentUser = member.id === currentUserId;

  return (
    <div className="right-page-content member-profile-content" key={member.id}>
      <header className="selected-member-header">
        <div className="selected-member-copy">
          {!isCurrentUser ? <p>Scrapbook member</p> : null}
          <h2>{isCurrentUser ? "Your profile" : member.name}</h2>
          <span>
            {isCurrentUser
              ? "Every keepsake added for you will collect on this page."
              : `Every keepsake added for ${member.name} will collect on this page.`}
          </span>
        </div>
      </header>

      {!isCurrentUser ? (
        <div className="profile-inventory-heading">
          <div>
            <p>Inventory</p>
            <h3>Memory keepsakes</h3>
          </div>
          <span>{items.length}</span>
        </div>
      ) : null}

      {items.length ? (
        <div className="inventory-grid profile-inventory-grid">
          {items.map((item) => <InventoryItemCard item={item} key={item.id} />)}
        </div>
      ) : null}

      {!isCurrentUser ? (
        <div className={`profile-memory-action${items.length ? "" : " is-empty"}`}>
          <UploadPanel
            onArtifactsGenerated={onArtifactsGenerated}
            recipientName={member.name}
            recipientUserId={member.id}
            roomCode={roomCode}
            variant="ticket"
          />
        </div>
      ) : null}

      {isCurrentUser ? (
        <div className="profile-character-action">
          <h3>{member.avatarModelUrl || member.avatarImageUrl ? "Update your avatar" : "Create your avatar"}</h3>
          <p>Upload a photo and Gemini will build your 3D avatar for the scrapbook cards and arena.</p>
          <CharacterPhotoUpload onAvatarGenerated={onAvatarGenerated} />
        </div>
      ) : null}
    </div>
  );
}

function ArenaOverlay({
  items,
  onClose,
  onPageCreated,
  onPortraitCreated,
  onViewPage,
  roomCode,
  viewer,
}: {
  items: MemoryItem[];
  onClose: () => void;
  onPageCreated: (page: ScrapbookMatchPage) => void;
  onPortraitCreated: (portrait: TripPortrait) => void;
  onViewPage: (pageNumber: number) => void;
  roomCode: string;
  viewer: Viewer;
}) {
  const [entranceComplete, setEntranceComplete] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="arena-experience-overlay" role="presentation">
      <section
        aria-labelledby="arena-title"
        aria-modal="true"
        className="arena-fullscreen-dialog"
        role="dialog"
      >
        <h2 className="sr-only" id="arena-title">Memory Arena</h2>
        <button className="scrapbook-modal-close arena-game-close" onClick={onClose} aria-label="Close arena" type="button">×</button>
        {entranceComplete ? (
          <ArenaMatch
            items={items}
            onPageCreated={onPageCreated}
            onPortraitCreated={onPortraitCreated}
            onViewPage={(pageNumber) => {
              onViewPage(pageNumber);
              onClose();
            }}
            roomCode={roomCode}
            viewer={viewer}
          />
        ) : (
          <div className="arena-entry-curtain" role="status" aria-live="polite">
            <span onAnimationEnd={() => setEntranceComplete(true)}>Memory Arena</span>
          </div>
        )}
      </section>
    </div>
  );
}

function MatchScrapbookPage({ page }: { page: ScrapbookMatchPage }) {
  return (
    <article className="right-page-content match-scrapbook-page" key={page.id}>
      <header className="match-page-heading">
        <div>
          <p>Page {page.pageNumber} · Arena memory</p>
          <h2>{page.winnerName} won</h2>
          <span>{page.resultReason === "forfeit" ? "Match decided by forfeit" : "First to three memories"}</span>
        </div>
        <div className="match-page-winner" aria-label={`${page.winnerName} won`}>
          <span aria-hidden="true">★</span>
          <small>Winner</small>
        </div>
      </header>

      <div className="match-page-score" aria-label="Final score">
        {page.players.map((player) => (
          <div className={player.userId === page.winnerId ? "is-winner" : ""} key={player.userId}>
            <span>{player.name}</span>
            <strong>{player.score}</strong>
          </div>
        ))}
      </div>

      <section className="match-page-memories" aria-labelledby={`page-${page.pageNumber}-memories`}>
        <div className="match-page-memory-heading">
          <div>
            <p>What we brought with us</p>
            <h3 id={`page-${page.pageNumber}-memories`}>Uploaded memories</h3>
          </div>
          <span>{page.memories.length}</span>
        </div>
        {page.memories.length ? (
          <div className="match-memory-grid">
            {page.memories.map((memory) => (
              <article className="match-memory-card" key={memory.id}>
                {memory.fileType.startsWith("image/") ? (
                  <div
                    aria-label={memory.originalMemory}
                    className="match-memory-photo"
                    role="img"
                    style={{ backgroundImage: `url(${memory.sourceUrl})` }}
                  />
                ) : (
                  <div className="match-memory-file" aria-hidden="true">
                    {memory.fileType.startsWith("audio/") ? "♪" : "✦"}
                  </div>
                )}
                <div>
                  <strong>{memory.name}</strong>
                  <span>For {memory.recipientName} · by {memory.addedBy}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="match-page-empty">No completed uploads were available when this match ended.</p>
        )}
      </section>
    </article>
  );
}

function Scrapbook({
  onBackToLobby,
  onPortraitCreated,
  session,
  viewer: initialViewer,
}: {
  onBackToLobby: () => void;
  onPortraitCreated: (portrait: TripPortrait) => void;
  session: ScrapbookSession;
  viewer: Viewer;
}) {
  const [viewer, setViewer] = useState(initialViewer);
  const [members, setMembers] = useState<Viewer[]>([initialViewer]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [overlay, setOverlay] = useState<ScrapbookOverlay>();
  const [artifacts, setArtifacts] = useState<MemoryArtifact[]>([]);
  const [pages, setPages] = useState<ScrapbookMatchPage[]>([]);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>();
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const selectedPage = pages.find((page) => page.pageNumber === selectedPageNumber) ?? pages.at(-1);
  const viewerArtifacts = artifacts.filter(
    (artifact) => artifact.recipientId === viewer.id,
  );

  const handleAvatarGenerated = (avatarModelUrl: string) => {
    setViewer((current) => ({
      ...current,
      avatarImageUrl: undefined,
      avatarModelUrl,
    }));
    setMembers((current) => current.map((member) =>
      member.id === initialViewer.id
        ? { ...member, avatarImageUrl: undefined, avatarModelUrl }
        : member,
    ));
  };

  const addArtifacts = (newArtifacts: MemoryArtifact[]) => {
    setArtifacts((current) => {
      const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
      newArtifacts.forEach((artifact) => byId.set(artifact.id, artifact));
      return Array.from(byId.values());
    });
  };

  const addMatchPage = useCallback((page: ScrapbookMatchPage) => {
    setPages((current) => {
      const byMatch = new Map(current.map((item) => [item.matchId, item]));
      byMatch.set(page.matchId, page);
      return Array.from(byMatch.values()).sort((left, right) => left.pageNumber - right.pageNumber);
    });
    setSelectedMemberId(undefined);
    setSelectedPageNumber(page.pageNumber);
  }, []);

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
          members?: Array<{
            avatarImageUrl?: string | null;
            avatarModelUrl?: string | null;
            id: string;
            initials: string;
            name: string;
          }>;
          pages?: ScrapbookMatchPage[];
        };
        if (response.ok && result.members && !cancelled) {
          setMembers(result.members.map((member) => ({
            ...member,
            avatarImageUrl:
              member.avatarImageUrl ??
              (member.id === viewer.id ? viewer.avatarImageUrl : undefined),
            avatarModelUrl:
              member.avatarModelUrl ??
              (member.id === viewer.id ? viewer.avatarModelUrl : undefined),
          })));
          if (result.artifacts) setArtifacts(result.artifacts);
          if (result.pages) {
            setPages(result.pages);
            setSelectedPageNumber((current) =>
              current && result.pages?.some((page) => page.pageNumber === current)
                ? current
                : result.pages?.at(-1)?.pageNumber,
            );
          }
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
  }, [session.code, viewer.avatarImageUrl, viewer.avatarModelUrl, viewer.id]);

  return (
    <section className="scrapbook-stage" aria-label={`${session.name} scrapbook`}>
      <nav className="scrapbook-top-nav" aria-label="Scrapbook navigation">
        {selectedMember ? (
          <button
            aria-label="Back to scrapbook"
            className="scrapbook-back-button"
            onClick={onBackToLobby}
            type="button"
          >
            <span aria-hidden="true" className="scrapbook-back-arrow">←</span>
            <span className="scrapbook-back-label">Back to scrapbook</span>
          </button>
        ) : null}
        <button
          onClick={() => setOverlay("arena")}
          type="button"
        >
          Arena
        </button>
      </nav>
      <div className="scrapbook-book">
        <div className="scrapbook-binding" aria-hidden="true" />
        <div className="scrapbook-page scrapbook-page-left">
          <header className="scrapbook-heading">
            <h1>The people in this book</h1>
            <span>Page code · {session.code}</span>
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

          <div className="scrapbook-members">
            {members.map((member) => (
              <MemberCharacter
                currentUserId={viewer.id}
                key={member.id}
                selected={selectedMemberId === member.id}
                viewer={member}
                onSelect={() => setSelectedMemberId((current) =>
                  current === member.id ? undefined : member.id,
                )}
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
              onArtifactsGenerated={addArtifacts}
              onAvatarGenerated={handleAvatarGenerated}
              roomCode={session.code}
            />
          ) : selectedPage ? (
            <>
              <nav className="match-page-navigation" aria-label="Arena scrapbook pages">
                {pages.map((page) => (
                  <button
                    aria-current={page.pageNumber === selectedPage.pageNumber ? "page" : undefined}
                    className={page.pageNumber === selectedPage.pageNumber ? "is-current" : ""}
                    key={page.id}
                    onClick={() => setSelectedPageNumber(page.pageNumber)}
                    type="button"
                  >
                    {page.pageNumber}
                  </button>
                ))}
              </nav>
              <MatchScrapbookPage page={selectedPage} />
            </>
          ) : (
            <div className="right-page-content match-page-placeholder">
              <span aria-hidden="true">✦</span>
              <p>Your first arena story will live here.</p>
              <h2>Finish a match to make page 1.</h2>
              <small>The winner and everyone&apos;s uploaded memories will be bound into the scrapbook.</small>
              <button onClick={() => setOverlay("arena")} type="button">Enter Arena</button>
            </div>
          )}
        </div>
      </div>

      {overlay === "arena"
        ? createPortal(
            <ArenaOverlay
              items={viewerArtifacts}
              onClose={() => setOverlay(undefined)}
              onPageCreated={addMatchPage}
              onPortraitCreated={onPortraitCreated}
              onViewPage={(pageNumber) => {
                setSelectedMemberId(undefined);
                setSelectedPageNumber(pageNumber);
              }}
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
  const [tripPortrait, setTripPortrait] = useState<TripPortrait>();
  const [portraitRevealToken, setPortraitRevealToken] = useState(0);
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

  useEffect(() => {
    const storageKey = tripPortraitStorageKey(viewer.id);
    const readStoredPortrait = (serialized: string | null) => {
      if (!serialized) {
        setTripPortrait(undefined);
        return;
      }
      try {
        setTripPortrait(parseTripPortrait(JSON.parse(serialized)));
      } catch {
        setTripPortrait(undefined);
      }
    };

    readStoredPortrait(window.localStorage.getItem(storageKey));
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === storageKey) readStoredPortrait(event.newValue);
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, [viewer.id]);

  const rememberTripPortrait = useCallback((portrait: TripPortrait) => {
    setTripPortrait(portrait);
    setPortraitRevealToken((token) => token + 1);
    try {
      window.localStorage.setItem(
        tripPortraitStorageKey(viewer.id),
        JSON.stringify(portrait),
      );
    } catch {
      // The portrait remains available for this visit if storage is blocked.
    }
  }, [viewer.id]);

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
    if (step !== "cover" || openingTimer.current !== undefined) return;
    setStep("opening");
    const animationLength = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 1_750;
    openingTimer.current = window.setTimeout(() => {
      openingTimer.current = undefined;
      setStep("lobby");
    }, animationLength);
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
          aria-label={step === "cover" ? "Open the 3D scrapbook" : "Interactive 3D scrapbook"}
          className={step === "cover" ? "book-hero is-cover" : "book-hero"}
          onClick={step === "cover" ? openBook : undefined}
          onKeyDown={
            step === "cover"
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openBook();
                  }
                }
              : undefined
          }
          role={step === "cover" ? "button" : undefined}
          tabIndex={step === "cover" ? 0 : undefined}
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
                Flick, drag, or click a page to flip · Arrow keys also work
              </p>
              <p className="sr-only" aria-live="polite">{progressLabel}</p>
            </>
          ) : null}
        </section>
      ) : null}

      {step === "scrapbook" && session ? (
        <Scrapbook
          onBackToLobby={() => {
            setDialog(undefined);
            setDragPreview(undefined);
            setSession(undefined);
            setSpread(TOTAL_SPREADS - 1);
            setStep("lobby");
          }}
          onPortraitCreated={rememberTripPortrait}
          session={session}
          viewer={viewer}
        />
      ) : null}

      {dialog ? (
        <LobbyDialog mode={dialog} onClose={() => setDialog(undefined)} onComplete={enterScrapbook} />
      ) : null}

      <PersistentTripPortrait
        key={`${tripPortrait?.matchId ?? "none"}:${portraitRevealToken}`}
        portrait={tripPortrait}
        revealToken={portraitRevealToken}
      />
    </main>
  );
}
