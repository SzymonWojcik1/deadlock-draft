/* ============================================================
   Entry point. Loads hero data, then wires the connect screen,
   the socket and the renderer together.
   ============================================================ */

import { loadHeroes } from "./heroes.js";
import { connectToDraft } from "./socket.js";
import { renderAll, renderTimerOnly } from "./render.js";

let draftState = null;
let timerState = null;
let connection = null;

const el = (id) => document.getElementById(id);

function setStatus(message, isError){
  const node = el("statusMsg");
  node.textContent = message || "";
  node.className = "status" + (isError ? " err" : "");
}

function showOverlay(){
  el("setup").classList.add("hidden");
  el("overlay").classList.add("visible");
}

function connect(code){
  connection?.close();

  connection = connectToDraft(code, {
    onDraftState(state){
      draftState = state;
      showOverlay();
      renderAll(draftState, timerState);
    },
    onTimer(state){
      timerState = state;
      // Timer ticks ~1/sec; repaint only the clock, not the whole board.
      renderTimerOnly(draftState, timerState);
    },
    onStatus: setStatus
  });
}

async function init(){
  // Hero art can't resolve without the table, so load it first.
  try {
    await loadHeroes();
  } catch (err){
    console.error(err);
    setStatus("Could not load data/heroes.json — are you serving over http?", true);
    return;
  }

  // ?code=XXXX lets an OBS browser source connect with nothing to click.
  const codeFromUrl = new URLSearchParams(location.search).get("code");

  el("connectBtn").addEventListener("click", () => {
    const code = el("codeInput").value.trim().toUpperCase();
    if (code) connect(code);
  });

  el("codeInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") el("connectBtn").click();
  });

  if (codeFromUrl){
    const code = codeFromUrl.toUpperCase();
    el("codeInput").value = code;
    connect(code);
  }
}

document.addEventListener("DOMContentLoaded", init);