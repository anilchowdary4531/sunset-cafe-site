# GitHub Pages Deployment Guide for Sunset Cafe

Publish `play-site/` to GitHub Pages to get free public URLs for Play Console.

## Step 1 — Create GitHub repository

1. Go to [github.com](https://github.com) and sign in.
2. Click **New repository**.
3. Name it: `sunset-cafe-site`
4. Set visibility to **Public**.
5. Click **Create repository**.

## Step 2 — Push the play-site folder

```bash
cd /Users/anilkumarthammineni/Downloads/cafe-webapp/play-site
git init
git checkout -b main
git add .
git commit -m "Add Sunset Cafe website and privacy policy"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/sunset-cafe-site.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

## Step 3 — Enable GitHub Pages

1. Open your repository on GitHub.
2. Go to **Settings** → **Pages**.
3. Under **Branch**, select `main` and folder `/` (root).
4. Click **Save**.
5. Wait ~60 seconds, then refresh the page.
6. You will see: *"Your site is live at https://YOUR_GITHUB_USERNAME.github.io/sunset-cafe-site/"*

## Step 4 — Your public URLs

After Pages is enabled:

- **Website URL:** `https://YOUR_GITHUB_USERNAME.github.io/sunset-cafe-site/`
- **Privacy Policy URL:** `https://YOUR_GITHUB_USERNAME.github.io/sunset-cafe-site/privacy-policy.html`

Use these in Google Play Console.

## Step 5 — Update Play listing docs

Once you have the live URLs, update:

- `md/mobile/PLAY_STORE_LISTING_TEMPLATE.md`
- `md/mobile/PLAY_CONSOLE_SUBMISSION_CHECKLIST.md`

## Files in play-site/

| File | URL |
|------|-----|
| `index.html` | Website homepage |
| `privacy-policy.html` | Privacy policy (clean, no dev notes) |

