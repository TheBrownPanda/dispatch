# Hannibal's Dispatch

Catering delivery dispatch scheduling with route optimization, driver assignment, drag-and-drop timeline, and pickup route optimizer.

## Local Development

```bash
npm install
npm run dev
```

## Deploy to Cloudflare Pages

### Option A: GitHub Integration (Recommended)
1. Push this repo to GitHub
2. Go to [Cloudflare Pages](https://dash.cloudflare.com/pages)
3. Create a new project → Connect to Git → Select this repo
4. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Deploy

### Option B: Direct Upload
```bash
npm run build
# Upload the `dist/` folder to Cloudflare Pages via dashboard
```

### Option C: Wrangler CLI
```bash
npm run build
npx wrangler pages deploy dist
```

## Google Maps Integration

To use live drive times instead of haversine estimates:
1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Distance Matrix API**
3. Since the API blocks browser CORS, you'll need a proxy. Create a Cloudflare Worker:

```js
// worker.js — deploy as a Cloudflare Worker
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing url param', { status: 400 });
    const resp = await fetch(target);
    const body = await resp.text();
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
```

Then update the `fetchGoogleDriveTimes` function in `App.jsx` to route through your worker URL.

## Stack
- React 18 + Vite
- No external UI libraries — custom CSS
- Fonts: IBM Plex Mono + DM Sans (Google Fonts CDN)
