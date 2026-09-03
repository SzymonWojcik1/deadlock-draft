# Deadlock Tournament Draft Tool

A draft tool built for a Deadlock tournament. The goal is simple: make the
draft phase look good for viewers.

It reads a live [StatLocker](https://statlocker.gg/) draft over WebSocket
and renders it as a broadcast overlay with local hero art, a centre-stage
pick/ban reveal, hero voice lines and a music bed.

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
check-assets.html           verifies every hero has every art file
data/
  heroes.json               hero id → name + asset slug   ← hero data here
css/
  tokens.css                colours, sizes, timings       ← theme here
  base.css                  reset + page backdrop
  setup.css                 connect screen
  overlay.css               layout, cards, timer
  reveal.css                centre-stage pick/ban reveal
js/
  config.js                 socket, asset paths, audio    ← settings here
  heroes.js                 hero lookup + asset paths
  socket.js                 connection + reconnect
  render.js                 DOM painting + reveal queue
  reveal.js                 centre-stage reveal sequence
  audio.js                  voice lines, music, volume mix
  main.js                   wiring
assets/images/heroes/
  portraits/  renders/  criticals/  gloats/  names/
assets/images/others/
  background.png  logo.png  cup.png
assets/audios/
  picks/  bans/  osts/  soundeffects/
```

Paths resolve against the project root rather than the current page, so a
page in a subfolder loads the same data and art as `index.html`.

## Running it

ES modules and `fetch` don't work over `file://`, so double-clicking
`index.html` won't work. Serve it:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

URL params skip the form entirely, which is what you want for an OBS
browser source:

```
?code=HF5AMBAH&stage=Quarter-final&team1=Hidden+King&team2=Archmother
```

For OBS: add a **Browser Source** at 1920x1080 pointing at that URL. The
overlay is drawn on a fixed 1920x1080 canvas and scaled to fit, so any
source size works.

**Caching.** Browsers cache ES modules hard, and a stale module produces
errors that point at code which is already correct. After editing, hard
reload (Cmd/Ctrl+Shift+R) or right-click → Refresh on the OBS source. To
avoid it entirely, serve with caching off:

```bash
python3 -c "
from http.server import HTTPServer, SimpleHTTPRequestHandler
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
HTTPServer(('',8000),H).serve_forever()
"
```

## Layout

The overlay is built on a fixed 1920x1080 canvas and scaled to fit the
window, so what you see matches the design at any output size.

```
   0 –  460   free: cameras, logo, title
 470 –  514   stage label
 540 –  720   bans
 700 –  740   team names
 770 –  955   picks + timer
 955 – 1080   free
```

The top of the canvas is deliberately empty for cameras. The centre-stage
reveal is clamped below `--reveal-top` and scales down rather than growing
upward, so it can never overlap them.

## Hero data

Everything lives in `data/heroes.json`:

```json
{ "id": 72, "name": "Billy", "slug": "Billy" }
```

`slug` is the filename, without extension, used across *every* art and
audio folder. Name a hero once and portraits, renders, criticals, gloats,
name SVGs and voice lines all resolve automatically.

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

Which art goes where is set by four constants in `js/config.js`:

```js
PICK_ASSET   = "gloat"      // pick cards
BAN_ASSET    = "critical"   // ban cards
NAME_ASSET   = "name"       // name plate on both
REVEAL_ASSET = "render"     // big centre-stage reveal
```

### Checking your art

Open `check-assets.html` (served, same as the overlay). It fetches every
art file for every hero and flags what's missing.

Missing art degrades quietly rather than showing a broken image, so a gap
won't break a broadcast — but it's worth running before a tournament.

## Audio

All audio config is the `AUDIO` block in `js/config.js`.

**Sound effects** are two stingers played at the moment of a selection,
just ahead of the voice line:

```
assets/audios/soundeffects/Pick.mp3
assets/audios/soundeffects/Ban.mp3
```

`voiceDelayMs` sets the gap before the voice line starts. If a stinger is
missing the line is brought forward rather than waiting for a sound that
never arrives.

**Voice lines** are looked up by hero slug, same as art:

```
assets/audios/picks/Abrams.mp3
assets/audios/bans/Abrams.mp3
```

`banFallsBackToPick` decides what happens when a ban file is missing:
`false` (current) plays nothing, `true` uses the pick line instead.

**Music** lists filenames without extension:

```js
tracks: ["ost1"]
```

One track loops seamlessly; several play back to back, shuffled if
`shuffle: true`. A missing track is skipped rather than stalling the bed.

**Volume** is set by four sliders on the connect screen — Master, Music,
Voice lines, Effects. They multiply (`effective = master × channel`), so Master
moves everything while keeping the balance. Settings persist and apply
live, so the mix can be adjusted while music is playing.

**Ducking** drops the music under a selection so the stinger and voice
line stay audible, then fades it back. It starts with the stinger, so the
bed is already out of the way before either lands. Tunable under `duck`.

Two things worth knowing:

- Music starts on **Connect**, not page load. Browsers block audio until a
  user gesture, and that click is the gesture. OBS browser sources have no
  such restriction.
- Slugs containing `&` (`Mo_&_Krill`) are URL-encoded when fetched. Name
  the file exactly like the art and it resolves.

## Theming

`css/tokens.css` holds colours, sizes and animation timings. The ones you
are most likely to touch:

```css
--bg-image        broadcast backdrop
--amber           team 1 colour
--sapphire        team 2 colour
--card-w          pick/ban card width
--timer-size      timer plate size
--reveal-top      camera safe line for the big reveal
--reveal-hold     how long the reveal sits on screen
```

Two ink scales exist on purpose: `--ink` / `--ink-dim` for the overlay's
light panels, and `--ink-light` / `--ink-light-dim` / `--ink-light-faint`
for dark surfaces like the connect screen and the timer plate. Using the
wrong one gives dark text on a dark background.

For a transparent OBS overlay, set `--bg-image: none` and
`--bg: transparent`.

## Hero IDs

Ids come from community-sourced mappings, not an official API. Two worth
double-checking against a live pick:

- **31** — listed as either Lash or McGinnis depending on the source.
  Set to Lash here, since 8 is already McGinnis.
- **63–81** — the extended/lab range. These matched a real draft, but
  they're the most likely to shift between patches.