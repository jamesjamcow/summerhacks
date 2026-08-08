"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CharacterPhotoUpload } from "@/components/character-photo-upload";
import { UploadPanel } from "@/components/upload-panel";
import type { MemoryArtifact } from "@/lib/memory-artifacts";

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
      <p>Begin together</p>
      <h2>Your next page starts here.</h2>
      <span>Open a scrapbook of your own, or arrive with a code.</span>
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
        <button className="dialog-close" onClick={onClose} aria-label="Close dialog">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
            <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </button>

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

        {createdSession ? (
          <div className="created-lobby">
            <span className="created-name">{createdSession.name}</span>
            <button className="lobby-code" onClick={copyCode} type="button">
              <span>{createdSession.code}</span>
              <small>{copied ? "Copied" : "Copy code"}</small>
            </button>
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
            {error ? <p className="dialog-error" role="alert">{error}</p> : null}
            <button className="dialog-primary" disabled={pending} type="submit">
              {pending ? "Opening…" : mode === "create" ? "Create this page" : "Join the page"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function ClosedBookCover({ opening, onStart }: { opening: boolean; onStart: () => void }) {
  const bookRef = useRef<HTMLDivElement>(null);

  const resetTilt = () => {
    bookRef.current?.style.setProperty("--book-pointer-x", "0deg");
    bookRef.current?.style.setProperty("--book-pointer-y", "0deg");
  };

  return (
    <section className={opening ? "cover-stage is-opening" : "cover-stage"} aria-label="Closed scrapbook cover">
      <div
        className={opening ? "closed-book is-opening" : "closed-book"}
        onPointerLeave={resetTilt}
        onPointerMove={(event) => {
          if (opening || !bookRef.current) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - bounds.left) / bounds.width - 0.5;
          const y = (event.clientY - bounds.top) / bounds.height - 0.5;
          bookRef.current.style.setProperty("--book-pointer-x", `${x * 5}deg`);
          bookRef.current.style.setProperty("--book-pointer-y", `${y * -4}deg`);
        }}
        ref={bookRef}
      >
        <div className="closed-book-pages" aria-hidden="true">
          <span className="closed-book-page-lines" />
        </div>
        <div className="closed-book-back" aria-hidden="true" />
        <div className="closed-book-front">
          <div className="closed-book-front-face">
            <span className="cover-corner cover-corner-one" aria-hidden="true" />
            <span className="cover-corner cover-corner-two" aria-hidden="true" />
            <div className="cover-rule" aria-hidden="true" />
            <p className="cover-kicker">A book of us</p>
            <h1>Scrapbook</h1>
            <p className="cover-line">Built by the people who remember you.</p>
            <button disabled={opening} onClick={onStart} type="button">
              Get Started
              <span aria-hidden="true">→</span>
            </button>
            <div className="cover-rule cover-rule-bottom" aria-hidden="true" />
          </div>
          <span className="closed-book-cover-edge" aria-hidden="true" />
        </div>
        <div className="closed-book-spine" aria-hidden="true" />
      </div>
      <p className="cover-hint">Open when you’re ready</p>
    </section>
  );
}

function MemberCharacter({
  selected,
  viewer,
  onSelect,
}: {
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
      <span className="member-note">You · memory keeper</span>
      <span className="member-card-action">{selected ? "Viewing profile" : "Open profile"}</span>
    </button>
  );
}

function InventoryItemCard({ item }: { item: MemoryItem }) {
  return (
    <article className="inventory-item">
      <div
        className="inventory-item-art"
        style={item.artifactImageUrl ? { backgroundImage: `url(${item.artifactImageUrl})` } : undefined}
      />
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
  onArtifactsGenerated,
  onClose,
}: {
  recipient: Viewer;
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
          <span>Every file becomes one hand-drawn object for {recipient.name}’s collection.</span>
        </header>

        <div className="memory-flow-steps" aria-label="Memory upload steps">
          <span className="active"><strong>1</strong> Add memories</span>
          <span><strong>2</strong> Draw keepsakes</span>
          <span><strong>3</strong> Attach to {recipient.name}</span>
        </div>

        <div className="scrapbook-uploader modal-uploader" data-recipient-id={recipient.id}>
          <UploadPanel onArtifactsGenerated={onArtifactsGenerated} />
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
  initialArtifacts,
  session,
  viewer: initialViewer,
}: {
  initialArtifacts: MemoryArtifact[];
  session: ScrapbookSession;
  viewer: Viewer;
}) {
  const [viewer, setViewer] = useState(initialViewer);
  const [members, setMembers] = useState<Viewer[]>([initialViewer]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>();
  const [overlay, setOverlay] = useState<ScrapbookOverlay>();
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const selectedMember = members.find((member) => member.id === selectedMemberId);

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
        const result = await response.json() as { members?: Viewer[] };
        if (response.ok && result.members && !cancelled) {
          setMembers(result.members.map((member) =>
            member.id === viewer.id ? { ...member, avatarUrl: viewer.avatarUrl } : member,
          ));
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
              items={selectedMember.id === viewer.id ? artifacts : []}
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
              items={artifacts}
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
  initialArtifacts,
  viewer,
}: {
  initialArtifacts: MemoryArtifact[];
  viewer: Viewer;
}) {
  const [step, setStep] = useState<ExperienceStep>("cover");
  const [dialog, setDialog] = useState<LobbyMode>();
  const [session, setSession] = useState<ScrapbookSession>();
  const openingTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(openingTimer.current), []);

  const openBook = () => {
    setStep("opening");
    const animationLength = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 620;
    openingTimer.current = window.setTimeout(() => setStep("lobby"), animationLength);
  };

  const enterScrapbook = (nextSession: ScrapbookSession) => {
    setDialog(undefined);
    setSession(nextSession);
    setStep("scrapbook");
  };

  return (
    <main className="book-home">
      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />

      {step === "cover" || step === "opening" ? (
        <ClosedBookCover opening={step === "opening"} onStart={openBook} />
      ) : null}

      {step !== "scrapbook" ? (
        <section
          aria-hidden={step === "cover"}
          className={
            step === "cover"
              ? "book-hero preloaded-book-hero"
              : step === "opening"
                ? "book-hero opening-book-hero"
                : "book-hero"
          }
          aria-label="Create or join a scrapbook"
        >
          <div className="book-stage setup-book-stage">
            <BookScene currentSpread={3} onNext={() => undefined} onPrevious={() => undefined} />
            <div className="final-page-overlay">
              <FinalPageActions
                onCreate={() => setDialog("create")}
                onJoin={() => setDialog("join")}
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === "scrapbook" && session ? (
        <Scrapbook
          initialArtifacts={initialArtifacts}
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
