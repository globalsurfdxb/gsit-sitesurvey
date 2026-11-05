# GS IT — ELV Site Survey (PWA)

Offline-first pre-sale site survey for field engineers. Next.js (App Router) + React + MongoDB.
Engineers capture the survey on a phone with no signal; it syncs to MongoDB when a connection returns.

## Run it

```bash
npm install
cp .env.example .env.local        # then set MONGODB_URI and AUTH_SECRET
npm run seed:user -- you@globalsurf.ae "a-long-password" "Your Name" admin
npm run dev                       # http://localhost:3000
```

The service worker is **production only**, so test the PWA/offline behaviour with:

```bash
npm run build && npm start
```

Create engineer logins with `npm run seed:user -- <email> <password> "<name>" [engineer|admin]`
(re-running it for an existing email resets that password). Engineers see their own surveys; admins see all.

PWA install requires HTTPS in production (localhost is exempt).

## How it works

| Piece | Where | Notes |
|---|---|---|
| Survey definition | `src/data/survey-schema.json` | 12 sections, ~300 fields. **Edit this file** to add/rename/remove fields; the UI, progress, report and sync all follow it. |
| Schema generator | `scripts/extract-schema.ts` | One-off converter from the original HTML checklist. Not needed day to day. |
| Local store | `src/lib/local-db.ts` | IndexedDB: surveys + photo blobs. Every keystroke autosaves here first. |
| Sync | `src/lib/sync.ts` | Push edits → pull changes → upload photos. Runs on reconnect, every 60 s, and on tap of the header status chip. |
| API | `src/app/api/*` | Auth, surveys (revision-checked), files (GridFS). |
| Service worker | `public/sw.js` | Caches the app shell + JS after first sign-in so it opens offline. API calls are never cached. |
| Report | `/report?id=…` | Print / save as PDF. |

### Data model

- `surveys` collection: `{ _id (client UUID), ownerId, title, status, values, rev, createdAt, updatedAt }`.
  `values` is a flat map keyed by the schema's field keys; photos/attachments are `{kind:"file", id, …}` references.
- `files.files` / `files.chunks`: GridFS bucket for photos and attachments (photos are resized to ≤1600 px on the device first).
- `users`: `{ email, name, role, passwordHash }`.

### Sync and conflicts

Each survey has a server `rev`. A push sends the `rev` it was based on; if the server has moved on
(e.g. the same survey edited from two devices) the server answers 409 and the editor shows a banner:
**Keep my version** (overwrite) or **Use server version** (discard local edits). Nothing is overwritten silently.

## Production notes

- Set `AUTH_SECRET` (≥32 random chars) and `MONGODB_URI` in the host's environment. Serve over HTTPS.
- Login throttling (`src/app/api/auth/login/route.ts`) is in-memory, per instance. Put a shared limiter in front if you run several instances.
- Sessions last 30 days; offline use continues after expiry, but syncing prompts for sign-in again.
- Local data stays on the device after sign-out so unsynced work isn't lost. On a shared device, clear site data if that is not wanted.
- Uploads: JPG/PNG/WebP/PDF/DWG/DOCX/XLSX, 15 MB each; type is decided by extension on the server.

## Scripts

`npm run dev` · `build` · `start` · `lint` · `typecheck` · `seed:user` · `extract:schema`
