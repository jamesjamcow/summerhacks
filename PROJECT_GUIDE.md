# Project guide for humans and AI agents

This file is the source of truth for how this starter works. Read it before
changing authentication, database access, uploads, routing, or environment
variables.

## What this project is

Summerhacks is a Next.js 16 App Router application written in TypeScript and
styled with Tailwind CSS 4. Its root route is an authenticated scrapbook-book
experience and it also has a private diagnostic dashboard. The dashboard is
deliberately small but exercises the full stack:

1. Clerk authenticates the visitor and provides a stable `userId`.
2. A Server Action writes the user's notes to Neon Postgres.
3. UploadThing stores uploaded memory files.
4. UploadThing's completion callback sends each file to Gemini, receives one
   validated low-poly model specification for its key object, uploads that JSON
   artifact to UploadThing, and writes the linked metadata to Neon.
5. Dashboard queries include the Clerk user ID, so users only read their own
   notes and upload records.

The application does not store passwords, sessions, or file bytes in Neon.
Clerk owns identity/session data. UploadThing owns both the original memory file
and generated artifact bytes. Neon stores application records and UploadThing
metadata, including the original file URL used by image hit reveals.

## Technology and responsibilities

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Web app | Next.js 16 App Router + React 19 | Pages, Server Components, Server Actions, and route handlers |
| Styling | Tailwind CSS 4 | Utility-first UI styles |
| Authentication | Clerk | Sign-up, sign-in, sessions, and the canonical user ID |
| Database | Neon Postgres | Durable application data |
| Data access | Drizzle ORM + Neon HTTP driver | Typed schema, queries, and SQL migrations |
| File storage | UploadThing | Upload authorization, transfer, storage, and CDN URLs |
| Memory processing | Gemini API + Three.js | One constrained model specification per memory, rendered as a 3D object in the browser |
| Realtime arena | Colyseus | Authenticated two-player rooms, authoritative movement, projectiles, hits, rounds, and scores |

Exact installed versions live in `package.json` and `package-lock.json`. Do not
duplicate version numbers elsewhere unless a compatibility note requires it.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Signed-in users | Closed cover, create/join setup, and the scrapbook experience |
| `/sign-in/[[...sign-in]]` | Public | Clerk's hosted sign-in component |
| `/sign-up/[[...sign-up]]` | Public | Clerk's hosted sign-up component |
| `/dashboard` | Signed-in users | Notes, uploader, and each user's recent records |
| `/api/scrapbooks` | Signed-in users | Create a room or join one by its invite code |
| `/api/scrapbooks/[code]` | Room members | Refresh the authenticated room roster, avatars, and shared inventories |
| `/api/arena/session` | Room members with an inventory | Issue a short-lived signed ticket and the Colyseus endpoint |
| `/api/arena/results` | Authenticated match participants | Verify a Colyseus result receipt and create the room's next scrapbook page |
| `/api/arena/portrait` | Authenticated losing match participant | Verify the signed result, assemble the saved page's trip photos with Gemini, and return the generated portrait |
| `/api/uploadthing` | Public metadata, authenticated uploads | UploadThing GET/POST route handler |

`src/proxy.ts` initializes Clerk's request integration. Authorization lives next
to each protected resource: the dashboard page, every Server Action, and the
UploadThing middleware. This avoids deprecated path-matcher authorization and
keeps route refactors from silently removing protection.

## Important files

```text
src/
  app/
    api/uploadthing/core.ts       Upload rules, auth, and completion callback
    api/uploadthing/route.ts      UploadThing route handler
    dashboard/page.tsx            Private Server Component and note action
    sign-in/[[...sign-in]]/       Clerk sign-in page
    sign-up/[[...sign-up]]/       Clerk sign-up page
    layout.tsx                    Clerk provider and global application shell
    page.tsx                      Protected scrapbook entry and Clerk viewer data
  components/upload-panel.tsx    Small client boundary for upload state
  components/book/               Closed cover, setup spread, and scrapbook UI
  components/arena/              Colyseus client hook and shared-map Three.js renderer
  db/index.ts                     Server-only lazy Neon/Drizzle connection
  db/schema.ts                    Drizzle table definitions
  lib/uploadthing.ts              Typed UploadDropzone factory
  lib/arena-ticket.ts             Signed short-lived Colyseus room tickets
  proxy.ts                        Clerk request integration
drizzle/                          Generated, committed SQL migrations
drizzle.config.ts                 Drizzle Kit configuration
game-server/                      Independent authoritative Colyseus service
.env.example                      Required variable names, never real secrets
```

