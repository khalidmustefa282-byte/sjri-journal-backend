# SJRI Backend: publish-ready task list

Branch: `release/publish-ready` (never pushed to `main`). Ordered by importance.
Legend: [x] done · [ ] to do · [!] blocked (reason written underneath)

## 1. Security (must fix before launch)
- [ ] 1.1 Seed script: remove the fixed test accounts (admin/editor/reviewer/author @sjrijournal.org, weak passwords) and the "delete all data" step. Seed refuses to run in production or against a non-local database.
- [ ] 1.2 Add a safe `npm run create-admin` script so Khalid can create (or reset the password of) a real admin from his own computer, with the password typed by him, never stored in code.
- [ ] 1.3 `/api/auth/register` ignores any `role` field and always creates an AUTHOR. Validate email format and password length (min 8). Store emails in lowercase.
- [ ] 1.4 Admin-only role management: `GET /api/admin/users`, `PATCH /api/admin/users/[id]` (change role). Admin cannot remove their own admin role.
- [ ] 1.5 CORS: allow only the real frontend URL(s) (from `ALLOWED_ORIGINS` / `NEXT_PUBLIC_FRONTEND_URL`), never `*`. Echo the matching origin, add `Vary: Origin`.
- [ ] 1.6 JWT: refuse to sign or verify tokens when `NEXTAUTH_SECRET` is missing (today it silently falls back to an empty secret).
- [ ] 1.7 Reviewers can only review papers they were assigned to. Validate review decision and rating values.
- [ ] 1.8 Double-anonymous review: authors never see reviewer IDs/names; reviewers never see author identity.
- [ ] 1.9 Bad JSON / bad form data returns 400 with a clear message, not 500.

## 2. Features needed by the pages the client locked in
- [ ] 2.1 PDF storage: save uploaded PDFs to Vercel Blob (local `.uploads/` folder in development). Secure download route that checks who is allowed to see an unpublished manuscript.
- [ ] 2.2 Public publications API: current issue, archive grouped by year/volume/issue, publication schedule, one-paper detail, stage counts for the Publication page tabs, real homepage stats.
- [ ] 2.3 Editor API: list reviewers, assign reviewers (only real REVIEWER accounts, no duplicates), decisions; PUBLISH sets the published date, volume, issue, pages, DOI.
- [ ] 2.4 Admin publish flow: admin/editor uploads a finished paper PDF with its details and publishes it in one step (Phase 1 requirement).
- [ ] 2.5 Reviewer API: list my assignments; submit review.
- [ ] 2.6 Author revisions: upload a revised PDF when revisions are requested (status → REVISIONS_SUBMITTED, new version record).
- [ ] 2.7 Root URL `/` shows "SJRI API is running" instead of a 404, plus `/api/health`.

## 3. Quality
- [ ] 3.1 `npm run build` passes with no TypeScript errors after every change.
- [ ] 3.2 Automated API smoke test against a throwaway local database (never production).
- [ ] 3.3 Update README with the env variables and how to run.

## NEEDS KHALID (cannot be done from code)
- Delete or change the passwords of the 4 test accounts in the LIVE database (see REPORT.md for steps).
- Vercel env variables: `ALLOWED_ORIGINS`, `BLOB_READ_WRITE_TOKEN` (create a Blob store), confirm `NEXTAUTH_SECRET` is a long random value.
- Merge `release/publish-ready` into `main` after checking the preview.
