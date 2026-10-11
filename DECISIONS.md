# Decisions made while preparing SJRI for launch

Choices made without asking, picked as the most sensible option for a professional academic journal.
Each one can be changed later. (Same file in the backend and frontend repos.)

## Security
1. **No default accounts.** The seed script now only works on a local database and asks for its own password. The real admin is created with `npm run create-admin`. The old `@sjrijournal.org` demo accounts must be removed from the live database by Khalid (`npm run remove-test-accounts`). The backend repo is public, so their passwords were visible to anyone.
2. **Registration always creates Authors.** Reviewers and editors are promoted by an Admin on the `/admin` page. This is how most journals work: reviewers are invited, not self-appointed.
3. **Roles are re-checked on every request** from the database (not only from the login token), so a role change or a deleted account takes effect immediately.
4. **CORS allow-list instead of `*`.** Allowed: addresses in `ALLOWED_ORIGINS` / `NEXT_PUBLIC_FRONTEND_URL` / `FRONTEND_URL` (default `https://sjri-publish-hub.vercel.app`) plus this project's own Vercel preview links, so preview checks work. Localhost is allowed only outside production.
5. **Password reset is done by an Admin** (Admin page → key icon) instead of email links. Email sending (Resend) is not set up yet and needs a verified domain. Reset-by-email can come in Phase 2.

## Peer review
6. **Double-anonymous review.** This is what the existing About page promises. Authors never see reviewer names. Reviewers never see author names, emails or institutions. Reviewer comments reach the author (as "Reviewer 1", "Reviewer 2") only after the editor makes a decision.
7. **Reviewers can only review papers they are assigned to.** Reviews close once the paper is accepted, declined or published.
8. **Decision rules.** For example, a paper must be accepted before it can be scheduled or published, and volume and issue numbers are required to schedule or publish. This prevents mistakes like publishing a paper that is still under review.

## Publication page (client's locked tabs)
9. **"Current Publications"** = the newest volume/issue that has published papers.
10. **"Active Submissions", "Submissions Requested", "Submissions Submitted"** show **counts only**, never titles or names. Manuscripts under review are confidential. I read "Submissions Requested" as *revisions requested from authors* and "Submissions Submitted" as *new and revised manuscripts received*. → Confirm with the client (see client questions).
11. **"Schedule for Publication"** lists the titles and authors of accepted papers assigned to an upcoming issue. This is common practice ("forthcoming articles"). No PDF is shown before publication.
12. **Homepage stats are real.** Papers this year, countries of submitting authors, and average days to first decision are calculated from the database. They are hidden until there is data, and the average decision time appears only after 3+ decisions, so the site never shows made-up numbers.
13. **"Incomplete submissions" tab** stays, but submissions are saved in one step, so it will normally be empty. Saving half-finished drafts can be added in Phase 2.

## Files
14. **PDFs go to Vercel Blob**, limited to 4.4 MB (Vercel's request limit is 4.5 MB). The server checks that the file really is a PDF. Unpublished manuscripts are downloaded through the API with an access check, so the storage link is never shown to the browser.
15. **Editors can publish with a final typeset PDF** that replaces the author's manuscript file. Admins and editors can also publish a PDF directly (for papers received by email or WhatsApp, or for back issues). This is the Phase 1 "PDF publication with admin panel".

## Content
16. **Invented content removed.** The Lovable draft had three made-up papers, made-up statistics, a made-up editorial board (with real-sounding names), "USD 180" fees, and 100%/50%/25% waivers. All of these are now `[... TO CONFIRM]` placeholders or real data. "DOI registration" was removed from the list of what fees cover, because SJRI may not be registered with a DOI agency yet.
17. **Footer website** now shows `sjrijournal.org` (recorded as the primary domain) instead of `www.sjrijournal.ss`. → Confirm which domain will be live.
18. **Favicon** replaced: the old one was Lovable's logo. The new one is the SJRI emblem already used in the site header. Swap in the client's official logo file when available.
19. **Payment page** explains mobile money, bank transfer and cash, with no online payment gateway. All account details are placeholders.
20. **Research fields list** (8 fields) is kept from the Lovable draft. → Confirm with the client.

## Engineering
21. All work is on `release/publish-ready` in both repos. `main` was not touched.
22. The frontend's untracked `package-lock.json` was left uncommitted. Vercel installs with `bun.lock`, and no frontend packages were added.
23. Backend commits were grouped by area (security scripts, then API, then tests, then docs) instead of one commit per task. The API security fixes and new endpoints share the same helper files, so they were built and tested together (81/81 smoke checks).
