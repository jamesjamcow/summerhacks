"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

type LobbyMode = "create" | "join";
type ExperienceStep = "cover" | "opening" | "lobby" | "scrapbook";

type Viewer = {
  id: string;
  name: string;
  initials: string;
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
  onComplete: (session: ScrapbookSession) => void;
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
    onComplete({ code: normalizedCode, name: `Scrapbook ${normalizedCode}` });
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

        <p className="dialog-kicker">{mode === "create" ? "New scrapbook" : "Have an invite?"}</p>
        <h2 id="lobby-dialog-title">
          {createdCode
            ? "Your page is ready."
            : mode === "create"
              ? "What should we call it?"
              : "Join someone’s page."}
        </h2>
        <p className="dialog-copy">
          {createdCode
            ? "Share this code with the people you want in the scrapbook."
            : mode === "create"
              ? "Give this scrapbook a name. You can fill it together from there."
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
              onClick={() => onComplete({ code: createdCode, name: name || "Untitled page" })}
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
            <button className="dialog-primary" type="submit">
              {mode === "create" ? "Create this page" : "Join the page"}
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
          <article className="closed-book-open-page">
            <p>Begin together</p>
            <h2>Your next page starts here.</h2>
            <span>Open a scrapbook of your own, or arrive with a code.</span>
            <div className="closed-book-open-actions">
              <i>+&nbsp;&nbsp; Create a new page</i>
              <i>→&nbsp;&nbsp; Join a page</i>
            </div>
          </article>
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
          <article className="closed-book-front-inside" aria-hidden="true">
            <p>Summer / Twenty-six</p>
            <h2>For the things you keep meaning to make.</h2>
            <span>A shared page is a tiny lobby for an idea. Open one, invite your people, and see where the night takes you.</span>
            <i>No pitch deck required.</i>
          </article>
          <span className="closed-book-cover-edge" aria-hidden="true" />
        </div>
        <div className="closed-book-spine" aria-hidden="true" />
      </div>
      <p className="cover-hint">Open when you’re ready</p>
    </section>
  );
}

