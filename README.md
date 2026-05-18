# YapTalks

> Free random video chat with anime character filters, XP ranks, party rooms, and interest matching. The next-generation Omegle alternative — built by [Yash Raj](https://github.com/Vscoderyash).

[![Live](https://img.shields.io/badge/live-yaptalks.vercel.app-0ea37f?style=flat-square)](https://yaptalks.vercel.app/)
[![Backend](https://img.shields.io/badge/backend-Render-0f6ee9?style=flat-square)](https://yaptalks.onrender.com/)
[![Node](https://img.shields.io/badge/node-%E2%89%A518.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-3.0-a78bfa?style=flat-square)](#)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Security & Anti-Abuse](#security--anti-abuse)
- [Progression System](#progression-system)
- [Anime Character Filters](#anime-character-filters)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Communication
- **Live random matching** with Socket.IO queueing (text or video)
- **Compatibility-aware matching** that prioritizes shared interests before falling back to fast random pairing
- **One-to-one text chat** between matched users with typing indicators
- **WebRTC video** with STUN signaling, peer-to-peer audio/video
- **Camera & mic controls**: mute, camera toggle, skip, report
- **Match rating** after every conversation (1–5 stars)

### Visual Identity
- **9 anime character filters** rendered through canvas (Naruto, Goku, Luffy, Levi, Gojo, Tanjiro, Todoroki, Saitama, Zoro) — applied to both your local preview and the WebRTC stream the peer receives
- **HD enhancement toggle** that brightens/sharpens the remote video
- **Aurora background** with animated radial gradient orbs
- **Glassmorphism UI** with custom-tuned blur, saturation, and inset highlights
- **Dark mode** with full color palette overrides

### Progression
- **8 named ranks**: Newcomer → Chatter → Regular → Veteran → Pro Yapper → Elite → Legend → Myth
- **Progressive XP curve**: 100 × 1.35^(level − 1)
- **Streak-based XP multiplier** (1×–2×) plus prestige stacking (+0.1× each)
- **16 unlockable achievements**
- **Daily missions** randomized from a 9-pool of objectives
- **Weekly challenge** for bonus XP
- **Prestige system** unlocked at level 50

### Social
- **Friends list** with add/accept request flow
- **Party rooms** (up to 8 members) with shared chat and 6-character codes
- **Live leaderboard** with top 12 ranking by XP, streak, then matches
- **Avatars** with 12 emoji choices

### Safety
- **Bot detection** via human-score heuristics (mouse, keystrokes, touches, scrolls)
- **Rate limiting** (25 events/sec per socket)
- **IP-level connection throttling** (12 conn/min)
- **Suspicion scoring** with auto-ban at threshold 80
- **Report system** with auto-cleanup at 5 reports
- **Safety Guard toggle** with trust score

### Polish
- **Cinematic splash screen** with animated logo, gradient bar, floating orbs
- **Confetti** on level-up and prestige
- **Web Audio cues** for match, message, level-up
- **Cursor glow** that follows the mouse
- **Match flash** radial overlay on every connection
- **Emoji burst** physics on reactions

---

## Architecture

```
┌────────────────┐         ┌──────────────────┐
│   Vercel CDN   │  HTML   │   Render Node    │
│  (frontend)    │◄──────► │  (Socket + API)  │
│                │ static  │                  │
└───────┬────────┘         └────────┬─────────┘
        │                           │
        │  WebRTC SDP/ICE           │  matchmaking, party
        │  via Socket.IO            │  rooms, leaderboard
        │                           │
        └──────────────WebRTC P2P────┘
                       (audio/video)
```

- **Frontend**: served from Vercel as static files (`index.html`, `styles.css`, `script.js`, `auth.js`)
- **Backend**: Node.js + Express + Socket.IO, deployed to Render
- **Auth**: Firebase Authentication (email/password) on the client
- **Real-time**: Socket.IO for signaling and chat; WebRTC for media P2P

---

## Quick Start

```bash
git clone https://github.com/Vscoderyash/YapTalks.git
cd YapTalks
npm install
npm start
```

Open `http://localhost:3000` in two browser tabs and click **Find match** to test.

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- A modern browser with `getUserMedia` support

### Run

```bash
npm install
npm run dev
```

The server listens on `process.env.PORT` (defaults to `3000`).

### Linting

```bash
npm run lint
```

This runs `node --check` against the JS files (no external linter dependency).

### Testing locally

To test matchmaking, open two browser windows pointed at `http://localhost:3000`. Click **Find match** in both — they pair on the same queue (`all_video` by default).

You can override the backend by appending `?backend=https://your-host.com` to the URL — the value is stored in `localStorage` until you visit `?reset_backend=1`.

---

## Deployment

### Frontend → Vercel

The static files (`index.html`, `styles.css`, `script.js`, `auth.js`, etc.) are deployed to Vercel.

```bash
vercel --prod
```

The frontend automatically uses `https://yaptalks.onrender.com` as its backend when hosted on `*.vercel.app`.

### Backend → Render

`render.yaml` configures the backend service:

- **Build**: `npm install --production`
- **Start**: `npm start`
- **Health check**: `/healthz`
- **Headers**: nosniff, frame-deny, strict referrer policy
- **Permissions Policy**: camera/microphone allowed (self only), geolocation blocked

Push to the `main` branch and Render auto-deploys. To trigger a manual deploy, use the Render dashboard.

### Environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `production` | Express environment |
| `TRUST_PROXY` | `1` | Trust X-Forwarded-For from Render proxy |

---

## Project Structure

```
YapTalks/
├── index.html              ─ Main app shell, SEO, OG, JSON-LD
├── privacy.html            ─ Privacy policy page
├── styles.css              ─ Full design system (~3200 lines)
├── script.js               ─ App logic: matchmaking, WebRTC, progression (~1900 lines)
├── auth.js                 ─ Firebase auth (email/password)
├── server.js               ─ Express + Socket.IO backend
├── og-image.svg            ─ Open Graph 1200×630 social preview
├── favicon.svg             ─ App icon
├── manifest.webmanifest    ─ PWA manifest
├── package.json
├── render.yaml             ─ Render deployment config
├── robots.txt              ─ Crawler rules + AI opt-out
└── sitemap.xml             ─ XML sitemap with image extension
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Auth | Firebase Authentication |
| Backend | Node.js, Express, Socket.IO |
| Media | WebRTC (STUN-only) |
| Hosting | Vercel (static) + Render (Node) |
| Storage | `localStorage` (profile), in-memory (server) |

No build step. No bundler. Edit and refresh.

---

## Security & Anti-Abuse

The server enforces multiple layers of protection:

- **Per-socket rate limiting** — 25 events/second window
- **IP connection limit** — 12 new connections/minute per IP
- **Suspicion scoring** — accumulates on rate-limit violations, invalid payloads, message-without-match, repeat offenses; auto-bans at 80
- **Input sanitization** — all string fields trimmed and length-capped (chat 500, party 220, names 48)
- **Report counting** — repeat-reported sockets are auto-cleaned at 5 reports
- **Bot detection (client)** — human score from mouse, keys, touches, scrolls; find-match silently blocked under threshold

Headers set via `render.yaml`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`

---

## Progression System

Levels follow `xpForNextLevel(n) = floor(100 × 1.35^(n−1))`:

| Level | XP needed (this level) | Total XP |
|---|---|---|
| 1 → 2 | 100 | 100 |
| 2 → 3 | 135 | 235 |
| 5 → 6 | 332 | ~803 |
| 10 → 11 | 1492 | ~5440 |
| 20 → 21 | ~21,700 | ~84k |
| 41 → 42 | ~3.7M | ~14M |

Multiplier:
- Streak ≥ 3 days → 1.25×
- Streak ≥ 7 days → 1.5×
- Streak ≥ 14 days → 1.75×
- Streak ≥ 30 days → 2.0×
- Each prestige stacks +0.1×

---

## Anime Character Filters

Each character is a CSS `filter` chain applied to a `<canvas>` that re-encodes the camera at 30fps. The encoded canvas stream is sent over WebRTC via `replaceTrack` so the peer receives the filtered video.

| Character | Filter |
|---|---|
| Naruto | `saturate(1.5) hue-rotate(12deg) contrast(1.1)` |
| Goku | `brightness(1.35) saturate(1.7) contrast(1.2)` |
| Luffy | `saturate(1.4) hue-rotate(-22deg) brightness(1.1)` |
| Levi | `grayscale(0.5) contrast(1.4) brightness(0.88)` |
| Gojo | `brightness(1.25) saturate(0.65) hue-rotate(210deg)` |
| Tanjiro | `hue-rotate(-28deg) saturate(1.6) contrast(1.15)` |
| Todoroki | `hue-rotate(180deg) saturate(1.4) brightness(1.15)` |
| Saitama | `brightness(1.5) saturate(0.35) contrast(1.35)` |
| Zoro | `hue-rotate(92deg) saturate(1.5) contrast(1.2)` |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Send chat message |
| `Esc` | Close modals (auth, rating) |
| `M` | Toggle mute (when video active) |
| `C` | Toggle camera (when video active) |
| `N` | Find next match |
| `?` | Show keyboard shortcuts help |

---

## Browser Support

Tested on:
- Chrome 110+
- Edge 110+
- Firefox 105+
- Safari 16+

Camera filtering uses `HTMLCanvasElement.captureStream()` and CSS `filter` — both widely supported. `mix-blend-mode` and `backdrop-filter` may degrade gracefully on older browsers.

---

## Contributing

This is a personal project, but PRs and issues are welcome.

1. Fork → create feature branch (`feat/your-feature`)
2. Commit with conventional-commits style messages
3. Open a PR with a clear description and test steps

For local-only changes (CSS tweaks, copy edits), feel free to push directly if you have access.

---

## License

UNLICENSED — all rights reserved by Yash Raj.

For commercial inquiries: **yaptalks.help@gmail.com**

---

<div align="center">

**Made with focus by [Yash Raj](https://github.com/Vscoderyash)** · **v3.0**

[Live demo](https://yaptalks.vercel.app/) · [Privacy Policy](https://yaptalks.vercel.app/privacy.html) · [Report an issue](https://github.com/Vscoderyash/YapTalks/issues)

</div>