Next.js creates and maintains the top-level `AGENTS.md` compatibility notice.
Follow it and consult the installed documentation under
`node_modules/next/dist/docs/` before using framework APIs that may have changed.

## Environment variables

Copy `.env.example` to `.env.local`. `.env.local` is gitignored and must never
be committed.

| Variable | Visibility | Used for |
| --- | --- | --- |
| `DATABASE_URL` | Server only | Pooled Neon Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Browser-safe | Loads Clerk in the browser |
| `CLERK_SECRET_KEY` | Server only | Verifies Clerk sessions server-side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Browser-safe | Local sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Browser-safe | Local sign-up route |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Browser-safe | Post-sign-in destination |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Browser-safe | Post-sign-up destination |
| `UPLOADTHING_TOKEN` | Server only | Authorizes UploadThing's server SDK |
| `GEMINI_API_KEY` | Server only | Analyzes memories, generates validated 3D keepsake and character specifications, and creates post-match images |
| `COLYSEUS_PUBLIC_URL` | Returned only to authenticated arena clients | Public HTTP/HTTPS address of the Colyseus service |
| `COLYSEUS_PORT` | Server only | Local port used by the Colyseus process |
| `ARENA_ALLOWED_ORIGINS` | Server only | Comma-separated web origins accepted by Colyseus matchmaking |
| `ARENA_TICKET_SECRET` | Server only | Dedicated HMAC secret shared by Next and Colyseus; falls back to `CLERK_SECRET_KEY` locally |
| `GEMINI_EXTRACTION_MODEL` | Server only, optional | Overrides the Gemini model used for structured memory and character-model generation |
| `GEMINI_MAP_MODEL` | Server only, optional | Overrides the Gemini model used by Colyseus to theme a match from both players' photos |
| `GEMINI_IMAGE_MODEL` | Server only, optional | Overrides image generation for post-match trip portraits |

Only variables beginning with `NEXT_PUBLIC_` may be referenced by client code.
Do not rename a secret with that prefix.

The checked-in example is configured for the private SummerHacks Tailscale
demo. On `jamess-macbook-pro`, run `tailscale serve --bg 3000` for the web app
and `tailscale serve --bg --https=8443 2567` for Colyseus. Tailnet devices open
`https://jamess-macbook-pro.tail051804.ts.net`; local host testing can continue
to use `http://localhost:3000`. That Tailscale hostname is also listed in
`next.config.ts` under `allowedDevOrigins` so Next.js development assets and
hot-reload connections are not rejected when served through the HTTPS proxy.
The Colyseus CORS response permits credentialed requests only from the explicit
`ARENA_ALLOWED_ORIGINS` list because its browser SDK sends matchmaking requests
with credential mode enabled even though arena authentication uses a bearer
ticket.

The memory-keepsake and character-avatar paths use structured text output rather
than Gemini image generation. The optional image model is used only for the
post-match trip portrait and may require billing on the Google Cloud project
behind `GEMINI_API_KEY`.

## First-time setup

1. Use Node.js 20.9 or newer and run `npm install`.
2. Create a Neon project and copy its pooled connection string.
3. Create a Clerk application and copy its publishable and secret keys.
4. In Clerk, allow the sign-in methods desired for this app.
5. Create an UploadThing app and copy its token.
6. Create a Gemini API key in Google AI Studio.
7. Run `cp .env.example .env.local` and replace every placeholder.
8. Run `npm run db:migrate` to apply the committed migrations to Neon.
9. Run `npm run dev`; it starts Next and Colyseus together. Open `http://localhost:3000`.
10. Sign up, add a note, and upload a small file to exercise all services.

No real cloud resources or credentials are created by this repository. Clerk,
Neon, UploadThing, and Gemini must be configured before the integrated flow can
run end to end.

## Database model

`notes` contains `id`, `clerk_user_id`, `content`, and `created_at`.

`uploads` contains the authenticated uploader's source-file metadata plus the
optional scrapbook room and recipient member, processing status, the extracted
key object, generated-file metadata, failure detail, and processing timestamps.
A single row is the durable one-to-one link between one source memory and its one
generated artifact. Dashboard uploads without a room remain personal to their
uploader. The shared-inventory migration safely assigns existing uploads made by
members of a single two-person room to the other member; ambiguous legacy rows
remain personal rather than leaking into unrelated rooms.

