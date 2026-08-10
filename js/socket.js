/* ============================================================
   StatLocker draft socket.

   Knows nothing about the DOM. Connects, joins a draft, and
   hands parsed messages back through callbacks.
   ============================================================ */

import { WS_URL, RECONNECT_DELAY_MS } from "./config.js";

const SESSION_KEY = "dl_overlay_session_id";

/**
 * The server rejects joins without a browserSessionId, so we
 * generate one and keep it stable for this browser.
 */
function getBrowserSessionId(){
  let id = null;
  try { id = localStorage.getItem(SESSION_KEY); } catch (e) {}

  if (!id){
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const rand = Array.from({ length: 20 },
      () => chars[Math.floor(Math.random() * chars.length)]).join("");
    id = "sess_" + rand;
    try { localStorage.setItem(SESSION_KEY, id); } catch (e) {}
  }

  return id;
}

/**
 * Connect to a draft.
 *
 * @param {string} draftCode
 * @param {object} handlers
 * @param {(state:object)=>void} handlers.onDraftState
 * @param {(state:object)=>void} handlers.onTimer
 * @param {(msg:string, isError:boolean)=>void} handlers.onStatus
 * @returns {{ close: () => void }}
 */
export function connectToDraft(draftCode, handlers){
  let ws = null;
  let reconnectTimer = null;
  let closedByUs = false;

  const status = (msg, isError) => handlers.onStatus?.(msg, isError);

  function open(){
    status("Connecting…", false);
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      status(`Joining draft ${draftCode}…`, false);
      ws.send(JSON.stringify({
        type: "JOIN_DRAFT",
        draftCode,
        password: null,
        displayName: "Overlay",
        role: "SPECTATOR",
        browserSessionId: getBrowserSessionId()
      }));
    });

    ws.addEventListener("message", (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch (e) {
        return; // not JSON, ignore
      }

      if (msg.type === "DRAFT_STATE_UPDATE" && msg.draftState){
        handlers.onDraftState?.(msg.draftState);
      } else if (msg.type === "TIMER_UPDATE" && msg.timerState){
        handlers.onTimer?.(msg.timerState);
      } else if (msg.type === "ERROR" || msg.error){
        status("Server error: " + (msg.message || msg.error || "unknown"), true);
      }
    });

    ws.addEventListener("close", () => {
      if (closedByUs) return;
      status("Disconnected — reconnecting…", true);
      reconnectTimer = setTimeout(open, RECONNECT_DELAY_MS);
    });

    ws.addEventListener("error", () => {
      status("Connection error.", true);
    });
  }

  open();

  return {
    close(){
      closedByUs = true;
      clearTimeout(reconnectTimer);
      try { ws?.close(); } catch (e) {}
    }
  };
}