# Summerhacks starter

A small Next.js App Router project with:

- Clerk authentication
- Neon serverless Postgres through Drizzle ORM
- UploadThing file storage
- An authenticated dashboard that creates notes and uploads files

## Run it locally

```bash
cp .env.example .env.local
# Fill in the Neon, Clerk, and UploadThing credentials.
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For architecture, security rules, file ownership, environment variables, and
extension guidance, read [PROJECT_GUIDE.md](./PROJECT_GUIDE.md).
