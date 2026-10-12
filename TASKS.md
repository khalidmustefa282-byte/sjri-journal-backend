# SJRI Backend: publish-ready task list

Branch: `release/publish-ready` (never pushed to `main`). Ordered by importance.
Legend: [x] done · [ ] to do · [!] blocked (reason written underneath)

## 1. Security (must fix before launch)
- [x] 1.1 Seed script: fixed test accounts and the "delete all data" step removed. Seed refuses to run in production or against a non-local database, and takes its password from `SEED_PASSWORD`.
- [x] 1.2 `npm run create-admin` (create or reset the real admin, password typed by Khalid) and `npm run remove-test-accounts` (dry run by default).
- [x] 1.3 `/api/auth/register` ignores `role` and always creates AUTHOR. Validates email and password (min 8). Emails are stored lowercase, and login is case-insensitive.
- [x] 1.4 Admin-only `GET /api/admin/users` and `PATCH /api/admin/users/[id]` (role or new password). An admin cannot remove their own admin role.
- [x] 1.5 CORS allow-list in `proxy.ts` (never `*`), with `Vary: Origin`. Frontend preview links are allowed.
- [x] 1.6 JWT is never signed or verified with an empty secret. Role is re-read from the database on every request.
- [x] 1.7 Reviewers can only review assigned papers. Decision and rating values are validated. Reviews close after a final decision.
- [x] 1.8 Double-anonymous review enforced in API responses. Storage URLs are never sent to browsers.
- [x] 1.9 Bad JSON or form data returns 400 with a clear message.
- [x] 1.10 (found during audit) README and DEPLOYMENT_STEPS.md published the test passwords. Removed. They stay in old git history, so the live accounts must be changed (NEEDS KHALID).

## 2. Features needed by the pages the client locked in
- [x] 2.1 PDF storage in Vercel Blob (local `.uploads/` in development). Real-PDF check and access-checked download.
- [x] 2.2 Public API: current issue, archive, schedule, stage counts, paper detail, public PDF, real stats, search (including author names).
- [x] 2.3 Editor API: reviewer list, safe assignment, decision workflow rules, schedule/publish with volume/issue/pages/DOI/date.
- [x] 2.4 Admin/editor one-step publish of a final PDF (new paper, or attach to an accepted paper).
- [x] 2.5 Reviewer API: my assignments, submit or update review.
- [x] 2.6 Author revision upload (status → REVISIONS_SUBMITTED, new version record).
- [x] 2.7 `/` shows "SJRI API is running" instead of 404. `/api/health` added.

## 3. Quality
- [x] 3.1 `tsc` and `next build` pass.
- [x] 3.2 `scripts/smoke-test.mjs`: 81/81 checks pass against a throwaway local database (never production).
- [x] 3.3 README rewritten (env vars, roles, scripts, API). `.env.example` added.

## Not done (Phase 2 ideas)
- Email notifications (Resend) for submissions, decisions and password reset.
- Saving incomplete drafts.
- Login rate limiting.

## NEEDS KHALID
See REPORT.md → "NEEDS KHALID".
