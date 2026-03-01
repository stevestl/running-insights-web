# Running Insights Web

Web version of your Running Insights app using React + Firebase Auth + Firestore.

## Features

- Email/password authentication
- Add run types: `Long`, `Tempo`, `Interval`, `Easy`
- Spreadsheet-style data entry with shorthand parsing:
  - Pace: `1142` -> `11:42`
  - Duration: `123` -> `1:23`, `1230` -> `12:30`
- Runs tab with filter, sort, edit, delete
- Analyze tab with trend chart + actionable insights
- Firestore sync under `users/{uid}/runs/{runId}`

## Local setup

1. Open terminal in `running-insights-web`.
2. Install dependencies:
   - `npm install`
3. Copy env template:
   - `cp .env.example .env`
4. Fill `.env` with your Firebase Web app config values.
5. Start dev server:
   - `npm run dev`

## Firebase setup (web)

1. Firebase Console -> Project Settings -> Add app -> Web app.
2. Register app (no hosting required yet).
3. Copy config keys into `.env`.
4. Authentication -> Sign-in method -> enable `Email/Password`.
5. Firestore -> create database (production mode).
6. Deploy Firestore rules from repo root:
   - `cd ".."`
   - `./scripts/deploy_firestore_rules.sh <your-firebase-project-id>`

## Build

- `npm run build`
- Build output: `dist/`

## GitHub repo + deployment (detailed)

### A) Create GitHub repo

1. Go to GitHub -> `+` -> `New repository`.
2. Name it, for example: `running-insights-web`.
3. Keep it empty (no README/license/gitignore).
4. Click `Create repository`.

### B) Push local project to GitHub

Run from this folder (`running-insights-web`):

```bash
git init
git add .
git commit -m "Initial web app"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

### C) Deploy on GitHub Pages (simple static hosting)

1. Confirm your branch is pushed:
   - `git checkout main`
   - `git push -u origin main`

2. Install the deploy package:
   - `npm install -D gh-pages`

3. Update `package.json` with `homepage` and deploy scripts.
   - Set `homepage` to:
     - `https://<YOUR_USER>.github.io/<YOUR_REPO>/`
   - Add these scripts:
     - `"predeploy": "npm run build"`
     - `"deploy": "gh-pages -d dist"`
   - Example:

```json
{
  "name": "running-insights-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "homepage": "https://<YOUR_USER>.github.io/<YOUR_REPO>/",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

4. Update `vite.config.ts` base path.
   - Recommended (most robust): use relative assets so repo/path changes do not break deploys:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./"
});
```

   - Alternative: use `base: "/<YOUR_REPO>/"` only if repo name/path is fixed and exact.

5. Commit these changes:
   - `git add package.json package-lock.json vite.config.ts`
   - `git commit -m "Configure GitHub Pages deployment"`
   - `git push`

6. Deploy from your local machine:
   - `npm run deploy`
   - This creates/updates the `gh-pages` branch automatically.

7. Configure GitHub Pages in the repo:
   - Go to `Settings` -> `Pages`
   - `Source`: `Deploy from a branch`
   - `Branch`: `gh-pages` and folder `/ (root)`
   - Click `Save`

8. Open your app URL:
   - `https://<YOUR_USER>.github.io/<YOUR_REPO>/`
   - First publish can take a few minutes.

9. Every time you want to publish updates:
   - `git push` (to save your source code changes)
   - `npm run deploy` (to publish the latest `dist` to `gh-pages`)

10. Troubleshooting:
   - Blank page or missing JS/CSS (404 in console):
     - confirm URL includes repo path and trailing slash:
       - `https://<YOUR_USER>.github.io/<YOUR_REPO>/`
     - prefer `base: "./"` in `vite.config.ts`
     - redeploy after any base/path change
   - 404 on refresh for sub-routes:
     - prefer hash routing, or keep navigation inside one page tabs
   - Old content still showing:
     - hard refresh browser (`Cmd+Shift+R`) after deploy

### D) Secure config notes

- Do not commit real `.env` values.
- Add `.env` to `.gitignore`.
- Use repo secrets + CI for production if needed.

## Data model notes

- Easy runs: only core metrics + total duration, no split rows.
- Long/Tempo/Interval keep templated row entry behaviors matching iOS logic.
