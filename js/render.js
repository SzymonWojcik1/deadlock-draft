/* ============================================================
   Rendering.

   Takes draft + timer state and paints the DOM. Stateless:
   every call redraws from scratch, so it doesn't matter whether
   you joined at step 0 or step 12.

   `labels` lets the broadcaster override what the lobby reports:
     { stage, team1, team2 }
   Any field left blank falls back to the lobby's own value.
   ============================================================ */

import {
  PICKS_PER_TEAM,
  BANS_PER_TEAM,
  STEP_TYPE_ORDER,
  STEP_TIME_SECONDS,
  RESERVE_TIME_SECONDS,
  PICK_ASSET,
  BAN_ASSET,
  NAME_ASSET
} from "./config.js";

import { heroInfo } from "./heroes.js";
import { playReveal, cancelReveal } from "./reveal.js";

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const el = (id) => document.getElementById(id);

/* ---------------- Draft state helpers ---------------- */

/**
 * A step only counts as made once it has a heroId.
 *
 * The lobby includes the in-progress selection in `steps` before
 * anything has been chosen, so without this check that pending
 * entry renders as a completed pick reading "Hero #undefined".
 */
function isCompleted(step){
  return step.heroId !== null && step.heroId !== undefined;
}

/**
 * Splits a draft's *completed* steps into per-side pick and ban lists.
 *
 * Steps still queued for their big reveal are left out, so the row
 * doesn't show the hero before the reveal does.
 */
function groupSteps(draftState, amberTeamNumber){
  const bans  = { amber: [], sapphire: [] };
  const picks = { amber: [], sapphire: [] };

  for (const step of draftState.steps){
    if (!isCompleted(step)) continue;
    if (queuedStepIds.has(step.id)) continue;
    const side = step.teamNumber === amberTeamNumber ? "amber" : "sapphire";
    (step.selectionType === "ban" ? bans : picks)[side].push(step);
  }

  return { bans, picks };
}

/** The selection currently being made, if the lobby exposes one. */
function pendingStep(draftState){
  return draftState.steps.find(step => !isCompleted(step)) || null;
}

/**
 * What kind of selection comes next: "pick" or "ban".
 * Prefers the lobby's own pending step; falls back to the
 * standard order if it doesn't send one.
 */
function nextSelectionType(draftState){
  const pending = pendingStep(draftState);
  if (pending?.selectionType) return pending.selectionType;

  const done = draftState.steps.filter(isCompleted).length;
  return STEP_TYPE_ORDER[done] || "pick";
}

/** Which side is on the clock, or null if nobody is. */
function activeSide(draftState, timerState, amberTeamNumber){
  if (draftState.status === "COMPLETED") return null;

  // The pending step names the team directly — more reliable
  // than inferring it from the timer.
  const pending = pendingStep(draftState);
  if (pending?.teamNumber !== undefined && pending?.teamNumber !== null){
    return pending.teamNumber === amberTeamNumber ? "amber" : "sapphire";
  }

  if (!timerState) return null;
  return timerState.activeTeam === amberTeamNumber ? "amber" : "sapphire";
}

/** Broadcaster override if set, otherwise the lobby's own name. */
function teamLabel(override, team){
  const custom = (override || "").trim();
  return custom || team.displayName || team.teamName || "";
}

/* ---------------- Cards ---------------- */

/* ---------------- Reveal sequencing ---------------- */

/*
   A selection goes through three stages:

     queued   → the lobby has reported it, but the big centre-stage
                reveal hasn't played yet. The card is withheld from
                its row so the hero isn't spoiled before the reveal.
     shown    → the reveal has finished. The card is released into
                the row and wipes in.
     settled  → nothing further; it just renders.

   Selections are revealed one at a time. If two land close together
   the second waits its turn rather than talking over the first.

   The board is rebuilt on every DRAFT_STATE_UPDATE, so all of this
   is keyed off step ids — otherwise every card would replay its
   animation on every update.
*/

const shownStepIds  = new Set();  // reveal done, safe to render
const queuedStepIds = new Set();  // awaiting reveal, hidden from rows
const pendingCardIn = new Set();  // released this tick, animate the wipe

let revealQueue = [];
let revealPlaying = false;
let hasPainted = false;
let repaint = null;               // set on each render so we can redraw

