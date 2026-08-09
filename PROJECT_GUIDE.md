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
Clerk owns identity/session data. UploadThing owns file bytes. Neon stores
application records and UploadThing metadata.

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
| `GEMINI_API_KEY` | Server only | Analyzes memories, generates 3D model specifications, and creates character images |
| `COLYSEUS_PUBLIC_URL` | Returned only to authenticated arena clients | Public HTTP/HTTPS address of the Colyseus service |
| `COLYSEUS_PORT` | Server only | Local port used by the Colyseus process |
| `ARENA_ALLOWED_ORIGINS` | Server only | Comma-separated web origins accepted by Colyseus matchmaking |
| `ARENA_TICKET_SECRET` | Server only | Dedicated HMAC secret shared by Next and Colyseus; falls back to `CLERK_SECRET_KEY` locally |
| `GEMINI_EXTRACTION_MODEL` | Server only, optional | Overrides the Gemini model used for structured memory-model generation |
| `GEMINI_IMAGE_MODEL` | Server only, optional | Overrides image generation for character avatars only |

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

The memory-keepsake path uses structured text output rather than Gemini image
generation. Character avatar creation still uses an image-generation model,
which may require billing on the Google Cloud project behind `GEMINI_API_KEY`.

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
processing status, generated character-avatar file metadata, failure detail, and
processing timestamps. Unlike `uploads`, `clerk_user_id` is unique here: each
user has exactly one current character avatar, and uploading a new photo
upserts (replaces) that row and deletes the previous UploadThing files rather
than appending a new record.

`scrapbook_rooms` stores a server-generated invite code and the Clerk ID of its
creator. `scrapbook_members` records which authenticated users joined each room,
along with their display metadata. `arena_matches` is retained as a legacy table
for existing data, but the live arena no longer reads or writes it. Colyseus room
state is intentionally ephemeral and is disposed when its players leave.

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

The browser renders a typed `UploadDropzone` from `src/lib/uploadthing.ts` and
passes the active room code and selected recipient for scrapbook uploads.
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

The client waits for the callback's server data, renders completed artifacts in
the upload panel immediately, and adds them to the selected recipient's memory
chest. While a scrapbook is open, its authenticated room endpoint refreshes the
member roster, avatars, and room-scoped inventories every three seconds, so each
member sees uploads made by the others.

Current limitation: a source upload can succeed while Gemini or the generated
model upload fails. That source row is retained with `processing_status =
failed` and an internal error string so the failure is visible and retryable.
Production code may add a retry/reconciliation job. A future deletion feature
must delete both UploadThing objects and the owner-scoped Neon row.

## Character avatar pipeline

The `characterPhoto` UploadThing route lets the signed-in user upload one photo
of themselves (image only, up to 4 MB, single file). Unlike `workspaceFile`,
its `onUploadComplete` callback skips the key-object extraction step and calls
`createCharacterAvatar()` in `src/lib/gemini.ts` directly: the photo is sent to
the same Gemini image model as an image-to-image edit, styled with a prompt
that reuses the project's black-marker folk-art look but targets a full-body
character likeness (hairstyle, build, notable accessories) instead of a single
object. The result is uploaded through UploadThing and upserted into
`user_avatars` keyed by `clerk_user_id`; any previous source and generated
files for that user are deleted so re-uploading a photo replaces the avatar
rather than accumulating orphaned blobs. Failures leave the prior successful
avatar (if any) untouched and record `processing_status = failed` with an
internal error string, mirroring the `uploads` failure pattern.

The root Server Component (`src/app/page.tsx`) reads the current user's
`user_avatars` row and passes `avatarUrl` into the scrapbook `Viewer`. The
scrapbook UI (`MemberCharacter`, `SelectedMemberProfile`) renders that image in
place of the placeholder stick figure once it exists. The arena also displays
the current player's generated character alongside the authenticated match UI.

## Scrapbook experience

The root route authenticates with Clerk and passes only a serializable viewer
ID, display name, initials, and generated character-avatar URL to the
interactive book. Creating a scrapbook now
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

Both players then inhabit the same map. Clients send only movement intent and
aim; the Colyseus simulation owns positions, wall collision, projectiles, hit
detection, countdowns, one-hit rounds, scores, respawns, reconnects, and
forfeits. Schema patches replace the former HTTP polling and red-dot proxy hits.
Each projectile uses its owner's equipped memory, and the remote player is a
live avatar-bearing character at their synchronized transform.
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
For the arena, open the same scrapbook from two Clerk accounts, enter the arena
from both, verify each sees the other's movement, and confirm only a projectile
that intersects the remote character scores a round.

## Deployment

Deploy the web app to a Node-compatible Next.js host and deploy `game-server/`
as a separate long-lived Node/WebSocket service (or Colyseus Cloud). Run
`npm run start:arena` for that process, set `COLYSEUS_PUBLIC_URL` on the web app,
and give both processes the same `ARENA_TICKET_SECRET`. Configure
`ARENA_ALLOWED_ORIGINS` with the deployed web origin. Run migrations against the
intended Neon branch and add the deployment domain to Clerk and UploadThing
where required. Do not use a static export; authentication, Server Actions,
database access, uploads, and the arena ticket route require a server runtime.
