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

/** Draft shape (Deadlock competitive preset). */
export const PICKS_PER_TEAM = 6;
export const BANS_PER_TEAM  = 2;

/**
 * Order of selections in a standard draft.
 * Used to work out whether the next action is a pick or a ban.
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
   Team logos
   ------------------------------------------------------------
   The draft lobby supplies logo URLs, but they aren't always
   reachable. Set a local file here to override a side entirely;
   leave null to use whatever the lobby reports.

   Any logo that fails to load is hidden rather than showing a
   broken image.
   ------------------------------------------------------------ */

export const TEAM_LOGOS = {
  amber:    null,   // e.g. "assets/images/teams/amber.png"
  sapphire: null
};

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

/** Art used for pick and ban slots in the overlay. */
export const SLOT_ASSET = "portrait";