# Deadlock Tournament Draft Tool

A draft tool built for a Deadlock tournament. The goal is simple: make the
draft phase look good for viewers.

It reads a live [StatLocker](https://statlocker.gg/) draft over WebSocket
and renders it as a clean, OBS-ready overlay using local hero art.

## Credit

This project is based on [StatLocker](https://statlocker.gg/), a
community-made Deadlock stat tracker. All credit to them for the original
work — this project just adapts it for tournament draft presentation.

## About the build

Most of the code in this repo was written with the help of AI. All art,
visuals, and design decisions are made by humans — AI was used strictly as
a coding assistant, not for creative direction.

## Status

Work in progress, built for a specific tournament.

---

## Structure

```
index.html                  the overlay
check-assets.html         verifies every hero has every art file
data/
  heroes.json               hero id → name + asset slug   ← hero data here
css/
  tokens.css                colours, fonts, sizes         ← theme here
  base.css                  reset + typography
  setup.css                 connect screen
  overlay.css               layout + components
js/
  config.js                 socket URL, asset folders, draft shape
  heroes.js                 hero lookup + asset paths
  socket.js                 connection + reconnect
  render.js                 DOM painting
  main.js                   wiring
fonts/                      local webfonts
assets/images/heroes/
  portraits/  renders/  criticals/  gloats/  names/
```

## Running it

ES modules and `fetch` don't work over `file://`, so double-clicking
`index.html` won't work. Serve it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/?code=YOURCODE`.

For OBS: add a **Browser Source** pointing at that URL (or the deployed
one). The background is transparent by design.

## Hero data

Everything lives in `data/heroes.json`:

```json
{ "id": 72, "name": "Billy", "slug": "Billy" }
```

`slug` is the filename, without extension, used across *every* art folder.
Name a hero once and portraits, renders, criticals, gloats and name SVGs
all resolve automatically.

An unknown id shows as `Hero #72` in the overlay and logs the exact JSON
line to add.

### Art folders

`ASSETS` in `js/config.js` maps each art type to a folder and extension:

```js
portrait: { dir: "assets/images/heroes/portraits", ext: "png", lowercase: false }
```

Set `lowercase: true` on any folder whose files are lowercase
(`abrams.png`) while the slug is capitalised (`Abrams`). Each folder is
independent, so mixed conventions are fine.

`SLOT_ASSET` decides which art the pick/ban slots use — currently
`portrait`. Switch it to `render` and the whole overlay follows.

### Checking your art

Open `check-assets.html` (served, same as the overlay). It fetches
every art file for every hero and flags what's missing.

## Hero IDs

Ids come from community-sourced mappings, not an official API. Two worth
double-checking against a live pick:

- **31** — listed as either Lash or McGinnis depending on the source.
  Set to Lash here, since 8 is already McGinnis.
- **63–81** — the extended/lab range. These matched a real draft, but
  they're the most likely to shift between patches.

## Deploying

The whole thing is static. Push to a Git repo and point Vercel at it, or
drag the folder into a new Vercel project. No build step, no backend.