function MemberCharacter({ viewer, onOpenInventory }: { viewer: Viewer; onOpenInventory: () => void }) {
  return (
    <article className="scrapbook-member">
      <p className="member-name">{viewer.name}</p>
      <div className="member-scene">
        <div className="stick-person" aria-label={`${viewer.name} character placeholder`} role="img">
          <span className="stick-head">{viewer.initials}</span>
          <span className="stick-body" />
          <span className="stick-arms" />
          <span className="stick-leg stick-leg-left" />
          <span className="stick-leg stick-leg-right" />
        </div>
        <button
          className="member-chest"
          onClick={onOpenInventory}
          aria-label={`Open ${viewer.name}'s inventory`}
          title={`Open ${viewer.name}'s inventory`}
          type="button"
        >
          <span className="chest-lid" />
          <span className="chest-lock" />
        </button>
      </div>
      <span className="member-note">You · memory keeper</span>
    </article>
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

function InventoryOverlay({
  items,
  member,
  onClose,
}: {
  items: MemoryItem[];
  member: Viewer;
  onClose: () => void;
}) {
  return (
    <div className="scrapbook-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="inventory-title"
        aria-modal="true"
        className="scrapbook-modal inventory-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="scrapbook-modal-close" onClick={onClose} aria-label="Close inventory" type="button">×</button>
        <div className="inventory-owner">
          <div className="inventory-avatar" aria-hidden="true">{member.initials}</div>
          <div>
            <p>Memory chest</p>
            <h2 id="inventory-title">{member.name}’s inventory</h2>
          </div>
        </div>

        {items.length ? (
          <div className="inventory-grid">
            {items.map((item) => <InventoryItemCard item={item} key={item.id} />)}
          </div>
        ) : (
          <div className="inventory-empty">
            <div className="empty-chest" aria-hidden="true">
              <span />
            </div>
            <h3>No memory items yet.</h3>
            <p>Artifacts made from shared memories will collect here.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function UploadMemoryOverlay({
  onArtifactsGenerated,
  onClose,
}: {
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
          <p>Add to the story</p>
          <h2 id="upload-memory-title">Upload a memory</h2>
          <span>Every file becomes one hand-drawn object for your memory chest.</span>
        </header>

        <div className="memory-flow-steps" aria-label="Memory upload steps">
          <span className="active"><strong>1</strong> Add memories</span>
          <span><strong>2</strong> Find key objects</span>
          <span><strong>3</strong> Draw keepsakes</span>
        </div>

        <div className="scrapbook-uploader modal-uploader">
          <UploadPanel onArtifactsGenerated={onArtifactsGenerated} />
        </div>

        <section className="memory-recipient" aria-labelledby="keepsake-rule-title">
          <span className="memory-step">The keepsake rule</span>
          <h3 id="keepsake-rule-title">One memory, one object.</h3>
          <p>
            Five files make five keepsakes. Finished drawings appear here and
            collect in your chest automatically.
          </p>
        </section>
      </section>
    </div>
  );
}

function ArenaOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="scrapbook-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="arena-title"
        aria-modal="true"
        className="scrapbook-modal arena-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="scrapbook-modal-close" onClick={onClose} aria-label="Close arena preview" type="button">×</button>
        <div className="arena-emblem" aria-hidden="true">⚔</div>
        <p className="arena-kicker">The next chapter</p>
        <h2 id="arena-title">The Arena is taking shape.</h2>
        <p>Your scrapbook characters and their collected memory artifacts will meet here in a future multiplayer battle experience.</p>
        <button onClick={onClose} type="button">Back to the scrapbook</button>
      </section>
    </div>
  );
}

function Scrapbook({
  initialArtifacts,
  session,
  viewer,
}: {
  initialArtifacts: MemoryArtifact[];
  session: ScrapbookSession;
  viewer: Viewer;
}) {
  const [inventoryMember, setInventoryMember] = useState<Viewer>();
  const [overlay, setOverlay] = useState<ScrapbookOverlay>();
  const [artifacts, setArtifacts] = useState(initialArtifacts);

  const addArtifacts = (newArtifacts: MemoryArtifact[]) => {
    setArtifacts((current) => {
      const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
      newArtifacts.forEach((artifact) => byId.set(artifact.id, artifact));
      return Array.from(byId.values());
    });
  };

  useEffect(() => {
    if (!inventoryMember && !overlay) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInventoryMember(undefined);
        setOverlay(undefined);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inventoryMember, overlay]);

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
            <strong>1</strong>
          </div>
          <div className="scrapbook-members">
            <MemberCharacter viewer={viewer} onOpenInventory={() => setInventoryMember(viewer)} />
          </div>
        </div>

        <div className="scrapbook-page scrapbook-page-right">
          <div className="scrapbook-actions">
            <button className="memory-action" onClick={() => setOverlay("upload")} type="button">
              <span aria-hidden="true">+</span> Upload Memory
            </button>
            <button className="arena-action" onClick={() => setOverlay("arena")} type="button">
              <span aria-hidden="true">⚔</span> Enter Arena
            </button>
          </div>

          <header className="memory-heading scrapbook-world-heading">
            <p>A shared world</p>
            <h2>Made by remembering.</h2>
            <span>Every person carries a chest. Every memory you add gives this little world more history.</span>
          </header>

          <div className="scrapbook-stats" aria-label="Scrapbook details">
            <div>
              <strong>1</strong>
              <span>Member</span>
            </div>
            <div>
              <strong>{artifacts.length}</strong>
              <span>Memory items</span>
            </div>
          </div>

          <section className="memory-wall" aria-labelledby="memory-wall-title">
            <span className="memory-wall-tape" aria-hidden="true" />
            <p>Start the collection</p>
            <h3 id="memory-wall-title">The first keepsake starts with you.</h3>
            <span>Add a memory to someone in this book. Their future artifacts will gather inside their chest.</span>
            <button onClick={() => setOverlay("upload")} type="button">Add the first memory →</button>
          </section>
        </div>
      </div>

      {inventoryMember
        ? createPortal(
            <InventoryOverlay
              items={artifacts}
              member={inventoryMember}
              onClose={() => setInventoryMember(undefined)}
            />,
            document.body,
          )
        : null}
      {overlay === "upload"
        ? createPortal(
            <UploadMemoryOverlay
              onArtifactsGenerated={addArtifacts}
              onClose={() => setOverlay(undefined)}
            />,
            document.body,
          )
        : null}
      {overlay === "arena"
        ? createPortal(<ArenaOverlay onClose={() => setOverlay(undefined)} />, document.body)
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
    const animationLength = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 1180;
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
