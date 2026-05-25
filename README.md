# Section J — Client Portal (Phase 1)

A Next.js + Supabase application for the Section J client portal.

**Phase 1 scope** — invite-only authentication, login, password reset, and a placeholder dashboard. No project management or PDF extraction yet (those come in Phases 2 and 3).

---

## Deployment guide

You don't need to write code or use the command line. Follow the steps below in order.

### Step 1 — Create a GitHub repository

1. Go to **github.com**, sign in.
2. Click the **+** icon top-right → **New repository**.
3. Repository name: `sectionj-portal`. Keep it **Public** (free Netlify plan needs this; you can make it private later).
4. **Do not** tick "Add a README" or any other initialise option — leave the repo completely empty.
5. Click **Create repository**.

### Step 2 — Upload this folder to GitHub

1. On the empty repository page you just created, click **"uploading an existing file"** (link in the middle of the page).
2. In a separate Finder window, open the `sectionj-portal` folder (this folder).
3. **Drag and drop every visible file and folder inside `sectionj-portal/` into the GitHub upload area.** Don't drag the parent folder — drag its *contents*. The hidden `.gitignore` file should also be included (in Finder: `Cmd+Shift+.` to show hidden files first, then drag).
4. At the bottom, type a commit message like `Initial Phase 1 scaffold`.
5. Click **Commit changes**.
6. Refresh the page — you should see `package.json`, `src/`, `supabase/`, etc. listed.

### Step 3 — Run the database setup in Supabase

1. Open your Supabase project: **supabase.com/dashboard** → click `section-portal`.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open the file `supabase/0001_init.sql` from this folder, copy everything, paste it into the SQL editor.
4. Click **Run** (bottom-right). You should see "Success. No rows returned." That's correct.

### Step 4 — Configure Supabase Auth redirect URLs

1. In Supabase, left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL**: leave blank for now (we'll set it after deploying).
3. **Redirect URLs** — add the following (we'll add a real one after Step 5):
   - `http://localhost:3000/auth/callback`
4. Click **Save changes**.

### Step 5 — Deploy to Netlify

1. Go to **app.netlify.com** → click **Add new site** → **Import an existing project**.
2. Choose **Deploy with GitHub**, authorise Netlify if prompted.
3. Pick the `sectionj-portal` repository you just created.
4. Build settings will auto-detect Next.js. Confirm:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. **Before clicking Deploy**, expand **Add environment variables** and add THREE variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aapzlqfcrenqcfquwlqk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | (your Supabase `sb_publishable_...` key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (your Supabase `sb_secret_...` key) |

6. Click **Deploy site**.
7. Wait ~2–3 minutes for the first build. Netlify will show "Site deploy in progress" → then "Published".
8. Note the temporary URL Netlify gives you (e.g., `something-something.netlify.app`).

### Step 6 — Tell Supabase about the live URL

1. Back in Supabase → **Authentication → URL Configuration**.
2. **Site URL**: paste your Netlify URL (e.g., `https://something.netlify.app`).
3. **Redirect URLs**: add `https://something.netlify.app/auth/callback`.
4. Save.

### Step 7 — Invite yourself

1. Supabase → left sidebar → **Authentication** → **Users**.
2. Click **Add user** → **Send invitation**.
3. Email: `j.poovely@sectionj.au`. Click **Send invitation**.
4. Check your inbox (and spam folder) — you'll receive an email titled "You have been invited".
5. Click the link. It opens the portal at `/auth/update-password`. Set a password. You'll land on the dashboard.

### Step 8 — Promote yourself to admin

This makes you the admin account so Phase 2 admin tools will work for you.

1. Supabase → **SQL Editor** → **New query**.
2. Paste and run:

   ```sql
   update public.profiles set role = 'admin' where id = (
     select id from auth.users where email = 'j.poovely@sectionj.au'
   );
   ```

3. Refresh the dashboard — you'll see a small "Signed in as admin" note at the bottom.

### Step 9 — Point your subdomain (optional, can be done later)

When you're ready for `portal.sectionj.au` instead of the Netlify URL:

1. Netlify site → **Domain management** → **Add a domain** → enter `portal.sectionj.au`.
2. Netlify will show you a CNAME record to add at your DNS provider (GoDaddy).
3. Add the CNAME at GoDaddy. Wait 5–60 minutes for DNS to propagate.
4. Go back to Supabase **Authentication → URL Configuration** and update Site URL + add `https://portal.sectionj.au/auth/callback` to Redirect URLs.

---

## What's in this codebase

```
sectionj-portal/
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── next.config.js            # Next.js config
├── tailwind.config.ts        # Styling config
├── postcss.config.js         # CSS processor
├── netlify.toml              # Netlify build config
├── middleware.ts             # Auth session refresh on every request
├── .env.local.example        # Template for environment variables
├── .gitignore                # Files git should ignore
├── README.md                 # This file
├── supabase/
│   └── 0001_init.sql         # Database setup (run once in Supabase SQL editor)
└── src/
    ├── app/                  # Next.js App Router pages
    │   ├── layout.tsx        # Root HTML shell
    │   ├── page.tsx          # / redirects to dashboard or login
    │   ├── globals.css       # Global styles + Tailwind
    │   ├── login/            # Sign-in page
    │   ├── auth/             # Forgot/update password, OAuth callback
    │   └── dashboard/        # Authenticated client dashboard
    ├── components/
    │   └── AuthShell.tsx     # Shared header/footer for auth pages
    └── lib/
        └── supabase/         # Supabase client helpers (browser + server)
```

---

## Troubleshooting

**"The link has expired or is invalid"** when clicking the invite email — usually means Step 6 (Site URL / Redirect URLs in Supabase) wasn't done. Re-check.

**Build fails on Netlify** — open the deploy log, look for the error. Most common: missing environment variable (see Step 5).

**Login form just reloads** — the session refresh middleware might be misconfigured, or environment variables are wrong. Check Netlify Settings → Environment variables.

**Can't see "Signed in as admin"** — Step 8 didn't run, or you haven't refreshed the page after running it.

---

## What's next

Once Phase 1 is live and you can log in:
- **Phase 2** — Build the admin panel for creating projects and assigning them to clients.
- **Phase 3** — Wire up NatHERS PDF uploads with Claude API extraction.
- **Phase 4** — Build the design-insights / recommendations view.
