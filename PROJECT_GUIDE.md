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
4. UploadThing's completion callback sends each file to Gemini, extracts one
   key object, asks Gemini for one black folk-art illustration, uploads that
   generated image to UploadThing, and writes the linked metadata to Neon.
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
| Memory processing | Gemini API | One key-object extraction and one image generation per uploaded memory |

Exact installed versions live in `package.json` and `package-lock.json`. Do not
duplicate version numbers elsewhere unless a compatibility note requires it.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Signed-in users | Closed cover, create/join setup, and the scrapbook experience |
| `/sign-in/[[...sign-in]]` | Public | Clerk's hosted sign-in component |
| `/sign-up/[[...sign-up]]` | Public | Clerk's hosted sign-up component |
| `/dashboard` | Signed-in users | Notes, uploader, and each user's recent records |
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
  db/index.ts                     Server-only lazy Neon/Drizzle connection
  db/schema.ts                    Drizzle table definitions
  lib/uploadthing.ts              Typed UploadDropzone factory
  proxy.ts                        Clerk request integration
drizzle/                          Generated, committed SQL migrations
drizzle.config.ts                 Drizzle Kit configuration
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
| `GEMINI_API_KEY` | Server only | Analyzes each memory and generates its keepsake image |
| `GEMINI_EXTRACTION_MODEL` | Server only, optional | Overrides the default Gemini key-object extraction model |
| `GEMINI_IMAGE_MODEL` | Server only, optional | Overrides the default Gemini image-generation model |

Only variables beginning with `NEXT_PUBLIC_` may be referenced by client code.
Do not rename a secret with that prefix.

Gemini image-generation models do not have free-tier Developer API quota. The
Google Cloud project behind `GEMINI_API_KEY` must have billing enabled, even if
the same model can be tried interactively in Google AI Studio.

## First-time setup

1. Use Node.js 20.9 or newer and run `npm install`.
2. Create a Neon project and copy its pooled connection string.
3. Create a Clerk application and copy its publishable and secret keys.
4. In Clerk, allow the sign-in methods desired for this app.
5. Create an UploadThing app and copy its token.
6. Create a Gemini API key in Google AI Studio.
7. Run `cp .env.example .env.local` and replace every placeholder.
8. Run `npm run db:migrate` to apply the committed migrations to Neon.
9. Run `npm run dev` and open `http://localhost:3000`.
10. Sign up, add a note, and upload a small file to exercise all services.

No real cloud resources or credentials are created by this repository. Clerk,
Neon, UploadThing, and Gemini must be configured before the integrated flow can
run end to end.

## Database model

`notes` contains `id`, `clerk_user_id`, `content`, and `created_at`.

`uploads` contains the authenticated owner's source-file metadata plus processing
status, the extracted key object, generated-file metadata, failure detail, and
processing timestamps. A single row is the durable one-to-one link between one
source memory and its one generated artifact.

Both tables index `clerk_user_id`. The value deliberately references Clerk by
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
4. Include `clerkUserId` in every ownership-sensitive `SELECT`, `UPDATE`, or
   `DELETE` condition.

The note Server Action follows this sequence, validates length on the server,
writes the authenticated `userId`, and revalidates `/dashboard`.

The UploadThing middleware requires a Clerk `userId` before it issues an upload.
The completion callback uses only the ID returned by that middleware when it
creates the Neon metadata row. UploadThing's public GET route exposes permitted
file types and limits, not private user records.

## Upload flow

The browser renders a typed `UploadDropzone` from `src/lib/uploadthing.ts`.
The `workspaceFile` route accepts batches of up to five total files across these
supported categories:

- image up to 8 MB
- audio/voice note up to 8 MB
- PDF up to 8 MB
- text file up to 1 MB

UploadThing calls `onUploadComplete` separately for each file. The callback
persists the source metadata, reads the source bytes, and asks Gemini for one
lowercase concrete key object. It then makes one independent Gemini image call
using the project's black-marker folk-art prompt, deliberately keeps only the
first returned image, uploads that image through UploadThing's server SDK, and
updates the same Neon row. Five source files therefore produce five independent
generated-file records and never one collage.

The client waits for the callback's server data, renders completed artifacts in
the upload panel immediately, and adds them to the signed-in user's memory chest.
The root Server Component reloads completed owner-scoped artifacts from Neon, so
they remain visible after refresh.

Current limitation: a source upload can succeed while Gemini or the generated
UploadThing upload fails. That source row is retained with `processing_status =
failed` and an internal error string so the failure is visible and retryable.
Production code may add a retry/reconciliation job. A future deletion feature
must delete both UploadThing objects and the owner-scoped Neon row.

## Scrapbook experience

The root route authenticates with Clerk and passes only a serializable viewer
ID, display name, and initials to the interactive book. The create/join code
generation and page session currently live in client state, as they did in the
original prototype. There are no scrapbook, invite, or membership tables or
server mutations yet. Consequently, the only member the scrapbook can render
from real data is the signed-in Clerk user; do not invent other members or treat
an entered code as durable authorization.

UploadThing still authenticates every upload on the server. In the scrapbook UI
the uploader is reachable only after the signed-in visitor creates or joins the
current client-side page session. Durable scrapbook membership and recipient
ownership checks require a future data model and server-side authorization
design before uploads can be attached to another member.

## Server and client boundaries

Pages and layouts remain Server Components by default. `upload-panel.tsx` is a
small Client Component because it needs React state and `router.refresh()`.
Database queries, secrets, and UploadThing callbacks stay server-side. The
client imports the upload router only with `import type`, which is erased from
the browser bundle.

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

## Deployment

Deploy to a Node-compatible Next.js host such as Vercel. Configure every value
from `.env.example` in the host's environment settings, run migrations against
the intended production Neon branch, and add the deployment domain to Clerk and
UploadThing where their dashboards require allowed origins or redirect URLs.
Do not use a static export; authentication, Server Actions, database access, and
the upload route require a server runtime.
