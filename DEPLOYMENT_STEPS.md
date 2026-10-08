# SJRI Backend - Deployment Steps (30 minutes)

Follow these steps EXACTLY. Copy-paste each command.

---

## STEP 1: Set Up Database on Railway (5 minutes)

**You already have a Railway account, so this is easy:**

1. Go to **https://railway.app**
2. Log in with your account
3. Click **"Create New Project"** (top right button)
4. Select **"Provision PostgreSQL"**
5. Wait 1-2 minutes while it creates
6. Click on your new PostgreSQL project
7. Click the **"Connect"** tab
8. Under "PostgreSQL Connection String", click to **copy the full URL**
9. **Paste it somewhere safe** - you'll need it in 5 minutes

**It looks like:** `postgresql://user:password@host:port/database`

✅ **Done with Railway**

---

## STEP 2: Push Code to GitHub (5 minutes)

**You already have Git and GitHub, so:**

1. Open your `sjri-journal-backend` folder
2. Right-click inside the folder → Open Terminal / Command Prompt
3. **Copy and paste this EXACTLY:**

```bash
git init
```

Press Enter. Then:

```bash
git add .
```

Press Enter. Then:

```bash
git commit -m "SJRI Journal Backend"
```

Press Enter. Then:

```bash
git branch -M main
```

Press Enter. Then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/sjri-journal-backend.git
```

**IMPORTANT: Replace `YOUR_USERNAME` with YOUR actual GitHub username!**

Press Enter. Then:

```bash
git push -u origin main
```

Press Enter. Wait for it to finish (30 seconds).

**Check:** Go to **github.com** → your profile → you should see a new repo called `sjri-journal-backend`

✅ **Code is on GitHub**

---

## STEP 3: Deploy on Vercel (10 minutes)

**You already have Vercel, so:**

1. Go to **https://vercel.com**
2. Log in
3. Click **"Add New..."** → **"Project"**
4. Click **"Import Git Repository"**
5. Paste: `https://github.com/YOUR_USERNAME/sjri-journal-backend.git`
   (Replace YOUR_USERNAME again)
6. Click **"Import"**
7. Now you'll see **Environment Variables** section
8. **Add these 4 variables:**

| Variable Name | Value | Copy This |
|---|---|---|
| `DATABASE_URL` | From Railway (Step 1) | `postgresql://...` |
| `NEXTAUTH_SECRET` | Copy this: | `eTRX4sK9mP2qL8nJ7vB3wQ1aM5xC6dF0gH4yU9zT2rW5` |
| `NEXTAUTH_URL` | Leave empty for now | - |
| `NEXT_PUBLIC_FRONTEND_URL` | Copy this: | `http://localhost:5173` |

**How to add each variable:**
- Click in the first box, type the key (e.g., `DATABASE_URL`)
- Click in the second box, paste the value
- Click **"Add"**
- Repeat for all 4

9. Click **"Deploy"**
10. Wait 3-5 minutes (you'll see a loading animation)
11. When it says **"Congratulations! Your project has been successfully deployed"**
12. Click the link that says your domain (like `sjri-backend-abc123.vercel.app`)

**SAVE THIS URL!** This is your live backend.

✅ **Backend is LIVE on Vercel!**

---

## STEP 4: Initialize Database (5 minutes)

**Now set up the database tables:**

1. Open Terminal/Command Prompt in your `sjri-journal-backend` folder
2. Copy-paste this:

```bash
npm install
```

Wait for it to finish (1-2 minutes). Then:

```bash
npm run prisma:generate
```

Then:

```bash
npm run prisma:migrate
```

When it asks "Do you want to continue?", type:
```
yes
```

Then:

```bash
npm run seed
```

**This creates:**
- All database tables
- 4 test users
- 1 test paper

✅ **Database is ready!**

---

## STEP 5: Test It Works (2 minutes)

**Let's make sure everything is working:**

1. Download **Insomnia** (free) or **Postman** (free)
2. Open it
3. Create a new **POST** request
4. Paste your URL: `https://YOUR_VERCEL_URL/api/auth/token`
   (Replace YOUR_VERCEL_URL with your actual domain)
5. Click **"Body"** → **"JSON"**
6. Paste this:

```json
{
  "email": "author@sjrijournal.org",
  "password": "author123456"
}
```

7. Click **"Send"**
8. You should see a response with a token (long string)

**If you see a token:** ✅ Everything works!

**If you see an error:** Check that:
- The DATABASE_URL is correct
- The NEXTAUTH_SECRET is pasted correctly
- You ran `npm run seed`

---

## STEP 6: Share with Owner

**Now you can share:**

1. Your Vercel URL (like `https://sjri-backend-123.vercel.app`)
2. The test credentials (below)
3. Tell him: "The backend is live. Let's test it."

---

## Test Credentials

Use these to log in:

```
AUTHOR (paper submitter):
Email:    author@sjrijournal.org
Password: author123456

EDITOR (reviews submissions):
Email:    editor@sjrijournal.org
Password: editor123456

REVIEWER (gives reviews):
Email:    reviewer1@sjrijournal.org
Password: reviewer123456

ADMIN (full access):
Email:    admin@sjrijournal.org
Password: admin123456
```

---

## Testing Workflow

**Follow this to test everything:**

### 1. Author submits a paper
- Login as author
- Use `/api/papers/submit` to upload a paper
- See it in `/api/papers/my-submissions`

### 2. Editor reviews submissions
- Login as editor
- Go to `/api/editor/dashboard` → see stats
- Go to `/api/editor/submissions` → see all papers
- Use `/api/editor/assign-reviewer` to assign reviewers

### 3. Reviewer submits review
- Login as reviewer
- Use `/api/reviewer/submit-review` to review the paper

### 4. Editor makes decision
- Login as editor
- Use `/api/editor/decision` to accept/reject/publish

### 5. See published papers
- Go to `/api/publications/current` (no login needed)
- See published papers

---

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct (copied from Railway)
- Make sure no extra spaces

### "NEXTAUTH_SECRET error"
- Check you pasted the entire secret exactly

### "npm: command not found"
- You need Node.js installed
- Go to nodejs.org and install it

### "git: command not found"
- You need Git installed
- Go to git-scm.com and install it

### Deployment stuck on Vercel
- Wait 5 minutes
- If still stuck, go to Vercel → your project → Deployments → click redeploy

---

## Success Checklist

- [ ] Railway database created and URL copied
- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] Environment variables added to Vercel
- [ ] `npm run seed` completed
- [ ] Test login works (got token in Insomnia/Postman)
- [ ] You have your Vercel URL
- [ ] You can share URL with owner

✅ **You're done! The backend is LIVE.**

---

## Next Steps

1. ✅ Share Vercel URL with owner
2. ✅ Test together (submit paper, review, decide)
3. ✅ Once happy, update Lovable frontend URL
4. ✅ You're live!

Good luck! 🚀
