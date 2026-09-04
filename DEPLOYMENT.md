# KRAMAS — Local Development & Vercel Deployment Guide

## Prerequisites

- Node.js 18+
- npm
- Base44 CLI (`npm install -g @base44/cli`)

---

## 1. Local Development

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Set up environment variables
```bash
# Copy the template
cp .env.example .env

# .env is already filled with your App ID + API Key
# Verify the values match your Base44 dashboard
```

### Step 3: Run the dev server

> **IMPORTANT:** Do NOT use `npm run dev` directly. The Base44 Vite plugin
> requires the app to start through the Base44 CLI.

```bash
# Login to Base44 (one-time)
base44 login

# Start dev server
base44 dev
```

The CLI automatically injects the correct App ID, auth tokens, and functions
version — you don't need to manage `.env` manually when using the CLI.

---

## 2. Vercel Deployment

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Import to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Vercel auto-detects Vite framework (via `vercel.json`)

### Step 3: Set Environment Variables in Vercel

In Vercel project settings → Environment Variables, add:

| Key | Value |
|-----|-------|
| `BASE44_APP_ID` | `6a8c4677eeb41482e947f9c6` |
| `BASE44_API_KEY` | `f272f7f5f5cd4636a4c2f0a6a67c052d` |

> **Note:** Vercel build uses `npm run build` (defined in `vercel.json`).
> The Base44 CLI block only applies to `npm run dev`, not builds.

### Step 4: Deploy
Click **Deploy**. Vercel will:
- Run `npm install`
- Run `npm run build`
- Serve the `./dist` folder

### Step 5: SPA Routing
`vercel.json` already includes rewrites for SPA routing:
```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

---

## 3. Troubleshooting

### "Request failed with status code 404"
- **Cause:** `BASE44_APP_ID` not set or incorrect.
- **Fix:** Verify `.env` has correct App ID from Base44 dashboard.

### "Run the app through the Base44 CLI instead"
- **Cause:** You ran `npm run dev` directly.
- **Fix:** Use `base44 dev` instead.

### Build fails on Vercel
- **Cause:** Missing environment variables.
- **Fix:** Add `BASE44_APP_ID` and `BASE44_API_KEY` in Vercel settings.

### AuthContext resolution errors
- **Cause:** Using `VITE_` prefix instead of `BASE44_`.
- **Fix:** Use `BASE44_APP_ID` (not `VITE_BASE44_APP_ID`).

---

## 4. Important Notes

- `.env` is gitignored — never commit real API keys.
- `.env.example` is the template — safe to commit.
- Backend functions run on Base44's servers, not Vercel.
- The Vercel deployment is frontend-only (static build).
- For full-stack features (entities, functions, auth), the app relies on
  Base44's backend at `https://k2025.base44.app`.