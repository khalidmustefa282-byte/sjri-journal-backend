# SJRI: publish-ready report

Date: 11 October 2026 · Branch: `release/publish-ready` in both repos (`main` was not touched)

## 1. DONE

**Security**
- Removed the 4 test accounts with weak passwords from the code, the README and the deploy guide. The backend repo is **public on GitHub**, so anyone could see those passwords. They must also be removed from the live database (see step 4 below).
- New accounts are always Authors. Only an Admin can change roles or set a new password.
- The API now accepts calls only from the SJRI website (no more `*`).
- Logins can't be faked with an empty secret. Role changes and deleted accounts take effect immediately.
- Reviewers can only review papers assigned to them. Authors and reviewers never see each other's names (double-anonymous review).
- Bad requests return a clear message instead of crashing.

**Features (every page the client locked in now uses real data)**
- **Publication page:** current issue, search (title, keyword, author), archive by year/issue, counts for Active / Requested / Submitted, publication schedule.
- **Paper page** for every published article: abstract, authors, "how to cite" with a copy button, Read/Download PDF, Google Scholar tags.
- **Submission page (authors):** submit with PDF, co-authors, download own PDF, see editor feedback and anonymous reviewer comments, upload a revision.
- **Editor dashboard** (`/editor`): manuscripts by stage, assign reviewers, accept / revise / decline, schedule into an issue, publish (optionally with a final typeset PDF).
- **Reviewer dashboard** (`/reviewer`): assigned papers, download manuscript, send recommendation and comments.
- **Admin page** (`/admin`): change roles, set new passwords, publish a PDF directly (the Phase 1 "PDF publication" flow).
- **Charges page:** how to pay by mobile money, bank transfer or cash. No payment gateway.
- PDFs are stored in Vercel Blob, max 4.4 MB, and checked to be real PDFs.
- Opening the backend link no longer shows a 404. It says "SJRI API is running".

**Content and quality**
- Removed everything invented: 3 fake papers, fake stats, a fake editorial board with real-sounding names, "USD 180" and fake waiver %. They are now `[... TO CONFIRM]` placeholders or real numbers.
- Replaced Lovable's heart favicon with the SJRI emblem. Better page titles and descriptions, plus a sitemap and robots.txt.
- Every page has loading, empty and error messages. I tested this with the server switched off: no blank screens.
- Mobile: 22 automated screenshots on a phone-size screen. No sideways scrolling, no errors.
- Backend: **81/81 automatic API checks pass** (run on a throwaway local database, never the live one). Both projects build with no TypeScript errors.

See `TASKS.md` (ticked list) and `DECISIONS.md` (23 choices I made, each changeable) in each repo.

## 2. PREVIEW

⚠️ **There are no preview links yet.** Your GitHub account isn't linked to Claude, so I could commit but not push. Vercel builds previews only after a push.

As soon as you push (step 1 below), these links will work (log in to Vercel on your phone if it asks):
- Website preview: https://sjri-publish-hub-git-release-publish-ready-khalid-994d.vercel.app
- Backend preview: https://sjri-journal-backend-git-release-publish-ready-khalid-994d.vercel.app/api/health

Important: the website preview talks to the **live** backend. Its new pages work only after you merge the backend (step 5).

## 3. NEEDS KHALID (step by step)

**Step 1: Push the work (2 minutes)**
1. Open **Terminal** on your Mac.
2. Paste this and press Enter:
   `cd ~/sjri-journal-backend && git push -u origin release/publish-ready`
3. Paste this and press Enter:
   `cd ~/sjri-publish-hub && git push -u origin release/publish-ready`

**Step 2: Turn on PDF storage (3 minutes)**
1. Go to vercel.com → project **sjri-journal-backend** → **Storage** tab.
2. Click **Create** → **Blob** → name it `sjri-pdfs`. If it asks, choose **Public** access.
3. Connect it to **sjri-journal-backend** for all environments. Vercel adds `BLOB_READ_WRITE_TOKEN` by itself.
   (Without this step, paper uploads show "File uploads are not set up".)