`user_avatars` contains the authenticated owner's uploaded selfie metadata plus
processing status, generated 3D character-model file metadata, failure detail, and
processing timestamps. Unlike `uploads`, `clerk_user_id` is unique here: each
user has exactly one current character avatar, and uploading a new photo
upserts (replaces) that row and deletes the previous UploadThing files rather
than appending a new record.

`scrapbook_rooms` stores a server-generated invite code and the Clerk ID of its
creator. `scrapbook_members` records which authenticated users joined each room,
along with their display metadata. `scrapbook_match_pages` stores one immutable,
numbered result page per authoritative arena match: the winner, final players and
scores, result reason, completion time, and a snapshot of the room's completed
memory uploads. Unique match and room/page keys make submission idempotent and
keep the page sequence unambiguous. `arena_matches` is retained as a legacy table
for existing data, but the live arena no longer reads or writes it. Colyseus room
state is otherwise ephemeral and is disposed when its players leave.

Ownership-sensitive tables index Clerk IDs. Those values deliberately reference Clerk by
identifier rather than a Postgres foreign key because there is no local users
table in this starter.

The runtime connection is lazy. Importing `src/db/index.ts` does not connect or
throw during a public-page build. `getDb()` validates `DATABASE_URL` when a
database-backed request actually runs. That module imports `server-only` to
prevent accidental inclusion in a client bundle.

### Database commands

```bash
npm run db:generate  # create SQL after changing src/db/schema.ts
npm run db:migrate   # apply committed migrations to DATABASE_URL
npm run db:push      # directly sync a development database (use deliberately)
npm run db:studio    # inspect the configured database
```

Normal schema workflow: edit `src/db/schema.ts`, run `npm run db:generate`,
review the generated SQL under `drizzle/`, and then run `npm run db:migrate`.
Prefer committed migrations over `db:push` for shared or production databases.

## Authentication and authorization

Clerk is the only identity authority. Never accept a user ID from form data,
query parameters, upload input, or client props as proof of ownership.

For every server mutation or private query:

1. Call `await auth()` on the server.
2. Reject or redirect if `userId` is missing.
3. Derive `clerkUserId` from that authenticated result.
4. For personal resources, include `clerkUserId` in every ownership-sensitive
   `SELECT`, `UPDATE`, or `DELETE` condition. For shared room resources, first
   verify the authenticated user's membership and then scope the query by the
   server-derived room ID.

The note Server Action follows this sequence, validates length on the server,
writes the authenticated `userId`, and revalidates `/dashboard`.

The UploadThing middleware requires a Clerk `userId` before it issues an upload.
For scrapbook uploads it also verifies that both the uploader and requested
recipient belong to the room, then returns server-derived room and recipient IDs
to the completion callback. UploadThing's public GET route exposes permitted file
types and limits, not private user records.

## Upload flow

The browser uses the typed `uploadFiles` helper from `src/lib/uploadthing.ts`.
On another member's profile, the large upload ticket is the file control: it
accepts drag-and-drop or opens the native file chooser, then begins processing
the selected files without opening a separate scrapbook page or modal. The
dashboard keeps the two-step choose-then-upload panel. Both variants pass the
active room code and selected recipient for scrapbook uploads.
The `workspaceFile` route accepts batches of up to five total files across these
supported categories:

- image up to 8 MB
- audio/voice note up to 8 MB
- PDF up to 8 MB
- text file up to 1 MB

UploadThing calls `onUploadComplete` separately for each file. The callback
persists the source metadata, reads the source bytes, and asks Gemini for one
lowercase concrete key object plus a low-poly model made from an allowlist of
primitive shapes. The server validates and bounds every name, shape, color,
position, rotation, scale, and part count before serializing the specification
as JSON and uploading it through UploadThing. The browser constructs the actual
Three.js object from that data; AI-authored JavaScript is never executed. Five
source files therefore produce five independent 3D artifacts.

For a multi-file selection, the client submits each source as an independent
UploadThing request through a three-worker pool. Up to three complete pipelines
(source transfer, callback, Gemini generation, artifact upload, and database
update) therefore run concurrently, while failures remain isolated to their
individual files. The client renders each completed artifact as soon as its job
returns, adds it to the selected recipient's memory chest, and shows aggregate
progress for the batch. While a scrapbook is open, its authenticated room
endpoint refreshes the member roster, avatars, and room-scoped inventories every
three seconds, so each member sees uploads made by the others.

