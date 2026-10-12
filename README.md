# PickleQueue 🎾

**Fair play. Clear queues. More games.**

PickleQueue is a real-time court rotation and open-play queue management system designed for pickleball clubs, public parks, and tournaments. It features a tactile 3D claymorphic user interface, automated 4-in/4-out rotation fairness, smart matching algorithms, automated text-to-speech court announcements, and instant QR-based mobile player check-ins.

---

## 📱 Mobile-First Features

- **Responsive Viewport & Safe-Area Insets**: Optimized for iOS Dynamic Island/notches and Android bottom navigation bars using `viewport-fit=cover` and `env(safe-area-inset-*)`.
- **Court-Side Organizer Quick-Bar**: Sticky mobile action bar for one-handed operation on court sidelines (Instant Check-In, Match Creation, QR modal).
- **Player Mobile Terminals**: Live on-court takeover card when a match is called, live wait timer, on-deck previews, and simple rest/resume toggles.
- **Adaptive Leaderboards**: Wide screens display structured tabular data; mobile devices display touch-friendly tactical cards with podium medals and win rates.
- **PWA Manifest & Apple Touch Icons**: Ready to "Add to Home Screen" on iOS Safari and Android Chrome for a native app feel.
- **3D Claymorphic Background FX**: Interactive 3D clay pickleballs with realistic particle bursts powered by canvas-confetti, scaled and unobtrusive on mobile screens.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
```

Visit `http://localhost:3000` in your mobile device or browser.

---

## 🐙 Push to GitHub

To push this repository to GitHub:

```bash
# 1. Initialize git (if not already done)
git init
git branch -M main

# 2. Stage and commit all files
git add .
git commit -m "feat: mobile-friendly pickleball queue system with cloudflare support"

# 3. Add your GitHub remote repository
git remote add origin https://github.com/<YOUR-USERNAME>/picklequeue.git

# 4. Push to GitHub
git push -u origin main
```

---

## ☁️ Deploy to Cloudflare Pages

This application is fully configured for deployment on **Cloudflare Pages** (Single Page Application ready with `public/_redirects`).

### Option A: Cloudflare Dashboard (Recommended)

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Connect to Git**.
3. Select your GitHub repository (`picklequeue`).
4. Set build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**. Cloudflare Pages will automatically build and publish your app with a global CDN URL!

### Option B: Cloudflare Wrangler CLI

Deploy directly from your terminal in seconds using Wrangler:

```bash
# 1. Build the production app
npm run build

# 2. Deploy dist folder to Cloudflare Pages
npx wrangler pages deploy dist --project-name=picklequeue
```

### Option C: Automated GitHub Actions

A pre-configured GitHub Actions workflow is provided at `.github/workflows/deploy-cloudflare.yml`. To enable automatic deployments on every `git push`:
1. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your GitHub repository's **Settings > Secrets and variables > Actions**.
2. Any push to `main` will build and publish the latest version automatically.

---

## ⚙️ Cloudflare Routing & SPA Configuration

- Cloudflare Pages uses `/public/_redirects` (`/* /index.html 200`) to enable HTML5 History pushState routing so deep links (`/player/:id`, `/join/:id`, `/organizer/:id`, `/summary/:id`, `/admin`) reload without 404 errors.
