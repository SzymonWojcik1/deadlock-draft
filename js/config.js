/* ============================================================
   Configuration.
   Anything you'd realistically want to change lives here.
   ============================================================ */

/**
 * Project root, resolved from this module's own URL.
 *
 * This is what lets pages live in subfolders: a page in html/ and
 * index.html both resolve "data/heroes.json" to the same file,
 * instead of it being relative to whichever page is open.
 */
export const ROOT = new URL("../", import.meta.url);

/** Resolve a project-relative path to an absolute URL. */
export function fromRoot(path){
  return new URL(path, ROOT).href;
}

/** StatLocker's live draft socket. */
export const WS_URL = "wss://statlocker.gg/ws/draft";

/** Reconnect delay after the socket drops, in ms. */
export const RECONNECT_DELAY_MS = 3000;

/** Where the hero table lives. */
export const HEROES_DATA_URL = fromRoot("data/heroes.json");

/** Design canvas. The overlay is built at this size and scaled to fit. */
export const CANVAS_WIDTH  = 1920;
export const CANVAS_HEIGHT = 1080;

/** Draft shape (Deadlock competitive preset). */
export const PICKS_PER_TEAM = 6;
export const BANS_PER_TEAM  = 2;

/**
 * Order of selections in a standard draft.
 * Only a fallback — the lobby's own pending step is preferred.
 */
export const STEP_TYPE_ORDER = [
  "ban", "ban",
  "pick", "pick", "pick", "pick", "pick", "pick",
  "ban", "ban",
  "pick", "pick", "pick", "pick", "pick", "pick"
];

/** Timer budgets, used to draw the countdown ring. */
export const STEP_TIME_SECONDS    = 30;
export const RESERVE_TIME_SECONDS = 120;

/* ------------------------------------------------------------
   Hero art
   ------------------------------------------------------------
   Every hero asset resolves to:  <dir>/<slug>.<ext>

   `slug` comes from data/heroes.json, so a hero is named in one
   place and every art type follows.

   `lowercase: true` lowercases the slug for that folder only —
   useful if one folder is `abrams.png` while another is
   `Abrams.png`. Set per folder as needed.
   ------------------------------------------------------------ */

export const ASSETS = {
  portrait: { dir: "assets/images/heroes/portraits", ext: "png", lowercase: false },
  render:   { dir: "assets/images/heroes/renders",   ext: "png", lowercase: false },
  critical: { dir: "assets/images/heroes/criticals", ext: "png", lowercase: false },
  gloat:    { dir: "assets/images/heroes/gloats",    ext: "png", lowercase: false },
  name:     { dir: "assets/images/heroes/names",     ext: "svg", lowercase: false }
};

/**
 * Which art each slot type uses.
 *
 * Cards are composited: the artwork fills the card, and the name
 * SVG sits on top near the bottom. Both are driven by the same
 * hero slug, so a card needs no per-hero setup.
 */
export const PICK_ASSET = "gloat";
export const BAN_ASSET  = "critical";
export const NAME_ASSET = "name";

/** Art used for the big centre-stage reveal, for both picks and bans. */
export const REVEAL_ASSET = "render";

/* ------------------------------------------------------------
   Voice lines
   ------------------------------------------------------------
   Played at the start of a big reveal. Files are looked up by the
   hero's slug, same as art: <dir>/<slug>.<ext>

   Missing files fail silently, so you can add them a few at a time.
   Set `enabled: true` once some exist.

   Note: a normal browser tab won't play audio until the page has
   been clicked. OBS browser sources have no such restriction.
   ------------------------------------------------------------ */

export const VOICE = {
  enabled: false,
  pickDir: "assets/audio/heroes/picks",
  banDir:  "assets/audio/heroes/bans",
  ext:     "mp3",
  volume:  0.8
};

/* ------------------------------------------------------------
   Team logos
   ------------------------------------------------------------
   Set a local file to override a side's logo; leave null to use
   whatever the lobby reports. Logos that fail to load are hidden
   rather than showing a broken image.
   ------------------------------------------------------------ */

export const TEAM_LOGOS = {
  amber:    null,   // e.g. "assets/images/teams/amber.png"
  sapphire: null
};