# Card Scan — QR Code Scanner

A mobile-optimized web app for quickly scanning QR codes from playing cards without duplicates.

## Features

- 📷 Continuous camera feed with live QR detection (no button press needed)
- ✅ Happy sound + green toast on new scan
- ❌ Sad sound + red toast on duplicate
- 💾 Results persist in `localStorage` until cleared
- 📋 Copy all results as newline-delimited text
- 🗑️ Clear list with confirmation

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (included with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) on your phone (see below for LAN access).

### Access on Your Phone (same Wi-Fi)

Vite's dev server binds to localhost by default. To access from your phone:

```bash
npm run dev -- --host
```

This will print a LAN address like `http://192.168.x.x:5173` — open that on your phone.

> **Important:** Camera access (`getUserMedia`) requires either **localhost** or **HTTPS**. The LAN IP will work in most browsers, but if you hit issues, use the production build with a local HTTPS server (see below).

### Production Build

```bash
npm run build
npm run preview -- --host
```

This serves the optimised build. For persistent hosting, copy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, etc.) — all of which serve over HTTPS, which is required for camera access on mobile.

## Deployment (Recommended for Mobile)

The easiest zero-config option:

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

Or drag the `dist/` folder to [netlify.com/drop](https://app.netlify.com/drop).

## Tech Stack

- [Vite](https://vitejs.dev/) — build tool
- [React 18](https://react.dev/) — UI
- [jsQR](https://github.com/cozmo/jsQR) — QR decoding (loaded via CDN)
- Web Audio API — sound effects
- `localStorage` — persistence

## Notes

- The scanner runs at every animation frame (~60fps) for fast detection
- A 1.8s cooldown after each scan prevents double-reads of the same card
- Works best with good lighting and holding the card steady for ~0.5s
- All data is stored locally in the browser — nothing is sent to any server
