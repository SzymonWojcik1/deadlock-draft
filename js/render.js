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
  TEAM_LOGOS,
  fromRoot
} from "./config.js";

import { heroInfo } from "./heroes.js";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const el = (id) => document.getElementById(id);

/* ---------------- Helpers ---------------- */

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

/** Splits a draft's *completed* steps into per-side pick and ban lists. */
function groupSteps(draftState, amberTeamNumber){
  const bans  = { amber: [], sapphire: [] };
  const picks = { amber: [], sapphire: [] };

  for (const step of draftState.steps){
    if (!isCompleted(step)) continue;
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
  if (pending?.teamNumber !== undefined){
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

/**
 * Point a logo element at a URL, hiding it if it can't load.
 * The lobby's logo URLs aren't always reachable, and a broken
 * image icon on stream looks worse than no logo at all.
 */
function setLogo(imgEl, side, lobbyUrl){
  const override = TEAM_LOGOS[side];
  const url = override ? fromRoot(override) : lobbyUrl;

  if (!url){
    imgEl.hidden = true;
    return;
  }

  imgEl.onerror = () => { imgEl.hidden = true; };
  imgEl.onload  = () => { imgEl.hidden = false; };
  imgEl.src = url;
}

/* ---------------- Sections ---------------- */

function renderHeader(amberTeam, sapphireTeam, labels){
  el("stageLabel").textContent = (labels.stage || "").trim();

  el("teamAmberName").textContent    = teamLabel(labels.team1, amberTeam);
  el("teamSapphireName").textContent = teamLabel(labels.team2, sapphireTeam);

  setLogo(el("teamAmberLogo"),    "amber",    amberTeam.teamLogo);
  setLogo(el("teamSapphireLogo"), "sapphire", sapphireTeam.teamLogo);
}

function renderBans(container, steps, side, markNextSlot){
  container.innerHTML = "";

  for (let i = 0; i < BANS_PER_TEAM; i++){
    const step = steps[i];
    const slot = document.createElement("div");

    if (step){
      const hero = heroInfo(step.heroId);
      slot.className = "ban-slot";
      slot.innerHTML = `
        <div class="portrait-wrap">
          ${hero.image ? `<img src="${hero.image}" alt="${hero.name}" title="${hero.name}">` : ""}
        </div>
        <div class="ban-name">${hero.name}</div>
      `;
    } else {
      const isNext = markNextSlot && i === steps.length;
      slot.className = "ban-slot empty" + (isNext ? ` slot-active ${side}-active` : "");
      slot.innerHTML = `
        <div class="portrait-wrap"></div>
        <div class="ban-name">${isNext ? "Banning" : ""}</div>
      `;
    }

    container.appendChild(slot);
  }
}

function renderPicks(container, steps, side, markNextSlot){
  container.innerHTML = "";

  for (let i = 0; i < PICKS_PER_TEAM; i++){
    const step = steps[i];
    const card = document.createElement("div");

    if (step){
      const hero = heroInfo(step.heroId);
      card.className = `pick-card filled ${side}-side`;
      card.innerHTML = `
        <div class="pick-portrait">
          ${hero.image ? `<img src="${hero.image}" alt="${hero.name}">` : ""}
        </div>
        <div class="pick-info">
          <div class="hname">${hero.name}</div>
          <div class="horder">Pick ${i + 1}${step.wasRandom ? " · Random" : ""}</div>
        </div>
      `;
    } else {
      const isNext = markNextSlot && i === steps.length;
      card.className = "pick-card empty" + (isNext ? ` slot-active ${side}-active` : "");
      card.innerHTML = `
        <div class="pick-portrait"></div>
        <div class="pick-info">
          <div class="hname">${isNext ? "Picking" : "Open"}</div>
        </div>
      `;
    }

    container.appendChild(card);
  }
}

function renderTimer(draftState, timerState, amberTeam, sapphireTeam, labels){
  const ring  = el("sigilRing");
  const value = el("timerText");
  const phase = el("phaseText");

  const amberLabel    = teamLabel(labels.team1, amberTeam);
  const sapphireLabel = teamLabel(labels.team2, sapphireTeam);

  if (draftState.status === "COMPLETED"){
    value.textContent = "✓";
    phase.textContent = "Draft complete";
    ring.style.strokeDashoffset = 0;
    ring.classList.remove("sapphire-active");
    el("teamAmberTag").classList.remove("active-turn");
    el("teamSapphireTag").classList.remove("active-turn");
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

  el("teamAmberTag").classList.toggle("active-turn", isAmberActive);
  el("teamSapphireTag").classList.toggle("active-turn", !isAmberActive);
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

  renderHeader(amberTeam, sapphireTeam, labels);

  const { bans, picks } = groupSteps(draftState, amberTeam.teamNumber);
  const active   = activeSide(draftState, timerState, amberTeam.teamNumber);
  const nextType = nextSelectionType(draftState);

  renderBans(el("bansAmber"),    bans.amber,    "amber",
             active === "amber"    && nextType === "ban");
  renderBans(el("bansSapphire"), bans.sapphire, "sapphire",
             active === "sapphire" && nextType === "ban");

  renderPicks(el("picksAmber"),    picks.amber,    "amber",
              active === "amber"    && nextType === "pick");
  renderPicks(el("picksSapphire"), picks.sapphire, "sapphire",
              active === "sapphire" && nextType === "pick");

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