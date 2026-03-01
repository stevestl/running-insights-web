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

### C) Deploy on GitHub Pages with GitHub Actions (recommended)

1. Ensure `vite.config.ts` uses a safe base path:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./"
});
```

2. Ensure workflow file exists at this exact path:
   - `.github/workflows/deploy.yml`
   - Note: a file like `deploy.yaml` at repo root will not run.

3. In GitHub repo settings:
   - Go to `Settings` -> `Pages`
   - Set `Source` to `GitHub Actions`

4. Commit and push:

```bash
git add .github/workflows/deploy.yml vite.config.ts README.md
git commit -m "Configure GitHub Pages Actions deployment"
git push
```

5. Confirm deployment status:
   - Go to repo `Actions` tab
   - Open `Deploy to GitHub Pages` workflow
   - Wait for both jobs to pass:
     - `build` = green check
     - `deploy` = green check
   - When complete, the `deploy` job shows the published URL.

6. Open the app:
   - `https://<YOUR_USER>.github.io/<YOUR_REPO>/`
   - Keep the trailing slash.

7. How to know deployment is complete:
   - `Actions` workflow run shows `✓ Success`
   - `Settings` -> `Pages` shows:
     - `Your site is live at ...`
     - `Last deployed by GitHub Actions ...`
   - The site loads without JS/CSS 404 errors.

8. Troubleshooting blank screen + JS 404:
   - Workflow not running:
     - file path is wrong (must be `.github/workflows/deploy.yml`)
   - Pages source wrong:
     - ensure `Settings` -> `Pages` -> `Source = GitHub Actions`
   - Wrong URL:
     - use `https://<YOUR_USER>.github.io/<YOUR_REPO>/`
   - Cached old site:
     - hard refresh (`Cmd+Shift+R`)
   - If workflow fails:
     - open the failed job in `Actions` and fix the first red step.

### D) Secure config notes

- Do not commit real `.env` values.
- Add `.env` to `.gitignore`.
- Use repo secrets + CI for production if needed.

## Data model notes

- Easy runs: only core metrics + total duration, no split rows.
- Long/Tempo/Interval keep templated row entry behaviors matching iOS logic.
