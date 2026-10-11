# SJRI Journal Backend

API for the South Journal of Research & Innovation website (frontend: `sjri-publish-hub`).
Next.js 16 route handlers · Prisma · PostgreSQL (Railway) · Vercel Blob for PDFs · JWT bearer tokens.

Opening the backend URL in a browser shows `{"service":"SJRI Journal API","status":"running"}`.
That is normal: this project has no web pages. The website is the frontend project.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Required | What it is |
| --- | --- | --- |
| `DATABASE_URL` | yes | Railway PostgreSQL connection string |
| `NEXTAUTH_SECRET` | yes | Long random string (min 16 chars, `openssl rand -base64 32`). Signs login tokens. |
| `BLOB_READ_WRITE_TOKEN` | yes | Created automatically when a Vercel Blob store is connected to this project. Without it, PDF uploads return a clear error. |
| `ALLOWED_ORIGINS` | recommended | Comma-separated website addresses allowed to call the API, e.g. `https://sjrijournal.org,https://www.sjrijournal.org,https://sjri-publish-hub.vercel.app`. If empty, `NEXT_PUBLIC_FRONTEND_URL` / `FRONTEND_URL` are used, then `https://sjri-publish-hub.vercel.app`. |
| `NEXT_PUBLIC_FRONTEND_URL` | optional | The main website address (also allowed by CORS). |
| `ALLOW_VERCEL_PREVIEWS` | optional | `false` to block frontend preview deployments (`sjri-publish-hub-*-khalid-994d.vercel.app`). Allowed by default. |

`.env` files are git-ignored. Never commit them.

## Accounts and roles

- Anyone can register on the website. New accounts are always **Authors** (the API ignores any role sent by the browser).
- An **Admin** changes roles and sets new passwords on the website's Admin page (`/admin`).
- Create the first real admin from your own computer (uses `DATABASE_URL` from `.env`):

```bash
npm run create-admin          # asks for email, name, password; nothing is saved in code
```

- Remove the old demo accounts that had weak passwords (dry run first, then apply):

```bash
npm run remove-test-accounts
npm run remove-test-accounts -- --yes
```

There are **no default passwords** anywhere in this repository.

## Local development

```bash
npm install
cp .env.example .env    # or create .env with the variables above, pointing at a LOCAL database
npx prisma db push      # LOCAL database only
SEED_PASSWORD="choose-12+-chars" npm run seed   # demo accounts, refuses to run against a non-local database
npm run dev
```

## Tests

`scripts/smoke-test.mjs` runs 81 API checks (security, roles, full submission → review → revision → publish workflow).
It refuses to run unless both the API and the database are on `localhost`. See the comment at the top of the file.

## API

Public
- `GET /api/health` · `GET /api/publications/current` · `GET /api/publications/search?q=&field=&year=`
- `GET /api/publications/archive` · `GET /api/publications/schedule` · `GET /api/publications/overview` · `GET /api/publications/stats`
- `GET /api/publications/:id` · `GET /api/publications/:id/pdf`

Accounts
- `POST /api/auth/register` · `POST /api/auth/token` · `GET /api/auth/me`

Authors
- `POST /api/papers/submit` (multipart, PDF ≤ 4.4 MB) · `GET /api/papers/my-submissions`
- `GET /api/papers/:id` · `GET /api/papers/:id/pdf` · `POST /api/papers/:id/revision`

Editors (EDITOR, ADMIN)
- `GET /api/editor/dashboard` · `GET /api/editor/submissions?status=` · `GET /api/editor/reviewers`
- `POST /api/editor/assign-reviewer` · `POST /api/editor/decision` (ACCEPT, REJECT, REQUEST_REVISIONS, SCHEDULE, PUBLISH)
- `POST /api/admin/publish` (multipart: publish a final PDF directly, or attach it to an accepted paper with `paperId`)

Reviewers (REVIEWER, ADMIN)
- `GET /api/reviewer/assignments` · `POST /api/reviewer/submit-review` (assigned papers only)

Admins
- `GET /api/admin/users` · `PATCH /api/admin/users/:id` (`{ role }` or `{ password }`)

CORS is handled in `proxy.ts` for every `/api` route.
