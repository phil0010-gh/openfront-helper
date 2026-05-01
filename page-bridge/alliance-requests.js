// Alliance requests panel - separates alliance requests from main chat
// Shows pending alliance requests and allows renewing alliances

const ALLIANCE_REQUESTS_PANEL_ID = "openfront-helper-alliance-requests-panel";
const ALLIANCE_REQUESTS_STYLE_ID = "openfront-helper-alliance-requests-styles";

let allianceRequestsPanel = null;
let allianceRequestsEnabled = false;
let allianceRequestsData = [];
let myPlayer = null;
let game = null;

// Get translation function from global scope
const i18n = globalThis.OpenFrontHelperI18n;
const translations = i18n?.DEFAULT_TRANSLATIONS || {};

function t(key) {
  return i18n?.getMessage(translations, key) || key;
}

// Helper function to escape CSS identifiers
function escapeCssIdentifier(value) {
  if (globalThis.CSS?.escape) {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

// Helper function to get player marker ID
function getPlayerMarkerId(player, fallbackIndex = 0) {
  try {
    const id = player?.id?.();
    if (Number.isFinite(id)) {
      return `p${id}`;
    }
  } catch (_error) {
    // Ignore
  }
  return `p${fallbackIndex}`;
}

// Cache for player info overlay element
let _cachedInfoOverlayEl = null;

// Helper function to get hovered player info overlay
function getHoveredPlayerInfoOverlay() {
  if (!_cachedInfoOverlayEl?.isConnected) {
    _cachedInfoOverlayEl = document.querySelector("player-info-overlay") ?? null;
  }
  const overlay = _cachedInfoOverlayEl;
  if (!overlay?.player) {
    return null;
  }

  const visible = overlay._isInfoVisible ?? overlay.isInfoVisible;
  if (visible === false) {
    return null;
  }

  return overlay;
}

function ensureAllianceRequestsStyles() {
  if (document.getElementById(ALLIANCE_REQUESTS_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = ALLIANCE_REQUESTS_STYLE_ID;
  style.textContent = `
    #${ALLIANCE_REQUESTS_PANEL_ID} {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2147483647;
      width: 300px;
      max-height: 500px;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      overflow: hidden;
      border: 1px solid rgba(134, 239, 172, 0.34);
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(34, 197, 94, 0.16), transparent 44%),
        rgba(7, 24, 22, 0.94);
      color: #f3f4f6;
      font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
      box-shadow:
        0 18px 46px rgba(0, 0, 0, 0.42),
        inset 0 1px 0 rgba(187, 247, 208, 0.1);
      user-select: none;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px;
      border-bottom: 1px solid rgba(134, 239, 172, 0.16);
      cursor: move;
      background: rgba(5, 46, 22, 0.4);
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-title {
      margin: 0;
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-title::before {
      content: "🤝";
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-close {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border: 1px solid rgba(248, 113, 113, 0.34);
      border-radius: 8px;
      background: rgba(69, 10, 10, 0.68);
      color: #fecaca;
      cursor: pointer;
      font-size: 14px;
      font-weight: 900;
      line-height: 1;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-body {
      display: grid;
      gap: 8px;
      min-height: 0;
      overflow: auto;
      padding: 10px;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-empty {
      display: grid;
      place-items: center;
      min-height: 100px;
      color: rgba(203, 213, 225, 0.78);
      font-size: 12px;
      text-align: center;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 10px;
      border: 1px solid rgba(151, 181, 214, 0.16);
      border-radius: 8px;
      background: rgba(8, 31, 28, 0.76);
      transition: all 120ms ease;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request:hover {
      border-color: rgba(74, 222, 128, 0.38);
      background: rgba(12, 43, 35, 0.88);
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(34, 197, 94, 0.1);
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(10, 22, 36, 0.74);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #cbd5e1;
      font-weight: 900;
      font-size: 10px;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-info {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-name {
      color: #f3f4f6;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-time {
      color: rgba(203, 213, 225, 0.78);
      font-size: 10px;
      line-height: 1.25;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-actions {
      display: flex;
      gap: 6px;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn {
      min-width: 60px;
      border: 1px solid rgba(151, 181, 214, 0.24);
      border-radius: 999px;
      background: rgba(10, 22, 36, 0.74);
      color: #cbd5e1;
      padding: 6px 10px;
      font: inherit;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 120ms ease;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(74, 222, 128, 0.38);
      background: rgba(12, 43, 35, 0.88);
      color: #f3f4f6;
      box-shadow: 0 8px 18px rgba(34, 197, 94, 0.1);
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn.accept {
      border-color: rgba(74, 222, 128, 0.58);
      background:
        radial-gradient(circle at 35% 28%, rgba(220, 252, 231, 0.3), transparent 34%),
        linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(22, 163, 74, 0.92));
      color: #052e16;
      box-shadow:
        0 0 0 3px rgba(74, 222, 128, 0.12),
        0 0 14px rgba(34, 197, 94, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn.reject {
      border-color: rgba(248, 113, 113, 0.58);
      background:
        radial-gradient(circle at 35% 28%, rgba(252, 231, 231, 0.3), transparent 34%),
        linear-gradient(135deg, rgba(248, 113, 113, 0.9), rgba(163, 22, 22, 0.92));
      color: #2e0505;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn.renew {
      border-color: rgba(139, 92, 246, 0.58);
      background:
        radial-gradient(circle at 35% 28%, rgba(233, 213, 255, 0.3), transparent 34%),
        linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(92, 28, 246, 0.92));
      color: #1e0a3c;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-request-btn:disabled:hover {
      transform: none;
      border-color: rgba(151, 181, 214, 0.24);
      background: rgba(10, 22, 36, 0.74);
      color: #cbd5e1;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-divider {
      height: 1px;
      background: rgba(134, 239, 172, 0.14);
      margin: 4px 0;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-section-title {
      color: rgba(187, 247, 208, 0.74);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-resize {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12px;
      border-top: 1px solid rgba(134, 239, 172, 0.14);
      background: rgba(7, 24, 22, 0.78);
      cursor: ns-resize;
      touch-action: none;
    }

    #${ALLIANCE_REQUESTS_PANEL_ID} .openfront-helper-alliance-requests-resize::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 4px;
      width: 42px;
      height: 3px;
      border-radius: 999px;
      background: rgba(187, 247, 208, 0.48);
      transform: translateX(-50%);
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function createAllianceRequestsPanel() {
  ensureAllianceRequestsStyles();

  const panel = document.createElement("div");
  panel.id = ALLIANCE_REQUESTS_PANEL_ID;
  panel.innerHTML = `
    <div class="openfront-helper-alliance-requests-header">
      <h3 class="openfront-helper-alliance-requests-title">${t("Alliance Requests")}</h3>
      <button class="openfront-helper-alliance-requests-close" type="button" aria-label="${t("Close alliance requests panel")}">x</button>
    </div>
    <div class="openfront-helper-alliance-requests-body"></div>
    <div class="openfront-helper-alliance-requests-resize" role="separator" aria-orientation="vertical" aria-label="${t("Resize alliance requests panel")}"></div>
  `;

  return panel;
}

function updateAllianceRequestsPanel() {
  if (!allianceRequestsPanel) return;

  const body = allianceRequestsPanel.querySelector(".openfront-helper-alliance-requests-body");
  if (!body) return;

  // Get current alliance requests and active alliances
  const requests = getAllianceRequests();
  const alliances = getActiveAlliances();

  // Clear existing content
  body.innerHTML = "";

  // Add pending requests section
  if (requests.length > 0) {
    const requestsTitle = document.createElement("p");
    requestsTitle.className = "openfront-helper-alliance-requests-section-title";
    requestsTitle.textContent = t("Pending Requests");
    body.appendChild(requestsTitle);

    for (const request of requests) {
      const requestElement = createAllianceRequestElement(request, "pending");
      body.appendChild(requestElement);
    }

    // Add divider if we also have active alliances
    if (alliances.length > 0) {
      const divider = document.createElement("div");
      divider.className = "openfront-helper-alliance-divider";
      body.appendChild(divider);
    }
  }

  // Add active alliances section
  if (alliances.length > 0) {
    const alliancesTitle = document.createElement("p");
    alliancesTitle.className = "openfront-helper-alliance-requests-section-title";
    alliancesTitle.textContent = t("Active Alliances");
    body.appendChild(alliancesTitle);

    for (const alliance of alliances) {
      const allianceElement = createAllianceRequestElement(alliance, "active");
      body.appendChild(allianceElement);
    }
  }

  // Show empty state if no requests or alliances
  if (requests.length === 0 && alliances.length === 0) {
    const empty = document.createElement("div");
    empty.className = "openfront-helper-alliance-requests-empty";
    empty.textContent = t("No alliance requests or active alliances");
    body.appendChild(empty);
  }
}

function createAllianceRequestElement(data, type) {
  const element = document.createElement("div");
  element.className = "openfront-helper-alliance-request";

  // Extract player info
  const playerName = data.name || t("Unknown Player");
  const playerId = data.id || 0;
  const expiresAt = data.expiresAt || 0;
  const isIncoming = data.isIncoming || false;

  // Create avatar with first letter
  const avatar = document.createElement("div");
  avatar.className = "openfront-helper-alliance-request-avatar";
  avatar.textContent = playerName.charAt(0).toUpperCase();

  // Create info section
  const info = document.createElement("div");
  info.className = "openfront-helper-alliance-request-info";

  const name = document.createElement("div");
  name.className = "openfront-helper-alliance-request-name";
  name.textContent = playerName;

  const time = document.createElement("div");
  time.className = "openfront-helper-alliance-request-time";

  if (type === "pending") {
    time.textContent = isIncoming ? t("Wants to ally with you") : t("Request sent");
  } else if (type === "active" && expiresAt > 0) {
    const remaining = formatAllianceDuration((expiresAt - (game?.ticks?.() || 0)) / 10);
    time.textContent = `${remaining} ${t("remaining")}`;
  }

  info.appendChild(name);
  info.appendChild(time);

  // Create actions section
  const actions = document.createElement("div");
  actions.className = "openfront-helper-alliance-request-actions";

  if (type === "pending") {
    if (isIncoming) {
      // Incoming request - show accept/reject
      const acceptBtn = document.createElement("button");
      acceptBtn.className = "openfront-helper-alliance-request-btn accept";
      acceptBtn.textContent = t("Accept");
      acceptBtn.addEventListener("click", () => handleAllianceAction(playerId, "accept"));
      actions.appendChild(acceptBtn);

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "openfront-helper-alliance-request-btn reject";
      rejectBtn.textContent = t("Reject");
      rejectBtn.addEventListener("click", () => handleAllianceAction(playerId, "reject"));
      actions.appendChild(rejectBtn);
    } else {
      // Outgoing request - show cancel
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "openfront-helper-alliance-request-btn reject";
      cancelBtn.textContent = t("Cancel");
      cancelBtn.addEventListener("click", () => handleAllianceAction(playerId, "cancel"));
      actions.appendChild(cancelBtn);
    }
  } else if (type === "active") {
    // Active alliance - show renew option if expiring soon
    const renewBtn = document.createElement("button");
    renewBtn.className = "openfront-helper-alliance-request-btn renew";
    renewBtn.textContent = t("Renew");
    renewBtn.addEventListener("click", () => handleAllianceAction(playerId, "renew"));
    actions.appendChild(renewBtn);
  }

  element.appendChild(avatar);
  element.appendChild(info);
  element.appendChild(actions);

  return element;
}

function getAllianceRequests() {
  // Get pending alliance requests from the game
  const requests = [];

  if (!myPlayer || !game) return requests;

  try {
    // Get incoming alliance requests
    const incomingRequests = myPlayer.allianceRequests?.() || [];
    for (const request of incomingRequests) {
      const requester = game.playerViews?.()?.find(p => p.id?.() === request);
      if (requester) {
        requests.push({
          id: requester.id?.(),
          name: requester.name?.(),
          isIncoming: true,
          type: "pending"
        });
      }
    }

    // Get outgoing alliance requests (sent by us)
    const outgoingRequests = myPlayer.pendingAllianceRequests?.() || [];
    for (const request of outgoingRequests) {
      const target = game.playerViews?.()?.find(p => p.id?.() === request);
      if (target) {
        requests.push({
          id: target.id?.(),
          name: target.name?.(),
          isIncoming: false,
          type: "pending"
        });
      }
    }
  } catch (error) {
    console.error("Error getting alliance requests:", error);
  }

  return requests;
}

function getActiveAlliances() {
  const alliances = [];

  if (!myPlayer || !game) return alliances;

  try {
    const playerAlliances = myPlayer.alliances?.() || [];
    for (const alliance of playerAlliances) {
      const otherPlayer = game.playerViews?.()?.find(p => p.id?.() === alliance.other);
      if (otherPlayer) {
        alliances.push({
          id: otherPlayer.id?.(),
          name: otherPlayer.name?.(),
          expiresAt: alliance.expiresAt,
          type: "active"
        });
      }
    }
  } catch (error) {
    console.error("Error getting active alliances:", error);
  }

  return alliances;
}

function formatAllianceDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

function handleAllianceAction(playerId, action) {
  if (!myPlayer || !game) return;

  try {
    switch (action) {
      case "accept":
        // Accept incoming alliance request
        const incomingRequest = myPlayer.allianceRequests?.()?.find(r => r === playerId);
        if (incomingRequest) {
          myPlayer.acceptAllianceRequest(playerId);
        }
        break;

      case "reject":
        // Reject incoming alliance request
        myPlayer.rejectAllianceRequest(playerId);
        break;

      case "cancel":
        // Cancel outgoing alliance request
        myPlayer.cancelAllianceRequest(playerId);
        break;

      case "renew":
        // Renew alliance
        myPlayer.createAllianceRequest(playerId);
        break;
    }

    // Refresh the panel after action
    setTimeout(() => updateAllianceRequestsPanel(), 500);
  } catch (error) {
    console.error("Error handling alliance action:", error);
  }
}

function installAllianceRequestsDrag(panel) {
  const header = panel.querySelector(".openfront-helper-alliance-requests-header");
  if (!(header instanceof HTMLElement)) {
    return;
  }

  let dragState = null;
  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target instanceof HTMLButtonElement) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  header.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
    const left = Math.max(8, Math.min(maxLeft, event.clientX - dragState.offsetX));
    const top = Math.max(8, Math.min(maxTop, event.clientY - dragState.offsetY));
    
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = "auto";
    panel.style.transform = "none";
  });

  function finishDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragState = null;
  }

  header.addEventListener("pointerup", finishDrag);
  header.addEventListener("pointercancel", finishDrag);
}

function installAllianceRequestsResize(panel) {
  const handle = panel.querySelector(".openfront-helper-alliance-requests-resize");
  if (!(handle instanceof HTMLElement)) {
    return;
  }

  let resizeState = null;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    resizeState = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: panel.getBoundingClientRect().height,
    };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    const nextHeight = resizeState.startHeight + resizeState.startY - event.clientY;
    const maxHeight = window.innerHeight - panel.getBoundingClientRect().top - 8;
    const clampedHeight = Math.max(150, Math.min(maxHeight, nextHeight));
    panel.style.height = `${Math.round(clampedHeight)}px`;
  });

  function finishResize(event) {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }
    resizeState = null;
  }

  handle.addEventListener("pointerup", finishResize);
  handle.addEventListener("pointercancel", finishResize);
}

function setAllianceRequestsEnabled(enabled) {
  allianceRequestsEnabled = Boolean(enabled);
  
  if (!allianceRequestsEnabled) {
    allianceRequestsPanel?.remove();
    allianceRequestsPanel = null;
    return;
  }

  if (!allianceRequestsPanel) {
    allianceRequestsPanel = createAllianceRequestsPanel();
    (document.body || document.documentElement).appendChild(allianceRequestsPanel);
    
    // Install drag and resize
    installAllianceRequestsDrag(allianceRequestsPanel);
    installAllianceRequestsResize(allianceRequestsPanel);
    
    // Close button handler
    const closeBtn = allianceRequestsPanel.querySelector(".openfront-helper-alliance-requests-close");
    closeBtn?.addEventListener("click", () => {
      setAllianceRequestsEnabled(false);
    });
  }

  updateAllianceRequestsPanel();
}

function updateAllianceRequests() {
  if (!allianceRequestsEnabled || !allianceRequestsPanel) return;
  updateAllianceRequestsPanel();
}

// Sync with game state
function syncAllianceRequestsPanel() {
  if (!allianceRequestsEnabled) return;

  // Get current game and player references
  try {
    const gameObj = window.game || window.OpenFront?.game;
    const myPlayerObj = gameObj?.players?.()?.find(p => p.isMe?.());
    
    if (gameObj && myPlayerObj) {
      game = gameObj;
      myPlayer = myPlayerObj;
    }
  } catch (error) {
    console.error("Error syncing alliance requests:", error);
  }

  updateAllianceRequests();

  // Schedule next update
  if (allianceRequestsEnabled) {
    setTimeout(syncAllianceRequestsPanel, 2000);
  }
}

// Message handler for enabling/disabling the panel
window.addEventListener("message", (event) => {
  if (event.data?.source !== "openfront-autojoin-extension" || !event.data?.type) {
    return;
  }

  switch (event.data.type) {
    case "SET_ALLIANCE_REQUESTS_PANEL":
      setAllianceRequestsEnabled(Boolean(event.data.payload?.enabled));
      break;
  }
});

// Start syncing if panel is enabled
if (allianceRequestsEnabled) {
  syncAllianceRequestsPanel();
}
