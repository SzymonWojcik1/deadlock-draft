/* ============================================================
   Big centre-stage reveal.

   Owns the sequence that plays when a hero is picked or banned.
   Knows nothing about draft state — it's handed a hero and told
   which kind of reveal to play, and calls back when it's done so
   the caller can release the card into the row.

   Timings come from CSS custom properties so the animation and
   the JS that waits on it can't drift apart.
   ============================================================ */

import { REVEAL_ASSET } from "./config.js";
import { heroInfo } from "./heroes.js";
import { playSelectionAudio, stopSelectionAudio } from "./audio.js";

const el = (id) => document.getElementById(id);

/** Read a CSS time token ("0.55s" / "550ms") as milliseconds. */
function cssTime(name, fallback){
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  if (!raw) return fallback;
  if (raw.endsWith("ms")) return parseFloat(raw);
  if (raw.endsWith("s"))  return parseFloat(raw) * 1000;
  return fallback;
}

/* ---------------- Sequence ---------------- */

let activeTimers = [];

function later(fn, ms){
  activeTimers.push(setTimeout(fn, ms));
}

function clearTimers(){
  for (const t of activeTimers) clearTimeout(t);
  activeTimers = [];
}

/**
 * Play the reveal for one selection.
 *
 * @param {object} step    the draft step being revealed
 * @param {string} kind    "pick" or "ban"
 * @param {string} side    "amber" or "sapphire"
 * @param {Function} onDone called once the stage is clear
 */
export function playReveal(step, kind, side, onDone){
  const stage = el("revealStage");
  const scrim = el("revealScrim");
  if (!stage){ onDone?.(); return; }

  const hero = heroInfo(step.heroId, REVEAL_ASSET);

  const inMs   = cssTime("--reveal-in",   550);
  const holdMs = cssTime("--reveal-hold", 1300);
  const outMs  = cssTime("--reveal-out",  450);

  clearTimers();
  stage.innerHTML = "";

  const card = document.createElement("div");
  card.className = `reveal-card ${kind} ${side}-side entering`;

  const glow = document.createElement("div");
  glow.className = "reveal-glow";
  card.appendChild(glow);

  if (hero.image){
    const art = document.createElement("img");
    art.className = "reveal-art";
    art.src = hero.image;
    art.alt = hero.name;
    art.onerror = () => art.remove();
    card.appendChild(art);
  }

  if (kind === "ban"){
    const strike = document.createElement("div");
    strike.className = "reveal-strike";
    card.appendChild(strike);
  }

  stage.appendChild(card);
  scrim?.classList.add("on");

  // Stinger first, then the hero's line just behind it.
  playSelectionAudio(hero.slug, kind);

  // A ban is struck partway through the hold, so the hero reads
  // clearly before being shaken and drained of colour.
  if (kind === "ban"){
    later(() => card.classList.add("struck"), inMs + 180);
  }

  later(() => {
    card.classList.remove("entering");
    card.classList.add("leaving");
    scrim?.classList.remove("on");
  }, inMs + holdMs);

  later(() => {
    stage.innerHTML = "";
    onDone?.();
  }, inMs + holdMs + outMs);
}

/** Total wall time of one reveal, in ms. Useful for pacing. */
export function revealDuration(){
  return cssTime("--reveal-in", 550)
       + cssTime("--reveal-hold", 1300)
       + cssTime("--reveal-out", 450);
}

/** Abort anything in flight and clear the stage. */
export function cancelReveal(){
  clearTimers();
  stopSelectionAudio();
  const stage = el("revealStage");
  const scrim = el("revealScrim");
  if (stage) stage.innerHTML = "";
  scrim?.classList.remove("on");
}