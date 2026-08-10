/* ============================================================
   Configuration.
   Anything you'd realistically want to change lives here.
   ============================================================ */

/** StatLocker's live draft socket. */
export const WS_URL = "wss://statlocker.gg/ws/draft";

/** Reconnect delay after the socket drops, in ms. */
export const RECONNECT_DELAY_MS = 3000;

/** Where the hero table lives. */
export const HEROES_DATA_URL = "data/heroes.json";

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
   Hero art
   ------------------------------------------------------------
   Every hero asset resolves to:  <dir>/<slug><suffix>.<ext>

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