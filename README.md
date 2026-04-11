# YapTalks

YapTalks is a branded random video and text chat website made by Yash Raj.

## What is included

- Live random matching with Socket.IO queueing
- Live one-to-one text chat between matched users
- Live browser WebRTC signaling for video calls
- Firebase login gate before entering chat
- Camera and mic controls (mute/camera toggle/report+skip)
- Group room UI section (frontend flow)
- Subscription pricing section
- Owner-only ad and revenue simulation section
- SEO basics: metadata, schema, robots.txt, sitemap.xml

## Run locally

1. Install dependencies:
   `npm install`
2. Start the server:
   `npm start`
3. Open:
   `http://localhost:3000`

To test random matching, open two different browser windows/devices on the same server URL and press `Find stranger`.

## Deploy on Render (recommended)

1. Create a new **Web Service** in Render from this GitHub repo.
2. Render auto-detects `render.yaml` in the root.
3. Confirm settings:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: Free (or higher if needed)
4. Deploy and open your Render URL.
5. Test login and matching:
   - Create account / login on the auth page
   - Open two browser tabs or two devices
   - Click `Find stranger` on both tabs

For production scale, move to a paid plan to reduce cold starts and improve call stability.

## Owner monetization model

Users do not earn money on YapTalks.  
The platform owner earns from ads and premium subscriptions.
