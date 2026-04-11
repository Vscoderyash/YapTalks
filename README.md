# YapTalks

YapTalks is a branded random video and text chat website inspired by Omegle and Monkey, made by Yash Raj.

## What is included

- Live random matching with Socket.IO queueing
- Live one-to-one text chat between matched users
- Live browser WebRTC signaling for video calls
- Camera and mic controls (mute/camera toggle/report+skip)
- Group room UI section (frontend flow)
- Subscription pricing section
- Owner-only ad and revenue simulation section

## Run locally

1. Install dependencies:
   `npm install`
2. Start the server:
   `npm start`
3. Open:
   `http://localhost:3000`

To test random matching, open two different browser windows/devices on the same server URL and press `Find stranger`.

## Deploy with Koyeb backend + Vercel frontend

### 1) Backend on Koyeb

1. Create a new **Web Service** in Koyeb from this GitHub repo.
2. Runtime: Node.js
3. Build command: `npm install`
4. Start command: `npm start`
5. Port: use Koyeb default `PORT` environment variable (already supported by `server.js`)
6. Deploy and copy your backend URL:
   Example: `https://your-yaptalks-api.koyeb.app`

### 2) Frontend on Vercel

1. Import same repo in Vercel.
2. Application preset: `Other`
3. Root directory: `./`
4. Deploy.
5. This repo includes `vercel.json` with `/socket.io/*` rewrite to Render backend.

### 3) Connect frontend to backend URL

Open your Vercel site with this once:

`https://your-frontend.vercel.app/?backend=https://your-yaptalks-api.koyeb.app`

YapTalks stores that backend URL in browser localStorage automatically.

If you need to reset backend URL:

`https://your-frontend.vercel.app/?reset_backend=1`

If Vercel keeps serving old code, redeploy with cache disabled from Vercel dashboard.

## Owner monetization model

Users do not earn money on YapTalks.  
The platform owner earns from ads and premium subscriptions.