/** Work out which new selections need revealing, and start the queue. */
function intakeSteps(draftState, amberTeamNumber){
  const completed = draftState.steps.filter(isCompleted);

  // First paint: adopt whatever already happened without replaying it.
  if (!hasPainted){
    for (const step of completed) shownStepIds.add(step.id);
    hasPainted = true;
    return;
  }

  for (const step of completed){
    if (shownStepIds.has(step.id) || queuedStepIds.has(step.id)) continue;

    queuedStepIds.add(step.id);
    revealQueue.push({
      step,
      kind: step.selectionType === "ban" ? "ban" : "pick",
      side: step.teamNumber === amberTeamNumber ? "amber" : "sapphire"
    });
  }

  advanceQueue();
}

function advanceQueue(){
  if (revealPlaying || revealQueue.length === 0) return;

  const item = revealQueue.shift();
  revealPlaying = true;

  playReveal(item.step, item.kind, item.side, () => {
    queuedStepIds.delete(item.step.id);
    shownStepIds.add(item.step.id);
    pendingCardIn.add(item.step.id);
    revealPlaying = false;

    // Redraw so the card appears and wipes in, then carry on.
    repaint?.();
    advanceQueue();
  });
}

/** Forget everything, e.g. when connecting to another draft. */
export function resetReveals(){
  cancelReveal();
  shownStepIds.clear();
  queuedStepIds.clear();
  pendingCardIn.clear();
  revealQueue = [];
  revealPlaying = false;
  hasPainted = false;
}

/* ---------------- Cards ---------------- */

/**
 * Build one card.
 *
 * Filled cards composite two images: the artwork filling the card,
 * and the hero's name artwork over the lower portion. If the name
 * SVG is missing the card falls back to rendered text, so a gap in
 * the assets never leaves a card unlabelled.
 */
function buildCard(step, kind, side, isWaiting, animate){
  const card = document.createElement("div");
  const classes = ["card", kind, side + "-side"];

  if (!step){
    classes.push("empty");
    if (isWaiting) classes.push("waiting");
    card.className = classes.join(" ");
    return card;
  }

  const artType = kind === "ban" ? BAN_ASSET : PICK_ASSET;
  const hero = heroInfo(step.heroId, artType);
  const nameArt = heroInfo(step.heroId, NAME_ASSET);

  classes.push("filled");
  if (animate) classes.push("revealing");
  card.className = classes.join(" ");
  card.title = hero.name;

  if (hero.image){
    const art = document.createElement("img");
    art.className = "card-art";
    art.src = hero.image;
    art.alt = hero.name;
    // A missing art file shouldn't leave a broken-image icon on stream.
    art.onerror = () => art.remove();
    card.appendChild(art);
  }

  if (nameArt.image){
    const name = document.createElement("img");
    name.className = "card-name";
    name.src = nameArt.image;
    name.alt = hero.name;
    name.onerror = () => {
      name.replaceWith(textName(hero.name));
    };
    card.appendChild(name);
  } else if (hero.name){
    card.appendChild(textName(hero.name));
  }

  if (animate){
    // Band of light that rides the leading edge of the wipe.
    // Removed once it's done so it can't linger over the art.
    const sweep = document.createElement("div");
    sweep.className = "card-sweep";
    sweep.addEventListener("animationend", () => sweep.remove());
    card.appendChild(sweep);
  }

  return card;
}

function textName(text){
  const node = document.createElement("div");
  node.className = "card-name-text";
  node.textContent = text;
  return node;
}

/**
 * Fill a row with cards.
 *
 * `mirrored` reverses the visual order so the sapphire side reads
 * outward from the centre, matching the amber side's mirror image.
 */
function renderRow(container, steps, kind, side, count, markWaiting, mirrored, reveal){
  container.innerHTML = "";

  const cards = [];
  for (let i = 0; i < count; i++){
    const step = steps[i];
    const isWaiting = markWaiting && i === steps.length;
    const animate = Boolean(step && reveal?.has(step.id));
    cards.push(buildCard(step, kind, side, isWaiting, animate));
  }

  if (mirrored) cards.reverse();
  for (const card of cards) container.appendChild(card);
}

/* ---------------- Sections ---------------- */

function renderHeader(amberTeam, sapphireTeam, labels){
  el("stageLabel").textContent = (labels.stage || "").trim();
  el("teamAmberName").textContent    = teamLabel(labels.team1, amberTeam);
  el("teamSapphireName").textContent = teamLabel(labels.team2, sapphireTeam);
}