**Step 3: Check the login secret (1 minute)**
1. Vercel → sjri-journal-backend → **Settings** → **Environment Variables**.
2. Make sure `NEXTAUTH_SECRET` exists and is long and random (32+ characters). Don't share it with anyone.

**Step 4: Remove the old test accounts, then create your real admin (5 minutes)**
1. In Terminal: `cd ~/sjri-journal-backend && npm install`
2. See what will happen (this changes nothing): `npm run remove-test-accounts`
3. Do it: `npm run remove-test-accounts -- --yes`
4. Create your admin: `npm run create-admin`. Type your email, name and a strong password (12+ characters). Write the password somewhere safe.
   Do this order (remove first, then create), because the remove step deletes `admin@sjrijournal.org`.

**Step 5: Merge the backend (3 minutes)**
1. github.com → **sjri-journal-backend** → yellow bar **Compare & pull request** → **Create pull request** → **Merge**.
2. Wait until Vercel shows **Ready**.
3. Open https://sjri-journal-backend.vercel.app/api/health. You should see `"status":"ok"` and `"fileStorage":"vercel-blob"`.

**Step 6: Test the website preview on your phone (15 minutes)**
1. Open the website preview link from section 2.
2. Log in with your new admin account. Open the account icon → **Admin**.
3. Register a second account (an author). Submit a small PDF.
4. As admin, make your second account a **Reviewer**. Use the **Editor dashboard** to assign the paper, then review it as the reviewer, then accept and publish it.
5. Check that the paper appears on the Publications page.

**Step 7: Merge the website**
github.com → **sjri-publish-hub** → **Compare & pull request** → **Create pull request** → **Merge**.

**Step 8: Domain (when the client is ready)**
1. Vercel → **sjri-publish-hub** → Settings → **Domains** → add `sjrijournal.org` and `www.sjrijournal.org`. Follow Vercel's DNS steps at the domain seller.
2. Vercel → **sjri-journal-backend** → Environment Variables → add
   `ALLOWED_ORIGINS` = `https://sjrijournal.org,https://www.sjrijournal.org,https://sjri-publish-hub.vercel.app`
   then click **Redeploy**.

**Step 9: Client content**
Get the answers to the questions below. Send them to me (or to Claude Code) and the placeholders get replaced in a few minutes.

**Billing note:** author accounts, status tracking and the editor dashboard were **Phase 2** in your $500 Phase 1 quote. They're built now. Decide whether to bill Phase 2 or include it.

## 4. CLIENT QUESTIONS
1. **Editorial board:** names, roles and institutions (Editor-in-Chief, deputy, section editors).
2. **Fees:** the publication charge amount and currency. Are there waivers or discounts, and how much?
3. **Payment details:** mobile money service, number and account name. Bank name, account name, number and SWIFT. Office address and hours for cash payments.
4. **Journal details:** ISSN (if any), publisher name, how many issues per year, and the first volume/issue number and date.
5. **Domain:** will the site be `sjrijournal.org` or `www.sjrijournal.ss`? Is `info@sjrijournal.org` working?
6. **Peer review:** is double-anonymous review correct? How many reviewers per paper?
7. **Publication page tabs:** does "Submissions Requested" mean *revisions requested from authors*, and "Submissions Submitted" mean *manuscripts received*? (That's how they're built now. They show numbers only, never titles.)
8. **Research fields:** are these 8 correct? Agriculture & Environment, Public Health, Technology & Education, Economics & Development, Governance & Peace Studies, Engineering & Infrastructure, Social Sciences & Humanities, Natural Sciences.
9. **DOI:** is SJRI registered with Crossref (or another agency) to issue DOIs?
10. **Licence:** which open-access licence (for example CC BY 4.0)?
11. **Logo:** the official logo file (SVG or large PNG) for the header and browser icon.
12. **People:** who are the first editors and reviewers? They register on the site, then you give them their role on the Admin page.