Current limitation: a source upload can succeed while Gemini or the generated
model upload fails. That source row is retained with `processing_status =
failed` and an internal error string so the failure is visible and retryable.
Production code may add a retry/reconciliation job. A future deletion feature
must delete both UploadThing objects and the owner-scoped Neon row.

## Character avatar pipeline

The `characterPhoto` UploadThing route lets the signed-in user upload one photo
of themselves (image only, up to 4 MB, single file). Its `onUploadComplete`
callback calls `createCharacterAvatar()` in `src/lib/gemini.ts`. Gemini receives
the selfie as multimodal input and returns a schema-constrained full-body avatar
made from 8 to 16 allowlisted primitive parts. The server validates every shape,
color, transform, scale, part count, and model name, serializes the avatar as
JSON, uploads that artifact through UploadThing, and upserts it into
`user_avatars` keyed by `clerk_user_id`. AI-authored code is never executed.
Any previous source and generated files for that user are deleted so re-uploading
a photo replaces the avatar rather than accumulating orphaned blobs. Failures
leave the prior successful avatar (if any) untouched and record
`processing_status = failed` with an internal error string.

The root Server Component and protected scrapbook roster endpoint inspect the
stored generated MIME type and expose a new artifact as `avatarModelUrl`.
`CharacterAvatarPreview` renders the same model on every member card and in the
local arena HUD. The signed arena ticket carries that URL through Colyseus, and
the opposing browser uses the model as the actual in-world player mesh. Existing
image avatars remain supported as a display-only legacy fallback until their
owners choose a new photo; legacy images never replace the in-world player mesh.

## Scrapbook experience

The root route authenticates with Clerk and passes only a serializable viewer
ID, display name, greeting name, initials, and generated character-avatar model URL
to the interactive book. Creating a scrapbook now
persists a room and owner membership. Joining by code upserts a membership for
the authenticated Clerk user. The client polls the protected room endpoint for
the durable member roster, so separate accounts and devices see one another in
the same book.

The arena preloads the signed-in player's completed model specifications (and
legacy artifact images), then requests a one-minute signed ticket from the
authenticated session endpoint. That endpoint derives room membership, display
name, avatar, and the room-scoped inventory from Neon; no client-supplied user ID
or loadout is trusted. The browser presents the ticket to Colyseus, which matches
at most two authenticated members by scrapbook code.

When the second player arrives, Colyseus enters a `generating-map` phase and
collects the image-backed memories from both signed inventories. The arena
service downloads every included source photo and sends them together to Gemini.
Small combined inputs are sent inline; larger sets use Gemini's temporary Files
API and are deleted after analysis. Gemini returns only a schema-constrained
theme, outdoor classification, palette, and photo order. It never returns or
executes Three.js code. If every photo is outdoors, server validation forces the
`grass-field` biome and a green ground even when Gemini suggests another outdoor
setting. Each photo's already-validated keepsake becomes a landmark on a fixed
safe perimeter plinth, ensuring every photo contributes while spawn lanes and
cover remain fair. Identical photo sets are cached in the arena process for fast
rematches; the cache is intentionally ephemeral and resets with that process.
Gemini, image-download, or validation failures use the existing balanced garden
map rather than blocking the match.

Both players then inhabit the same generated map. Clients send only movement intent,
jump intent, and aim; the Colyseus simulation owns positions, vertical velocity,
gravity, landings, wall collision, projectiles, hit detection, countdowns,
one-hit rounds, scores, respawns, reconnects, and forfeits. The larger garden
arena's shared block geometry, map contract, safe landmark slots, and bounds live
in `src/lib/arena-world.ts`. The generated map is replicated through Colyseus, so
the server collision model and Three.js renderer consume the same layout. Schema patches
replace the former HTTP polling and red-dot proxy hits.
Each accepted throw uses the owner's currently equipped memory and immediately
advances their server-owned inventory cursor. Every item is used once in upload
inventory order before the cursor wraps to the first item, continuously across
rounds. Projectiles retain the item they were created with even after the player
advances to the next one. Each browser loads the model or image attached to that
replicated projectile before drawing it instead of substituting the generic
heart, so both players see the same thrown object. The remote player is a live
avatar-bearing character at their synchronized transform. When an image-backed
3D keepsake hits a player, that player sees the attacker's original UploadThing
image for the projectile that actually landed during the round-end memory
reveal.

