/* ============================================================
   Audio.

   Owns everything that makes noise: hero voice lines and the
   background music bed, plus the volume mix between them.

   Volumes are multiplied: effective = master × channel. That way
   the master slider moves everything together while the channel
   sliders keep their relative balance.

   Nothing here throws. A missing file, an unsupported codec or a
   browser blocking autoplay all fail quietly — a broadcast should
   never break because a sound is missing.
   ============================================================ */

import { AUDIO, fromRoot } from "./config.js";

const VOLUME_KEY = "dl_overlay_volumes";

/* ---------------- Volume state ---------------- */

let volumes = { ...AUDIO.defaults };

export function loadVolumes(){
  try {
    const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) || "null");
    if (saved) volumes = { ...AUDIO.defaults, ...saved };
  } catch (e){}
  return { ...volumes };
}

export function saveVolumes(){
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes));
  } catch (e){}
}

export function getVolumes(){
  return { ...volumes };
}

/**
 * Set one channel's volume, 0–1.
 * @param {"master"|"music"|"voice"} channel
 */
export function setVolume(channel, value){
  volumes[channel] = Math.max(0, Math.min(1, value));
  applyVolumes();
  saveVolumes();
}

function effective(channel){
  return volumes.master * volumes[channel];
}

function applyVolumes(){
  if (musicEl){
    musicEl.volume = effective("music") * (ducked ? AUDIO.duck.level : 1);
  }
  if (voiceEl){
    voiceEl.volume = effective("voice");
  }
  if (sfxEl){
    sfxEl.volume = effective("sfx");
  }
}

/* ---------------- Selection audio ---------------- */

/*
   A selection makes two sounds: a stinger at the moment it lands,
   then the hero's voice line just behind it.

   They're separate elements on separate channels so they overlap
   rather than cutting each other off, and so the stinger can sit
   at a different level from the lines.
*/

let voiceEl = null;
let sfxEl = null;
let voiceTimer = null;
let ducked = false;

/**
 * Play the full sound of a pick or ban: stinger, then voice line.
 *
 * @param {string} slug  hero slug, matching the filename
 * @param {string} kind  "pick" or "ban"
 */
export function playSelectionAudio(slug, kind){
  stopSelectionAudio();
  duck();

  const stingerStarted = playStinger(kind, () => {
    // The stinger couldn't play. Don't leave the voice line waiting
    // on a sound that will never arrive — bring it forward.
    clearTimeout(voiceTimer);
    playVoice(slug, kind);
  });

  if (stingerStarted){
    voiceTimer = setTimeout(() => playVoice(slug, kind), AUDIO.sfx.voiceDelayMs);
  } else {
    playVoice(slug, kind);
  }
}

/** Stop anything a selection started. */
export function stopSelectionAudio(){
  clearTimeout(voiceTimer);
  voiceTimer = null;
  stopStinger();
  stopVoice();
}

/* ---------------- Stingers ---------------- */

/**
 * Play the pick or ban stinger.
 * @returns {boolean} whether playback was attempted at all
 */
function playStinger(kind, onFail){
  if (!AUDIO.sfx.enabled) return false;

  const name = AUDIO.sfx.files[kind === "ban" ? "ban" : "pick"];
  if (!name) return false;

  stopStinger();

  const url = fromRoot(
    `${AUDIO.sfx.dir}/${encodeURIComponent(name)}.${AUDIO.sfx.ext}`
  );

  const audio = new Audio(url);
  audio.volume = effective("sfx");
  sfxEl = audio;

  audio.addEventListener("error", () => onFail?.());
  audio.play().catch(() => onFail?.());

  return true;
}

function stopStinger(){
  if (!sfxEl) return;
  try {
    sfxEl.pause();
    sfxEl.currentTime = 0;
  } catch (e){}
  sfxEl = null;
}

/* ---------------- Voice lines ---------------- */

/** Where a hero's voice line should live for a given kind. */
function voicePath(slug, kind){
  const dir = kind === "ban" ? AUDIO.voice.banDir : AUDIO.voice.pickDir;
  // Slugs can contain characters like & (Mo_&_Krill), so encode the
  // filename even though the folders are plain.
  return fromRoot(`${dir}/${encodeURIComponent(slug)}.${AUDIO.voice.ext}`);
}

/**
 * Play a hero's voice line.
 *
 * Bans fall back to the pick line when no ban-specific file exists,
 * so a half-populated bans folder still sounds right.
 *
 * @param {string} slug  hero slug, matching the filename
 * @param {string} kind  "pick" or "ban"
 */
