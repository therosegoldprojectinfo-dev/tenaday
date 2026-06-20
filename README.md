# Ten a Day — base

This is the empty skeleton, not the app. No screens, no game logic — just
the wiring so Claude Code can start building the real thing straight from
`ten-a-day-spec.md` without first having to set up tooling.

## Stack

- **React + Vite** — UI and dev server/build tool
- **Tailwind CSS** — utility classes, configured properly this time
  (`tailwind.config.js`, not the CDN shortcut) so the 4 era color groups
  (`stoneage`, `medieval`, `industrial`, `futuristic`) have a real home
- **Supabase** — database, auth, edge functions
- Mobile-only, PWA-ready (manifest + meta tags already in `index.html`
  and `public/manifest.json`) — installable to a home screen, opens
  full-screen like a native app

## Folder structure

```
ten-a-day-v2/
├── index.html              mobile viewport + PWA tags
├── public/
│   └── manifest.json       PWA manifest (still needs real icon files)
├── src/
│   ├── main.jsx             entry point
│   ├── App.jsx               placeholder shell - replace with real routing/tabs
│   ├── index.css            Tailwind directives
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── screens/              one file per full screen (see screens/README.md)
│   └── components/           shared UI pieces (see components/README.md)
├── supabase/
│   ├── schema.sql            placeholder - design from the spec
│   └── functions/            edge functions go here (e.g. an AI insight,
│                              if you want one later)
├── tailwind.config.js        era color groups already named, placeholder hex values
├── vite.config.js
├── postcss.config.js
├── package.json
└── .env.example
```

## Getting it running locally

```bash
npm install
cp .env.example .env
# fill in your Supabase project URL + anon key
npm run dev
```

`vite.config.js` already has `host: true` set, so the terminal will also
print a `Network:` URL — open that on your phone (same wifi) to test the
real mobile experience immediately, not just a resized browser window.

## GitHub + Vercel workflow

1. `git init` (already done in this folder), then push to a new GitHub repo:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In Vercel, import that GitHub repo. Add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel
   project settings.
3. Every push to `main` auto-deploys. This is also the setup that lets
   Claude Code work directly in your real, cloned repo on your machine —
   it edits files, you see them locally, you push, Vercel deploys.

## What's NOT in this base, on purpose

- No screens, no nav, no game logic — that's the next step, built by
  Claude Code from `ten-a-day-spec.md`
- No real Supabase schema yet — same reason
- No real app icons yet — add `icon-192.png` and `icon-512.png` to
  `public/` once the visual identity is locked (Claude Design phase)
- No real color values in `tailwind.config.js` — currently placeholders,
  swap once the era palettes are locked
