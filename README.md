# GS IT — Site Survey (PWA)

Offline-first pre-sale site surveys for field engineers, organised by department (ELV, AV, ICT, and any you add).
Next.js (App Router) + React + MongoDB. Engineers capture the survey on a phone with no signal; it syncs to MongoDB when a connection returns.

## Run it

```bash
npm install
cp .env.example .env.local        # then set MONGODB_URI and AUTH_SECRET
npm run seed:user -- you@globalsurf.ae "a-long-password" "Your Name" super_admin
npm run dev                       # http://localhost:3000
```

The service worker is **production only**, so test the PWA/offline behaviour with:

```bash
npm run build && npm start
```

Create logins with `npm run seed:user -- <email> <password> "<name>" [super_admin|lead|member] [department]`
(re-running it for an existing email resets that password and role). Day to day, people are added from inside the app (below).

PWA install requires HTTPS in production (localhost is exempt).

## Departments, roles and forms

The first start creates three departments (**ELV**, **AV**, **ICT**) and loads the original checklist as the ELV form.
Accounts and surveys from before departments existed are moved into ELV automatically (`src/lib/seed.ts`).

| Role | Can do |
|---|---|
| **Super admin** | Everything: create, edit and delete departments; appoint team leads; add or remove people and reset passwords; build forms for any department; open any survey. |
| **Team lead** (one per department) | See all members of their department with their activity and surveys (read-only: leads review, only the owner edits); add or remove members; create and customise the department's forms. Has their own dashboard plus a team panel. |
| **Member** | Starts and edits their own surveys using their department's forms. Sees their department, their lead, and a personal dashboard. |

- **Add a department**: Departments → *New department* (super admin). **Add people**: open the department → *Add person*
  (an existing email is added; a new email creates an account with a temporary password). **Appoint a lead**: *Make lead*
  next to a member (super admin); the previous lead becomes a member.
- **Forms**: Forms → *New form* (blank, or a copy of any form you manage) → the **form builder**: sections (icon, colour,
  required / optional-on / optional-off), fields (short and long text, number, date, dropdown, choose one / several,
  checklist row, photos, file upload, material list, manpower plan), group headings, reorder, duplicate, preview, and which
  fields name a survey. Saving bumps the version; engineers get it on their next sync. *Archive* hides a form from new
  surveys while existing surveys keep working; a form that surveys use can't be deleted, only archived.
- Forms are live: adding a field shows it in surveys already in progress; removing one hides it (answers stay stored).
- The ELV form is seeded once from `src/data/survey-schema.json`; after that it is edited in the app like any other form
  (changing the JSON file no longer changes an existing database).
- Departments, forms and member lists are cached on the device at every sync, so surveys, the team page and the form
  preview work offline. Creating or editing departments, people and forms needs a connection.

## App structure

```
src/
  app/
    (auth)/login            sign-in
    (app)/                  everything behind sign-in, wrapped in the app shell
      page.tsx              Home: company overview (super admin) or personal dashboard (+ team panel for leads)
      surveys/              surveys: search + filters; leads and admins also get a "Team surveys" tab
      departments/          all departments (super admin) · department/?id= team, forms, surveys · member/?dept=&id=
      forms/                forms by department · form-builder/?id= the builder (focus mode)
      account/              profile, departments, sync, theme, storage, install, sign out
      survey/               the survey wizard (focus mode: no tab bar; read-only for reviewers)
      report/               printable report
    api/                    auth, bootstrap, departments (+members), forms, surveys, files
  features/                 one folder per product area (dashboard, departments, forms, catalog, surveys, editor, account, report)
  components/
    shell/                  AppShell (bottom tabs on phones, sidebar on desktop), SyncChip
    ui/                     Icon set, Sheet (native <dialog>), toasts + confirm dialogs, ProgressRing
  lib/                      form + survey logic, permissions (access.ts), seed/migrations, IndexedDB store, sync, Mongo, auth
  data/survey-schema.json   the original ELV checklist (seed for the ELV form)
```

**Survey flow:** *New survey* sheet (deal, client, site, which systems are in scope) → wizard, one section
per step with a progress bar and resume-where-you-left-off → Review step (what's missing, jump to fix) → Submit.
Systems can be turned off or on later from the sliders button; their answers are kept.

Light and dark themes follow the device; override under Account → Appearance.

**Visual system:** frosted-glass surfaces over a blue/silver mesh, with colours taken from the GS IT logo
(ink, brand blue `#114A9F`, silver `#7A797C`). Tokens live at the top of `src/app/globals.css`; the logo is
`src/components/brand/Logo.tsx` (geometry in `logo-paths.ts`, also used to draw the PWA icons). Type is Geist
(`geist` package, self-hosted, works offline). Glass falls back to solid surfaces where `backdrop-filter` is
unavailable or the user asks for reduced transparency.

## How it works

| Piece | Where | Notes |
|---|---|---|
| Form definitions | MongoDB `forms` (edited in the form builder) | One document per form: sections + fields. The UI, progress, report and sync all follow the form a survey was started with. |
| ELV seed | `src/lib/elv-form.ts`, `scripts/extract-schema.ts` | The original HTML checklist, converted once to JSON and loaded as the ELV form on first start. |
| Local store | `src/lib/local-db.ts` | IndexedDB: surveys + photo blobs. Every keystroke autosaves here first. |
| Sync | `src/lib/sync.ts` | Push edits → pull changes → upload photos. Runs on reconnect, every 60 s, and on tap of the header status chip. |
| API | `src/app/api/*` | Auth, bootstrap (user + departments + forms), departments and members, forms, surveys (revision-checked), files (GridFS). Every route enforces `src/lib/access.ts`. |
| Service worker | `public/sw.js` | Caches the app shell + JS after first sign-in so it opens offline. API calls are never cached. |
| Report | `/report?id=…` | Print / save as PDF. |

### Data model

- `surveys`: `{ _id (client UUID), ownerId, departmentId, formId, title, status, values, rev, createdAt, updatedAt }`.
  `values` is a flat map keyed by the form's field keys; photos/attachments are `{kind:"file", id, …}` references.
- `departments`: `{ _id (slug), name, code, description, tone, iconName }`.
- `forms`: `{ _id, departmentId, name, description, status (active|archived), version, schema }`.
- `users`: `{ email, name, role (super_admin|user), memberships: [{ departmentId, role: lead|member }], passwordHash }`.
- `files.files` / `files.chunks`: GridFS bucket for photos and attachments (photos are resized to ≤1600 px on the device first).

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