export function playVoice(slug, kind){
  if (!AUDIO.voice.enabled || !slug){
    // No line coming, so release the music.
    unduck();
    return;
  }

  stopVoice();

  const tryPlay = (url, onFail) => {
    const audio = new Audio(url);
    audio.volume = effective("voice");
    voiceEl = audio;

    audio.addEventListener("ended", unduck);
    audio.addEventListener("error", () => { onFail ? onFail() : unduck(); });

    audio.play().catch(() => {
      // Autoplay blocked, or the file isn't playable.
      if (onFail) onFail(); else unduck();
    });
  };

  const primary = voicePath(slug, kind);

  if (kind === "ban" && AUDIO.voice.banFallsBackToPick){
    tryPlay(primary, () => tryPlay(voicePath(slug, "pick")));
  } else {
    tryPlay(primary);
  }
}

export function stopVoice(){
  if (!voiceEl) return;
  try {
    voiceEl.pause();
    voiceEl.currentTime = 0;
  } catch (e){}
  voiceEl = null;
  unduck();
}

/* ---------------- Ducking ---------------- */

/*
   Drops the music under a selection so the stinger and voice line
   stay audible, then brings it back. Without this the bed competes
   with the very thing it's meant to be under.

   Ducking starts with the stinger rather than the voice, so the
   music is already out of the way before either lands.
*/

let duckTimer = null;

function duck(){
  if (!musicEl) return;
  clearTimeout(duckTimer);
  ducked = true;
  fadeMusicTo(effective("music") * AUDIO.duck.level, AUDIO.duck.attackMs);
}

function unduck(){
  if (!musicEl) return;
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    ducked = false;
    fadeMusicTo(effective("music"), AUDIO.duck.releaseMs);
  }, AUDIO.duck.holdMs);
}

/* ---------------- Music ---------------- */

let musicEl = null;
let trackOrder = [];
let trackIndex = 0;
let fadeTimer = null;

function shuffled(list){
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function trackUrl(name){
  return fromRoot(`${AUDIO.music.dir}/${encodeURIComponent(name)}.${AUDIO.music.ext}`);
}

function nextTrack(){
  if (!musicEl || trackOrder.length === 0) return;

  musicEl.src = trackUrl(trackOrder[trackIndex]);
  trackIndex = (trackIndex + 1) % trackOrder.length;

  musicEl.play().catch(() => {
    // Autoplay blocked — startMusic() is called from a click, so
    // this normally only happens if the file is missing.
  });
}

/**
 * Start the music bed.
 *
 * Must be called from a user gesture (the Connect button) or the
 * browser will refuse to play. OBS browser sources don't enforce
 * this, but a normal tab does.
 */
export function startMusic(){
  if (!AUDIO.music.enabled || AUDIO.music.tracks.length === 0) return;
  if (musicEl) return;   // already running

  trackOrder = AUDIO.music.shuffle
    ? shuffled(AUDIO.music.tracks)
    : [...AUDIO.music.tracks];
  trackIndex = 0;

  musicEl = new Audio();
  musicEl.volume = effective("music");

  // A single track loops natively — re-assigning src each time it
  // ends would reload the file and leave an audible gap.
  musicEl.loop = trackOrder.length === 1;

  // With more than one, the end of a track starts the next; the
  // list loops forever.
  musicEl.addEventListener("ended", nextTrack);
  musicEl.addEventListener("error", () => {
    // Skip a missing track rather than stalling the whole bed.
    if (trackOrder.length > 1) nextTrack();
  });

  nextTrack();
}

export function stopMusic(){
  if (!musicEl) return;
  clearTimeout(fadeTimer);
  try {
    musicEl.pause();
    musicEl.src = "";
  } catch (e){}
  musicEl = null;
}

export function isMusicPlaying(){
  return Boolean(musicEl && !musicEl.paused);
}

/** Ramp music volume over time instead of jumping. */
function fadeMusicTo(target, ms){
  if (!musicEl) return;
  clearTimeout(fadeTimer);

  const start = musicEl.volume;
  const delta = target - start;
  const steps = Math.max(1, Math.round(ms / 40));
  let step = 0;

  const tick = () => {
    if (!musicEl) return;
    step++;
    musicEl.volume = Math.max(0, Math.min(1, start + delta * (step / steps)));
    if (step < steps) fadeTimer = setTimeout(tick, 40);
  };

  tick();
}

/** Stop everything, e.g. when switching drafts. */
export function stopAllAudio(){
  stopSelectionAudio();
  stopMusic();
}