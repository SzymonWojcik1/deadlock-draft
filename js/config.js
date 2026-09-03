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
   Audio
   ------------------------------------------------------------
   Voice lines are looked up by hero slug, same as art:
     <dir>/<slug>.<ext>     e.g. assets/voices/picks/Abrams.mp3

   Music tracks are listed by filename (without extension) and
   played back to back on a loop.

   Missing files fail silently, so you can add them a few at a
   time. Volumes multiply: effective = master × channel.

   Note: a browser tab won't play audio until the page has been
   clicked, so music starts on Connect. OBS browser sources have
   no such restriction.
   ------------------------------------------------------------ */

export const AUDIO = {
  /* Stingers played at the moment of a selection, just ahead of the
     hero's voice line. One file per kind, not per hero. */
  sfx: {
    enabled: true,
    dir:     "assets/audios/soundeffects",
    ext:     "mp3",
    files:   { pick: "Pick", ban: "Ban" },
    /* Gap between the stinger landing and the voice line starting.
       Tune by ear: too short and they talk over each other, too
       long and the moment sags. */
    voiceDelayMs: 380
  },

  voice: {
    enabled: true,
    pickDir: "assets/audios/picks",
    banDir:  "assets/audios/bans",
    ext:     "mp3",
    /* Ban lines exist now, so use them. Set true to fall back to
       the pick line whenever a ban file is missing. */
    banFallsBackToPick: false
  },

  music: {
    enabled: true,
    dir:     "assets/audios/osts",
    ext:     "mp3",
    shuffle: true,
    /* Filenames without extension. A single track loops seamlessly;
       add more and they play back to back. */
    tracks: ["ost1"]
  },

  /* Music dips under a selection so the stinger and voice line stay
     audible. */
  duck: {
    level:     0.25,   // fraction of normal music volume
    attackMs:  180,    // fade down
    holdMs:    250,    // stay down after the line ends
    releaseMs: 700     // fade back up
  },

  /* Starting slider positions, 0–1. Overridden by whatever the
     user last set on the connect screen. */
  defaults: {
    master: 0.8,
    music:  0.5,
    voice:  1.0,
    sfx:    0.9
  }
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