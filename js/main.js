/* ============================================================
   Entry point. Loads hero data, then wires the connect screen,
   the socket and the renderer together.
   ============================================================ */

import { loadHeroes } from "./heroes.js";
import { connectToDraft } from "./socket.js";
import { renderAll, renderTimerOnly, resetReveals } from "./render.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./config.js";

const LABELS_KEY = "dl_overlay_labels";

let draftState = null;
let timerState = null;
let connection = null;

/** Broadcaster overrides: blank means "use whatever the lobby says". */
let labels = { stage: "", team1: "", team2: "" };

const el = (id) => document.getElementById(id);

/**
 * The overlay is built at a fixed 1920x1080 so it matches the
 * design exactly. Scale it to fit whatever window it's in, which
 * keeps it usable both in a browser tab and as an OBS source at
 * any output resolution.
 */
function fitCanvas(){
  const scale = Math.min(
    window.innerWidth  / CANVAS_WIDTH,
    window.innerHeight / CANVAS_HEIGHT
  );
  document.documentElement.style.setProperty("--canvas-scale", scale);
}

function setStatus(message, isError){
  const node = el("statusMsg");
  node.textContent = message || "";
  node.className = "status" + (isError ? " err" : "");
}

function showOverlay(){
  el("setup").classList.add("hidden");
  el("overlay").classList.add("visible");
}

/* ---------------- Labels ---------------- */

function readLabelsFromForm(){
  return {
    stage: el("stageInput").value.trim(),
    team1: el("team1Input").value.trim(),
    team2: el("team2Input").value.trim()
  };
}

function writeLabelsToForm(values){
  el("stageInput").value = values.stage || "";
  el("team1Input").value = values.team1 || "";
  el("team2Input").value = values.team2 || "";
}

function saveLabels(values){
  try { localStorage.setItem(LABELS_KEY, JSON.stringify(values)); } catch (e) {}
}

function loadSavedLabels(){
  try {
    return JSON.parse(localStorage.getItem(LABELS_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

/* ---------------- Connection ---------------- */

function connect(code){
  connection?.close();

  // A different draft shares no step ids with the last one, but
  // reconnecting to the same one does — clear either way so the
  // first paint never replays selections that already happened.
  resetReveals();

  connection = connectToDraft(code, {
    onDraftState(state){
      draftState = state;
      showOverlay();
      renderAll(draftState, timerState, labels);
    },
    onTimer(state){
      timerState = state;
      // Timer ticks ~1/sec; repaint only the clock, not the whole board.
      renderTimerOnly(draftState, timerState, labels);
    },
    onStatus: setStatus
  });
}

/* ---------------- Startup ---------------- */

async function init(){
  fitCanvas();
  window.addEventListener("resize", fitCanvas);

  // Hero art can't resolve without the table, so load it first.
  try {
    await loadHeroes();
  } catch (err){
    console.error(err);
    setStatus("Could not load data/heroes.json — are you serving over http?", true);
    return;
  }

  // Restore whatever was typed last time, so a reload doesn't lose it.
  writeLabelsToForm(loadSavedLabels());

  // URL params let an OBS browser source start with nothing to click:
  //   ?code=HF5AMBAH&stage=Quarter-final&team1=Hidden+King&team2=Archmother
  const params = new URLSearchParams(location.search);
  const codeFromUrl = params.get("code");

  const urlLabels = {
    stage: params.get("stage"),
    team1: params.get("team1"),
    team2: params.get("team2")
  };

  for (const [key, value] of Object.entries(urlLabels)){
    if (value !== null) el(`${key}Input`).value = value;
  }

  el("connectBtn").addEventListener("click", () => {
    const code = el("codeInput").value.trim().toUpperCase();
    if (!code){
      setStatus("Enter a draft code first.", true);
      return;
    }

    labels = readLabelsFromForm();
    saveLabels(labels);
    connect(code);
  });

  // Enter submits from any field.
  for (const id of ["codeInput", "stageInput", "team1Input", "team2Input"]){
    el(id).addEventListener("keydown", (e) => {
      if (e.key === "Enter") el("connectBtn").click();
    });
  }

  if (codeFromUrl){
    const code = codeFromUrl.toUpperCase();
    el("codeInput").value = code;
    labels = readLabelsFromForm();
    saveLabels(labels);
    connect(code);
  }
}

document.addEventListener("DOMContentLoaded", init);