function renderTimer(draftState, timerState, amberTeam, sapphireTeam, labels){
  const ring  = el("timerRing");
  const value = el("timerValue");
  const phase = el("timerPhase");

  const amberLabel    = teamLabel(labels.team1, amberTeam);
  const sapphireLabel = teamLabel(labels.team2, sapphireTeam);

  if (draftState.status === "COMPLETED"){
    value.textContent = "✓";
    phase.textContent = "Complete";
    ring.style.strokeDashoffset = 0;
    ring.classList.remove("sapphire-active");
    return;
  }

  if (!timerState){
    value.textContent = "--";
    phase.textContent = draftState.status
      ? draftState.status.replace(/_/g, " ")
      : "Waiting";
    return;
  }

  const isAmberActive = timerState.activeTeam === amberTeam.teamNumber;

  const stepTime = isAmberActive ? timerState.team1StepTimer    : timerState.team2StepTimer;
  const reserve  = isAmberActive ? timerState.team1ReserveTimer : timerState.team2ReserveTimer;

  // Fall back to the reserve clock once the per-step clock runs out.
  const onStepClock = stepTime > 0;
  const remaining   = onStepClock ? stepTime : reserve;
  const budget      = onStepClock ? STEP_TIME_SECONDS : RESERVE_TIME_SECONDS;

  value.textContent = remaining;
  ring.classList.toggle("sapphire-active", !isAmberActive);

  const fraction = Math.max(0, Math.min(1, remaining / budget));
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);

  const action = nextSelectionType(draftState) === "ban" ? "Ban" : "Pick";
  phase.textContent = `${action} · ${isAmberActive ? amberLabel : sapphireLabel}`;
}

/* ---------------- Entry points ---------------- */

/**
 * Repaint the whole overlay.
 * @param {object} draftState  latest DRAFT_STATE_UPDATE payload
 * @param {object|null} timerState latest TIMER_UPDATE payload
 * @param {object} [labels] { stage, team1, team2 } broadcaster overrides
 */
export function renderAll(draftState, timerState, labels = {}){
  if (!draftState) return;

  const amberTeam    = draftState.teams.find(t => t.isAmberTeam);
  const sapphireTeam = draftState.teams.find(t => !t.isAmberTeam);
  if (!amberTeam || !sapphireTeam) return;

  // Let the reveal queue redraw the board when a reveal finishes.
  repaint = () => renderAll(draftState, timerState, labels);

  intakeSteps(draftState, amberTeam.teamNumber);

  renderHeader(amberTeam, sapphireTeam, labels);

  const { bans, picks } = groupSteps(draftState, amberTeam.teamNumber);
  const active   = activeSide(draftState, timerState, amberTeam.teamNumber);
  const nextType = nextSelectionType(draftState);

  // Cards released by a finished reveal wipe in; consume the set so
  // they don't animate again on the next update.
  const reveal = new Set(pendingCardIn);
  pendingCardIn.clear();

  // While a reveal is playing the lobby has usually already moved on
  // to the next selection. Blinking that slot would point at a turn
  // the viewer hasn't been shown yet, so hold off until the stage is
  // clear.
  const showWaiting = queuedStepIds.size === 0;

  const banWaits  = { amber:    showWaiting && active === "amber"    && nextType === "ban",
                      sapphire: showWaiting && active === "sapphire" && nextType === "ban" };
  const pickWaits = { amber:    showWaiting && active === "amber"    && nextType === "pick",
                      sapphire: showWaiting && active === "sapphire" && nextType === "pick" };

  // Amber rows read outward-in; sapphire mirrors them.
  renderRow(el("bansAmber"), bans.amber, "ban", "amber",
            BANS_PER_TEAM, banWaits.amber, false, reveal);
  renderRow(el("bansSapphire"), bans.sapphire, "ban", "sapphire",
            BANS_PER_TEAM, banWaits.sapphire, true, reveal);

  renderRow(el("picksAmber"), picks.amber, "pick", "amber",
            PICKS_PER_TEAM, pickWaits.amber, false, reveal);
  renderRow(el("picksSapphire"), picks.sapphire, "pick", "sapphire",
            PICKS_PER_TEAM, pickWaits.sapphire, true, reveal);

  renderTimer(draftState, timerState, amberTeam, sapphireTeam, labels);
}

/** Timer-only repaint, for the once-a-second TIMER_UPDATE messages. */
export function renderTimerOnly(draftState, timerState, labels = {}){
  if (!draftState) return;
  const amberTeam    = draftState.teams.find(t => t.isAmberTeam);
  const sapphireTeam = draftState.teams.find(t => !t.isAmberTeam);
  if (!amberTeam || !sapphireTeam) return;
  renderTimer(draftState, timerState, amberTeam, sapphireTeam, labels);
}