# Project guide for humans and AI agents

This file is the source of truth for how this starter works. Read it before
changing authentication, database access, uploads, routing, or environment
variables.

## What this project is

Summerhacks is a Next.js 16 App Router application written in TypeScript and
styled with Tailwind CSS 4. It has one public landing page and one private
dashboard. The dashboard is deliberately small but exercises the full stack:

1. Clerk authenticates the visitor and provides a stable `userId`.
2. A Server Action writes the user's notes to Neon Postgres.
3. UploadThing stores uploaded files.
4. UploadThing's completion callback writes file metadata to Neon.
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

Exact installed versions live in `package.json` and `package-lock.json`. Do not
duplicate version numbers elsewhere unless a compatibility note requires it.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page and Clerk sign-in/sign-up buttons |
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
    page.tsx                      Public landing page
  components/upload-panel.tsx    Small client boundary for upload state
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

Only variables beginning with `NEXT_PUBLIC_` may be referenced by client code.
Do not rename a secret with that prefix.

## First-time setup

1. Use Node.js 20.9 or newer and run `npm install`.
2. Create a Neon project and copy its pooled connection string.
3. Create a Clerk application and copy its publishable and secret keys.
4. In Clerk, allow the sign-in methods desired for this app.
5. Create an UploadThing app and copy its token.
6. Run `cp .env.example .env.local` and replace every placeholder.
7. Run `npm run db:migrate` to apply the committed migration to Neon.
8. Run `npm run dev` and open `http://localhost:3000`.
9. Sign up, add a note, and upload a small file to exercise all services.

No real cloud resources or credentials are created by this repository. Those
three provider accounts must be configured before the integrated dashboard can
run end to end.

## Database model

`notes` contains `id`, `clerk_user_id`, `content`, and `created_at`.

`uploads` contains `id`, `clerk_user_id`, UploadThing's unique `file_key`, file
name, CDN URL, MIME type, byte size, and `created_at`.

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
The `workspaceFile` route allows one file per request:

- image up to 4 MB
- PDF up to 8 MB
- text file up to 1 MB

After UploadThing finishes storage, `onUploadComplete` inserts the file key,
URL, metadata, and authenticated owner ID into Neon. The client then refreshes
the dashboard so the new metadata row appears.

Current limitation: UploadThing storage can succeed while the Neon metadata
insert fails, leaving an unlisted file in UploadThing. Production code may add
an idempotent retry, webhook reconciliation, or cleanup job. A file deletion
feature must delete both the UploadThing object and its owner-scoped Neon row.

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