At match completion, Colyseus signs a receipt containing its server-owned match
ID, room identity, winner, final scores, and result reason. Either authenticated
participant may submit it to `/api/arena/results`; the route verifies the HMAC,
participant identity, and room membership before writing. It snapshots the
room's completed uploads and assigns the next page number. Both clients may
submit safely because the match ID is unique. The scrapbook poll includes these
pages, and the result screen links to the new page showing the winner, score, and
uploaded memories.

After that page is saved, the losing browser may submit the same signed receipt
to `/api/arena/portrait`. The route independently verifies that the current Clerk
user is the receipt's loser and a member of the room, then reads image memories
from the immutable match-page snapshot. Up to fourteen source photos are sent to
the configured Gemini image model, using temporary Gemini Files API objects when
the combined inline payload would be too large. Gemini is instructed to interpret
the people, activities, settings, objects, and mood of every supplied photo and
weave them into one 16:9, 2K group portrait. The generated image is uploaded to
UploadThing; temporary Gemini files are deleted even when generation fails.

The returned portrait metadata is stored under a Clerk-user-scoped key in the
loser's browser `localStorage`. It therefore survives refreshes on the same
origin without a browser extension, while remaining deliberately device- and
browser-local. Clearing site data, using another browser/origin, or replacing the
portrait after a later loss changes what is shown. A fixed scrapbook-style
thumbnail remains visible throughout the app; opening it provides a large
drag-to-pan and scroll/button-to-zoom view plus the source photo labels. The
winner cannot call the portrait route with the loser-only receipt flow.

## Server and client boundaries

Pages and layouts remain Server Components by default. `upload-panel.tsx` is a
small Client Component because it needs React state and `router.refresh()`.
Database queries, secrets, and UploadThing callbacks stay server-side. The
client imports the upload router only with `import type`, which is erased from
the browser bundle. Colyseus is a separate long-lived Node process because
realtime WebSocket rooms do not belong in a Next route handler.

When adding features, keep interactive client boundaries narrow and pass only
serializable, non-secret props into them.

## Adding a new private feature

1. Authenticate inside the page, Server Action, or route handler that accesses
   the protected resource. Do not rely on path matching for authorization.
2. Validate all client-controlled input on the server.
3. Scope all data reads and mutations by the authenticated Clerk user ID.
4. Update the Drizzle schema and commit a reviewed migration if data changes.
5. Add only the smallest necessary Client Component boundary.
6. Run the verification commands below.
7. Update this guide if the architecture, routes, data ownership, or setup
   changes.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

An end-to-end smoke test also requires valid provider credentials and a
migrated Neon database: sign in, create a note, upload a permitted file, refresh
the dashboard, and verify that another Clerk account cannot see those records.
For the avatar flow, choose a selfie, confirm Gemini returns one JSON model, and
verify the same 3D character replaces the flat image on the member card and is
the remote player's in-world mesh in a two-client match. For the arena, open the
same scrapbook from two Clerk accounts, enter the arena
from both, verify the `generating-map` phase appears, and confirm both clients
receive the same theme, biome, block layout, and photo landmarks. Test one room
whose match inventories contain only outdoor photos and confirm its ground is
green. Then verify each player sees the other's movement and confirm only a projectile
that intersects the remote character scores a round. Finish the match, confirm
both clients resolve to the same numbered result page, then close the arena and
verify that page shows the authoritative winner, final score, and uploaded
memory snapshot. On the losing client, verify Gemini assembles the page's photos,
the large portrait supports drag and zoom, its minimized sticker survives a full
refresh, and the winning client is forbidden from generating the loser portrait.

## Deployment

Deploy the web app to a Node-compatible Next.js host and deploy `game-server/`
as a separate long-lived Node/WebSocket service (or Colyseus Cloud). Run
`npm run start:arena` for that process, set `COLYSEUS_PUBLIC_URL` on the web app,
and give both processes the same `ARENA_TICKET_SECRET`. Configure
`ARENA_ALLOWED_ORIGINS` with the deployed web origin. Run migrations against the
intended Neon branch and add the deployment domain to Clerk and UploadThing
where required. Do not use a static export; authentication, Server Actions,
database access, uploads, and the arena ticket route require a server runtime.
