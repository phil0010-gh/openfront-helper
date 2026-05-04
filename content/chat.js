// Extension chat widget backed by Supabase.

const OPENFRONT_CHAT_WIDGET_ID = "openfront-helper-chat-widget";
const OPENFRONT_CHAT_STYLE_ID = "openfront-helper-chat-styles";
const OPENFRONT_CHAT_USER_ID_KEY = "openfrontChatUserId";
const OPENFRONT_CHAT_DISPLAY_NAME_KEY = "openfrontChatDisplayName";
const OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY = "openfrontChatDisplayNameSource";
const OPENFRONT_CHAT_SETTINGS_KEY =
  globalThis.OpenFrontHelperSettings?.STORAGE_KEY || "settings";
const OPENFRONT_CHAT_POLL_MS = 2500;
const OPENFRONT_CHAT_MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const OPENFRONT_CHAT_CLEANUP_MS = 10 * 60 * 1000;
const OPENFRONT_CHAT_MAX_MESSAGE_LENGTH = 500;
const OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH = 32;
const OPENFRONT_CHAT_GLOBAL_ROOM_ID = "global";
const OPENFRONT_CHAT_LINK_PATTERN = /(https?:\/\/|www\.|[a-z0-9.-]+\.[a-z]{2,}(\/|\s|$))/i;

const openFrontChatConfig = globalThis.OpenFrontHelperChatConfig || {};
const openFrontChatState = {
  userId: "",
  displayName: "",
  defaultDisplayName: "",
  activeRoomType: "global",
  lobbyRoomId: null,
  widgetPosition: {
    left: null,
    top: null,
  },
  messagesById: new Map(),
  knownMessageIds: new Set(),
  knownMessageIdsByRoom: new Map(),
  dragState: null,
  suppressNextToggleClick: false,
  frontObserver: null,
  pollTimer: null,
  lastCleanupAt: 0,
  isCleaningUp: false,
  isOpen: false,
  isLoading: false,
  unreadCount: 0,
  enabled: true,
};

function chatT(key) {
  if (typeof t === "function") {
    return t(key);
  }
  return key;
}

function getChatRestUrl() {
  const supabaseUrl = String(openFrontChatConfig.supabaseUrl || "").replace(/\/+$/, "");
  return supabaseUrl ? `${supabaseUrl}/rest/v1/chat_messages` : "";
}

function isChatConfigured() {
  return Boolean(getChatRestUrl() && openFrontChatConfig.supabaseAnonKey);
}

function getChatSettings(rawSettings) {
  const settingsHelper = globalThis.OpenFrontHelperSettings;
  if (typeof settingsHelper?.normalizeSettings === "function") {
    return settingsHelper.normalizeSettings(rawSettings || {});
  }
  return {
    showExtensionChat: rawSettings?.showExtensionChat === true,
    chatWidgetPosition: rawSettings?.chatWidgetPosition || {},
  };
}

function normalizeChatWidgetPosition(value = {}) {
  const settingsHelper = globalThis.OpenFrontHelperSettings;
  if (typeof settingsHelper?.normalizeSettings === "function") {
    return settingsHelper.normalizeSettings({
      chatWidgetPosition: value,
    }).chatWidgetPosition;
  }

  const left = Number(value?.left);
  const top = Number(value?.top);
  return {
    left: Number.isFinite(left) ? left : null,
    top: Number.isFinite(top) ? top : null,
  };
}

function hasCustomChatWidgetPosition(position = {}) {
  return Number.isFinite(Number(position.left)) && Number.isFinite(Number(position.top));
}

function normalizeChatDisplayName(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH);
  return normalized || `Helper-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeOptionalChatDisplayName(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH);
  return normalized || "";
}

function isGeneratedChatDisplayName(value) {
  return /^Helper-\d{4}$/.test(String(value || "").trim());
}

function normalizeChatMessage(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPENFRONT_CHAT_MAX_MESSAGE_LENGTH);
}

function containsChatLink(value) {
  return OPENFRONT_CHAT_LINK_PATTERN.test(String(value || ""));
}

function getChatSendErrorStatus(error) {
  const message = String(error?.message || "");
  if (message.includes("Links are not allowed")) {
    return chatT("Links are not allowed in chat messages.");
  }
  if (message.includes("sending messages too quickly")) {
    return chatT("You are sending messages too quickly. Please wait a moment.");
  }
  return chatT("Message could not be sent.");
}

function isExtensionContextInvalidatedError(error) {
  return String(error?.message || error).includes("Extension context invalidated");
}

function getChatRoomId(roomType) {
  if (roomType === "global") {
    return OPENFRONT_CHAT_GLOBAL_ROOM_ID;
  }
  return openFrontChatState.lobbyRoomId;
}

function getCurrentChatRoomId() {
  return getChatRoomId(openFrontChatState.activeRoomType);
}

function getChatRoomKey(roomType, roomId) {
  return `${roomType}:${roomId}`;
}

function getChatRoomsToPoll() {
  const rooms = [
    {
      roomType: "global",
      roomId: OPENFRONT_CHAT_GLOBAL_ROOM_ID,
    },
  ];

  if (openFrontChatState.lobbyRoomId) {
    rooms.push({
      roomType: "lobby",
      roomId: openFrontChatState.lobbyRoomId,
    });
  }

  return rooms;
}

function createChatHeaders() {
  return {
    apikey: openFrontChatConfig.supabaseAnonKey,
    Authorization: `Bearer ${openFrontChatConfig.supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
}

function getChatMessageCutoffIso() {
  return new Date(Date.now() - OPENFRONT_CHAT_MESSAGE_TTL_MS).toISOString();
}

async function ensureChatIdentity() {
  if (openFrontChatState.userId && openFrontChatState.displayName) {
    return;
  }

  const stored = await chrome.storage.local.get([
    OPENFRONT_CHAT_USER_ID_KEY,
    OPENFRONT_CHAT_DISPLAY_NAME_KEY,
    OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY,
  ]);
  let userId = stored[OPENFRONT_CHAT_USER_ID_KEY];
  let displayName = stored[OPENFRONT_CHAT_DISPLAY_NAME_KEY];
  const displayNameSource = stored[OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY];
  const openFrontDisplayName = normalizeOptionalChatDisplayName(
    openFrontChatState.defaultDisplayName,
  );

  if (typeof userId !== "string" || !userId.trim()) {
    userId = crypto.randomUUID();
  }

  const shouldUseOpenFrontDefault =
    openFrontDisplayName &&
    (!displayName ||
      displayNameSource === "openfront" ||
      isGeneratedChatDisplayName(displayName));
  if (shouldUseOpenFrontDefault) {
    displayName = openFrontDisplayName;
  }
  displayName = normalizeChatDisplayName(displayName);

  openFrontChatState.userId = userId;
  openFrontChatState.displayName = displayName;
  await chrome.storage.local.set({
    [OPENFRONT_CHAT_USER_ID_KEY]: userId,
    [OPENFRONT_CHAT_DISPLAY_NAME_KEY]: displayName,
    [OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY]: shouldUseOpenFrontDefault
      ? "openfront"
      : "custom",
  });
}

async function applyOpenFrontDefaultDisplayName(defaultDisplayName) {
  const normalizedDefault = normalizeOptionalChatDisplayName(defaultDisplayName);
  if (!normalizedDefault) {
    return;
  }

  openFrontChatState.defaultDisplayName = normalizedDefault;
  const stored = await chrome.storage.local.get([
    OPENFRONT_CHAT_DISPLAY_NAME_KEY,
    OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY,
  ]);
  const storedDisplayName = stored[OPENFRONT_CHAT_DISPLAY_NAME_KEY];
  const storedSource = stored[OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY];
  const shouldApply =
    !storedDisplayName ||
    storedSource === "openfront" ||
    isGeneratedChatDisplayName(storedDisplayName);

  if (!shouldApply) {
    return;
  }

  openFrontChatState.displayName = normalizedDefault;
  await chrome.storage.local.set({
    [OPENFRONT_CHAT_DISPLAY_NAME_KEY]: normalizedDefault,
    [OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY]: "openfront",
  });

  const widget = document.getElementById(OPENFRONT_CHAT_WIDGET_ID);
  const nameInput = widget?.querySelector(".openfront-chat-name");
  if (nameInput instanceof HTMLInputElement) {
    nameInput.value = normalizedDefault;
  }
}

function applyOpenFrontDefaultDisplayNameFromBridge(defaultDisplayName) {
  applyOpenFrontDefaultDisplayName(defaultDisplayName).catch((error) => {
    console.error("Failed to apply OpenFront chat display name:", error);
  });
}

function getChatBridgeDisplayName(payload) {
  return typeof payload?.defaultDisplayName === "string"
    ? normalizeOptionalChatDisplayName(payload.defaultDisplayName)
    : "";
}

function ensureChatStyles() {
  if (document.getElementById(OPENFRONT_CHAT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = OPENFRONT_CHAT_STYLE_ID;
  style.textContent = `
    #${OPENFRONT_CHAT_WIDGET_ID} {
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 2147483647;
      color: #f8fafc;
      font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 36px;
      padding: 9px 13px;
      border: 1px solid rgba(34, 197, 94, 0.44);
      border-radius: 999px;
      background:
        linear-gradient(135deg, rgba(34, 197, 94, 0.24), transparent 52%),
        rgba(7, 24, 22, 0.96);
      color: #bbf7d0;
      cursor: pointer;
      touch-action: none;
      font-size: 12px;
      font-weight: 900;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.38);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 17px;
      height: 17px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      border: 2px solid rgba(7, 24, 22, 0.98);
      border-radius: 999px;
      background: linear-gradient(135deg, #fb7185, #ef4444);
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.24),
        0 0 16px rgba(248, 113, 113, 0.62);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-badge[hidden] {
      display: none;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-panel {
      width: min(360px, calc(100vw - 24px));
      height: min(460px, calc(100vh - 32px));
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      overflow: hidden;
      border: 1px solid rgba(34, 197, 94, 0.32);
      border-radius: 12px;
      background:
        linear-gradient(135deg, rgba(34, 197, 94, 0.14), transparent 42%),
        rgba(7, 17, 32, 0.98);
      box-shadow: 0 20px 56px rgba(0, 0, 0, 0.52);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-panel[hidden] {
      display: none;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px;
      border-bottom: 1px solid rgba(134, 239, 172, 0.16);
      cursor: grab;
      user-select: none;
      touch-action: none;
    }

    #${OPENFRONT_CHAT_WIDGET_ID}[data-dragging="true"] .openfront-chat-header,
    #${OPENFRONT_CHAT_WIDGET_ID}[data-dragging="true"] .openfront-chat-toggle {
      cursor: grabbing;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-title {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-beta {
      padding: 2px 5px;
      border: 1px solid rgba(125, 211, 252, 0.28);
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.1);
      color: rgba(186, 230, 253, 0.9);
      font-size: 9px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.04em;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-close {
      width: 24px;
      height: 24px;
      border: 1px solid rgba(248, 113, 113, 0.34);
      border-radius: 8px;
      background: rgba(69, 10, 10, 0.68);
      color: #fecaca;
      cursor: pointer;
      font-size: 14px;
      font-weight: 900;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-controls {
      display: grid;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(134, 239, 172, 0.12);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-name {
      width: 100%;
      padding: 8px 9px;
      border: 1px solid rgba(151, 181, 214, 0.22);
      border-radius: 8px;
      background: rgba(7, 17, 32, 0.82);
      color: #f8fafc;
      font: inherit;
      font-size: 12px;
      outline: none;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-tab {
      border: 1px solid rgba(151, 181, 214, 0.2);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      color: rgba(226, 232, 240, 0.78);
      cursor: pointer;
      font-size: 11px;
      font-weight: 900;
      padding: 7px 9px;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-tab[data-active="true"] {
      border-color: rgba(34, 197, 94, 0.5);
      background: rgba(34, 197, 94, 0.15);
      color: #bbf7d0;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-status {
      min-height: 16px;
      color: rgba(203, 213, 225, 0.64);
      font-size: 10px;
      line-height: 1.35;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-expiry-note {
      margin: -5px 0 0;
      color: rgba(203, 213, 225, 0.48);
      font-size: 10px;
      line-height: 1.35;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-messages {
      display: grid;
      align-content: start;
      gap: 8px;
      min-height: 0;
      overflow: auto;
      padding: 10px 12px;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-message {
      display: grid;
      gap: 2px;
      padding: 8px 9px;
      border: 1px solid rgba(151, 181, 214, 0.12);
      border-radius: 8px;
      background: rgba(8, 31, 28, 0.62);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-message[data-own="true"] {
      border-color: rgba(34, 197, 94, 0.22);
      background: rgba(20, 83, 45, 0.46);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-message-meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: rgba(187, 247, 208, 0.78);
      font-size: 10px;
      font-weight: 900;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-message-time {
      color: rgba(203, 213, 225, 0.48);
      font-weight: 700;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-message-text {
      color: rgba(248, 250, 252, 0.92);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
      user-select: text;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-empty {
      margin: 18px 0 0;
      color: rgba(203, 213, 225, 0.58);
      font-size: 12px;
      text-align: center;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      padding: 10px 12px 12px;
      border-top: 1px solid rgba(134, 239, 172, 0.12);
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-input {
      min-width: 0;
      padding: 8px 9px;
      border: 1px solid rgba(151, 181, 214, 0.22);
      border-radius: 8px;
      background: rgba(7, 17, 32, 0.82);
      color: #f8fafc;
      font: inherit;
      font-size: 12px;
      outline: none;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-send {
      border: 1px solid rgba(34, 197, 94, 0.46);
      border-radius: 8px;
      background: rgba(34, 197, 94, 0.16);
      color: #bbf7d0;
      cursor: pointer;
      font-size: 11px;
      font-weight: 900;
      padding: 8px 12px;
      text-transform: uppercase;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-send:disabled,
    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-input:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function formatChatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderChatMessages(widget, messages) {
  const list = widget.querySelector(".openfront-chat-messages");
  if (!(list instanceof HTMLElement)) {
    return;
  }

  if (messages.length === 0) {
    list.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "openfront-chat-empty";
    empty.textContent = chatT("No messages yet.");
    list.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const row = document.createElement("article");
    row.className = "openfront-chat-message";
    row.dataset.own = String(message.user_id === openFrontChatState.userId);

    const meta = document.createElement("div");
    meta.className = "openfront-chat-message-meta";

    const name = document.createElement("span");
    name.textContent = message.display_name || chatT("Anonymous");

    const time = document.createElement("span");
    time.className = "openfront-chat-message-time";
    time.textContent = formatChatTime(message.created_at);

    const text = document.createElement("div");
    text.className = "openfront-chat-message-text";
    text.textContent = message.message || "";

    meta.append(name, time);
    row.append(meta, text);
    fragment.append(row);
  }

  const shouldStickToBottom =
    list.scrollTop + list.clientHeight >= list.scrollHeight - 40;
  list.replaceChildren(fragment);
  if (shouldStickToBottom) {
    list.scrollTop = list.scrollHeight;
  }
}

function updateChatUnreadBadge(widget) {
  const badge = widget.querySelector(".openfront-chat-badge");
  if (!(badge instanceof HTMLElement)) {
    return;
  }

  const unreadCount = Math.max(0, openFrontChatState.unreadCount);
  badge.hidden = unreadCount === 0;
  badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
}

function applyChatPosition(widget) {
  const position = normalizeChatWidgetPosition(openFrontChatState.widgetPosition);
  if (!hasCustomChatWidgetPosition(position)) {
    widget.style.left = "";
    widget.style.top = "";
    widget.style.right = "";
    widget.style.bottom = "";
    widget.style.transform = "";
    widget.dataset.position = "default";
    return;
  }

  widget.style.left = `${position.left}px`;
  widget.style.top = `${position.top}px`;
  widget.style.right = "auto";
  widget.style.bottom = "auto";
  widget.style.transform = "none";
  widget.dataset.position = "custom";
}

function getClampedChatWidgetPosition(widget, left, top) {
  const rect = widget.getBoundingClientRect();
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
  return {
    left: Math.round(Math.max(margin, Math.min(maxLeft, left))),
    top: Math.round(Math.max(margin, Math.min(maxTop, top))),
  };
}

function keepChatWidgetInViewport(widget) {
  const rect = widget.getBoundingClientRect();
  const margin = 8;
  let nextLeft = rect.left;
  let nextTop = rect.top;

  if (rect.right > window.innerWidth - margin) {
    nextLeft -= rect.right - (window.innerWidth - margin);
  }
  if (rect.left < margin) {
    nextLeft += margin - rect.left;
  }
  if (rect.bottom > window.innerHeight - margin) {
    nextTop -= rect.bottom - (window.innerHeight - margin);
  }
  if (rect.top < margin) {
    nextTop += margin - rect.top;
  }

  const changed =
    Math.round(nextLeft) !== Math.round(rect.left) ||
    Math.round(nextTop) !== Math.round(rect.top);
  if (!changed) {
    return false;
  }

  const nextPosition = getClampedChatWidgetPosition(widget, nextLeft, nextTop);
  widget.style.left = `${nextPosition.left}px`;
  widget.style.top = `${nextPosition.top}px`;
  widget.style.right = "auto";
  widget.style.bottom = "auto";
  widget.style.transform = "none";
  widget.dataset.position = "temporary";
  return true;
}

async function saveChatWidgetPosition(position) {
  const stored = await chrome.storage.local.get(OPENFRONT_CHAT_SETTINGS_KEY);
  const settingsHelper = globalThis.OpenFrontHelperSettings;
  const nextSettings = typeof settingsHelper?.normalizeSettings === "function"
    ? settingsHelper.normalizeSettings(stored[OPENFRONT_CHAT_SETTINGS_KEY] || {})
    : { ...(stored[OPENFRONT_CHAT_SETTINGS_KEY] || {}) };

  nextSettings.chatWidgetPosition = normalizeChatWidgetPosition(position);
  await chrome.storage.local.set({
    [OPENFRONT_CHAT_SETTINGS_KEY]: nextSettings,
  });
}

function finishChatWidgetDrag(widget, shouldSave) {
  const dragState = openFrontChatState.dragState;
  if (!dragState) {
    return;
  }

  if (dragState.captureElement?.hasPointerCapture?.(dragState.pointerId)) {
    dragState.captureElement.releasePointerCapture(dragState.pointerId);
  }
  widget.dataset.dragging = "false";
  openFrontChatState.dragState = null;

  if (!shouldSave || !dragState.moved) {
    return;
  }

  openFrontChatState.suppressNextToggleClick = true;
  window.setTimeout(() => {
    openFrontChatState.suppressNextToggleClick = false;
  }, 0);

  saveChatWidgetPosition(openFrontChatState.widgetPosition).catch((error) => {
    if (isExtensionContextInvalidatedError(error)) {
      return;
    }
    console.error("Failed to save OpenFront chat position:", error);
  });
}

function beginChatWidgetDrag(event, widget, captureElement) {
  if (event.button !== 0) {
    return;
  }

  const target = event.target;
  if (target instanceof HTMLElement && target.closest(".openfront-chat-close")) {
    return;
  }

  const rect = widget.getBoundingClientRect();
  openFrontChatState.dragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: rect.left,
    startTop: rect.top,
    moved: false,
    captureElement,
  };
  captureElement.setPointerCapture?.(event.pointerId);
  widget.dataset.dragging = "true";
}

function moveChatWidget(event, widget) {
  const dragState = openFrontChatState.dragState;
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;
  if (!dragState.moved && Math.hypot(deltaX, deltaY) < 4) {
    return;
  }

  dragState.moved = true;
  const nextPosition = getClampedChatWidgetPosition(
    widget,
    dragState.startLeft + deltaX,
    dragState.startTop + deltaY,
  );
  openFrontChatState.widgetPosition = nextPosition;
  applyChatPosition(widget);
}

function bindChatWidgetDrag(widget, handle) {
  handle.addEventListener("pointerdown", (event) => {
    beginChatWidgetDrag(event, widget, handle);
  });

  handle.addEventListener("pointermove", (event) => {
    moveChatWidget(event, widget);
  });

  handle.addEventListener("pointerup", (event) => {
    finishChatWidgetDrag(widget, true);
  });

  handle.addEventListener("pointercancel", () => {
    finishChatWidgetDrag(widget, false);
  });
}

function setChatStatus(widget, text) {
  const status = widget.querySelector(".openfront-chat-status");
  if (status instanceof HTMLElement) {
    status.textContent = text;
  }
}

function bringChatWidgetToFront(widget) {
  const body = document.body;
  if (!body || widget.parentElement !== body || body.lastElementChild === widget) {
    return;
  }
  body.appendChild(widget);
}

function ensureChatFrontObserver() {
  if (openFrontChatState.frontObserver || !document.body) {
    return;
  }

  openFrontChatState.frontObserver = new MutationObserver(() => {
    const widget = document.getElementById(OPENFRONT_CHAT_WIDGET_ID);
    if (widget instanceof HTMLElement) {
      bringChatWidgetToFront(widget);
    }
  });
  openFrontChatState.frontObserver.observe(document.body, {
    childList: true,
  });
}

function updateChatControls(widget) {
  const activeRoomId = getCurrentChatRoomId();
  const isLobby = openFrontChatState.activeRoomType === "lobby";
  const input = widget.querySelector(".openfront-chat-input");
  const send = widget.querySelector(".openfront-chat-send");
  const tabs = widget.querySelectorAll(".openfront-chat-tab");

  for (const tab of tabs) {
    if (tab instanceof HTMLElement) {
      tab.dataset.active = String(tab.dataset.roomType === openFrontChatState.activeRoomType);
    }
  }

  const disabled = !activeRoomId || !isChatConfigured();
  if (input instanceof HTMLInputElement) {
    input.disabled = disabled;
    input.placeholder = disabled
      ? chatT("Lobby chat is available after a round is detected.")
      : chatT("Write a message...");
  }
  if (send instanceof HTMLButtonElement) {
    send.disabled = disabled;
  }

  if (!isChatConfigured()) {
    setChatStatus(widget, chatT("Chat is not configured."));
  } else if (isLobby && !activeRoomId) {
    setChatStatus(widget, chatT("Lobby chat is available after a round is detected."));
  } else {
    setChatStatus(
      widget,
      isLobby ? chatT("Lobby chat") : chatT("Global chat"),
    );
  }
}

async function fetchChatMessages(roomType = openFrontChatState.activeRoomType, roomId = getChatRoomId(roomType)) {
  if (!roomId || !isChatConfigured()) {
    return [];
  }

  const url = new URL(getChatRestUrl());
  url.searchParams.set("room_type", `eq.${roomType}`);
  url.searchParams.set("room_id", `eq.${roomId}`);
  url.searchParams.set("select", "id,room_type,room_id,user_id,display_name,message,created_at");
  url.searchParams.set("created_at", `gte.${getChatMessageCutoffIso()}`);
  url.searchParams.set("order", "created_at.asc");
  url.searchParams.set("limit", "80");

  const response = await fetch(url.toString(), {
    headers: createChatHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Chat fetch failed: ${response.status}`);
  }
  return response.json();
}

async function fetchChatRoomsMessages() {
  const rooms = getChatRoomsToPoll();
  const results = await Promise.all(
    rooms.map(async ({ roomType, roomId }) => ({
      roomType,
      roomId,
      messages: await fetchChatMessages(roomType, roomId),
    })),
  );
  return results;
}

async function cleanupExpiredChatMessagesIfDue() {
  const now = Date.now();
  if (
    openFrontChatState.isCleaningUp ||
    !isChatConfigured() ||
    now - openFrontChatState.lastCleanupAt < OPENFRONT_CHAT_CLEANUP_MS
  ) {
    return;
  }

  openFrontChatState.isCleaningUp = true;
  openFrontChatState.lastCleanupAt = now;
  try {
    const url = new URL(getChatRestUrl());
    url.searchParams.set("created_at", `lt.${getChatMessageCutoffIso()}`);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        ...createChatHeaders(),
        Prefer: "return=minimal",
      },
    });
    if (!response.ok) {
      throw new Error(`Chat cleanup failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to clean up expired OpenFront chat messages:", error);
  } finally {
    openFrontChatState.isCleaningUp = false;
  }
}

async function refreshChatMessages() {
  const widget = document.getElementById(OPENFRONT_CHAT_WIDGET_ID);
  if (!widget || openFrontChatState.isLoading) {
    return;
  }

  openFrontChatState.isLoading = true;
  try {
    await ensureChatIdentity();
    updateChatControls(widget);
    cleanupExpiredChatMessagesIfDue();
    const roomResults = await fetchChatRoomsMessages();
    let activeMessages = [];

    for (const { roomType, roomId, messages } of roomResults) {
      const roomKey = getChatRoomKey(roomType, roomId);
      const knownMessageIds = openFrontChatState.knownMessageIdsByRoom.get(roomKey) || new Set();
      const hadKnownMessages = knownMessageIds.size > 0;

      if (!openFrontChatState.isOpen && hadKnownMessages) {
        const newUnreadCount = messages.filter(
          (message) =>
            !knownMessageIds.has(message.id) &&
            message.user_id !== openFrontChatState.userId,
        ).length;
        openFrontChatState.unreadCount += newUnreadCount;
      }

      const nextKnownMessageIds = new Set(messages.map((message) => message.id));
      openFrontChatState.knownMessageIdsByRoom.set(roomKey, nextKnownMessageIds);

      if (roomType === openFrontChatState.activeRoomType && roomId === getCurrentChatRoomId()) {
        activeMessages = messages;
        openFrontChatState.knownMessageIds = nextKnownMessageIds;
      }
    }

    openFrontChatState.messagesById = new Map(activeMessages.map((message) => [message.id, message]));
    if (openFrontChatState.isOpen) {
      openFrontChatState.unreadCount = 0;
      renderChatMessages(widget, activeMessages);
    }
    updateChatUnreadBadge(widget);
  } catch (error) {
    console.error("Failed to refresh OpenFront chat:", error);
    if (openFrontChatState.isOpen) {
      setChatStatus(widget, chatT("Chat connection failed."));
    }
  } finally {
    openFrontChatState.isLoading = false;
  }
}

function startChatPolling() {
  if (openFrontChatState.pollTimer !== null) {
    return;
  }
  openFrontChatState.pollTimer = window.setInterval(() => {
    refreshChatMessages();
  }, OPENFRONT_CHAT_POLL_MS);
}

function stopChatPolling() {
  if (openFrontChatState.pollTimer === null) {
    return;
  }
  window.clearInterval(openFrontChatState.pollTimer);
  openFrontChatState.pollTimer = null;
}

function removeChatWidget() {
  stopChatPolling();
  openFrontChatState.isOpen = false;
  document.getElementById(OPENFRONT_CHAT_WIDGET_ID)?.remove();
}

function updateChatSettings(rawSettings) {
  const nextSettings = getChatSettings(rawSettings);
  const nextEnabled = nextSettings.showExtensionChat === true;
  const nextPosition = normalizeChatWidgetPosition(nextSettings.chatWidgetPosition);
  const enabledChanged = nextEnabled !== openFrontChatState.enabled;
  const positionChanged =
    nextPosition.left !== openFrontChatState.widgetPosition.left ||
    nextPosition.top !== openFrontChatState.widgetPosition.top;

  openFrontChatState.enabled = nextEnabled;
  openFrontChatState.widgetPosition = nextPosition;

  const widget = document.getElementById(OPENFRONT_CHAT_WIDGET_ID);
  if (widget && positionChanged) {
    applyChatPosition(widget);
  }

  if (enabledChanged) {
    applyChatEnabledState();
  }
}

async function sendChatMessage(messageText) {
  const roomId = getCurrentChatRoomId();
  const message = normalizeChatMessage(messageText);
  if (!message || !roomId || !isChatConfigured()) {
    return;
  }

  await ensureChatIdentity();
  const response = await fetch(getChatRestUrl(), {
    method: "POST",
    headers: {
      ...createChatHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      room_type: openFrontChatState.activeRoomType,
      room_id: roomId,
      user_id: openFrontChatState.userId,
      display_name: openFrontChatState.displayName,
      message,
    }),
  });
  if (!response.ok) {
    let errorMessage = "";
    try {
      const body = await response.text();
      const parsed = body ? JSON.parse(body) : null;
      errorMessage = parsed?.message || body;
    } catch (_error) {
      errorMessage = "";
    }
    throw new Error(errorMessage || `Chat send failed: ${response.status}`);
  }
}

async function openChatPanel(widget) {
  await ensureChatIdentity();
  openFrontChatState.isOpen = true;
  openFrontChatState.unreadCount = 0;

  const panel = widget.querySelector(".openfront-chat-panel");
  const toggle = widget.querySelector(".openfront-chat-toggle");
  const nameInput = widget.querySelector(".openfront-chat-name");
  if (panel instanceof HTMLElement) {
    panel.hidden = false;
  }
  if (toggle instanceof HTMLElement) {
    toggle.hidden = true;
  }
  if (nameInput instanceof HTMLInputElement) {
    nameInput.value = openFrontChatState.displayName;
  }

  bringChatWidgetToFront(widget);
  keepChatWidgetInViewport(widget);
  updateChatUnreadBadge(widget);
  updateChatControls(widget);
  await refreshChatMessages();
  startChatPolling();
}

function closeChatPanel(widget) {
  openFrontChatState.isOpen = false;

  const panel = widget.querySelector(".openfront-chat-panel");
  const toggle = widget.querySelector(".openfront-chat-toggle");
  if (panel instanceof HTMLElement) {
    panel.hidden = true;
  }
  if (toggle instanceof HTMLElement) {
    toggle.hidden = false;
  }

  applyChatPosition(widget);
}

function createChatWidget() {
  ensureChatStyles();
  const widget = document.createElement("div");
  widget.id = OPENFRONT_CHAT_WIDGET_ID;
  applyChatPosition(widget);
  widget.innerHTML = `
    <button class="openfront-chat-toggle" type="button">💬 ${chatT("Chat")}<span class="openfront-chat-badge" hidden>0</span></button>
    <section class="openfront-chat-panel" hidden>
      <div class="openfront-chat-header">
        <p class="openfront-chat-title">${chatT("Extension chat")}<span class="openfront-chat-beta">${chatT("Beta")}</span></p>
        <button class="openfront-chat-close" type="button" aria-label="${chatT("Close chat")}">x</button>
      </div>
      <div class="openfront-chat-controls">
        <input class="openfront-chat-name" type="text" maxlength="${OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH}" aria-label="${chatT("Chat display name")}">
        <div class="openfront-chat-tabs">
          <button class="openfront-chat-tab" data-room-type="global" type="button">${chatT("Global")}</button>
          <button class="openfront-chat-tab" data-room-type="lobby" type="button">${chatT("Lobby")}</button>
        </div>
        <div class="openfront-chat-status"></div>
        <div class="openfront-chat-expiry-note">${chatT("Messages older than 24 hours are automatically deleted.")}</div>
      </div>
      <div class="openfront-chat-messages" aria-live="polite"></div>
      <form class="openfront-chat-form">
        <input class="openfront-chat-input" type="text" maxlength="${OPENFRONT_CHAT_MAX_MESSAGE_LENGTH}" autocomplete="off">
        <button class="openfront-chat-send" type="submit">${chatT("Send")}</button>
      </form>
    </section>
  `;

  widget.querySelector(".openfront-chat-toggle")?.addEventListener("click", () => {
    if (openFrontChatState.suppressNextToggleClick) {
      openFrontChatState.suppressNextToggleClick = false;
      return;
    }
    openChatPanel(widget).catch((error) => {
      console.error("Failed to open OpenFront chat:", error);
    });
  });

  const toggle = widget.querySelector(".openfront-chat-toggle");
  if (toggle instanceof HTMLElement) {
    bindChatWidgetDrag(widget, toggle);
  }

  const header = widget.querySelector(".openfront-chat-header");
  if (header instanceof HTMLElement) {
    bindChatWidgetDrag(widget, header);
  }

  widget.querySelector(".openfront-chat-close")?.addEventListener("click", () => {
    closeChatPanel(widget);
  });

  widget.querySelector(".openfront-chat-name")?.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    openFrontChatState.displayName = normalizeChatDisplayName(target.value);
    target.value = openFrontChatState.displayName;
    await chrome.storage.local.set({
      [OPENFRONT_CHAT_DISPLAY_NAME_KEY]: openFrontChatState.displayName,
      [OPENFRONT_CHAT_DISPLAY_NAME_SOURCE_KEY]: "custom",
    });
  });

  widget.querySelector(".openfront-chat-tabs")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest(".openfront-chat-tab");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const nextRoomType = button.dataset.roomType;
    if (nextRoomType !== "global" && nextRoomType !== "lobby") {
      return;
    }
    openFrontChatState.activeRoomType = nextRoomType;
    openFrontChatState.messagesById.clear();
    openFrontChatState.knownMessageIds.clear();
    openFrontChatState.unreadCount = 0;
    updateChatUnreadBadge(widget);
    updateChatControls(widget);
    refreshChatMessages();
  });

  widget.querySelector(".openfront-chat-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = widget.querySelector(".openfront-chat-input");
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const message = normalizeChatMessage(input.value);
    if (!message) {
      return;
    }
    if (containsChatLink(message)) {
      setChatStatus(widget, chatT("Links are not allowed in chat messages."));
      return;
    }
    input.value = "";
    try {
      await sendChatMessage(message);
      await refreshChatMessages();
    } catch (error) {
      console.error("Failed to send OpenFront chat message:", error);
      setChatStatus(widget, getChatSendErrorStatus(error));
    }
  });

  updateChatControls(widget);
  return widget;
}

function ensureChatWidget() {
  if (!openFrontChatState.enabled) {
    removeChatWidget();
    return;
  }

  if (!isChatConfigured()) {
    return;
  }

  if (document.getElementById(OPENFRONT_CHAT_WIDGET_ID)) {
    return;
  }

  const widget = createChatWidget();
  (document.body || document.documentElement).appendChild(widget);
  ensureChatFrontObserver();
  bringChatWidgetToFront(widget);
  startChatPolling();
  refreshChatMessages();
}

function applyChatEnabledState() {
  if (!openFrontChatState.enabled) {
    removeChatWidget();
    return;
  }
  ensureChatWidget();
}

function handleChatBridgeMessage(event) {
  if (event.source !== window) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== BRIDGE_SOURCE_PAGE) {
    return;
  }

  if (data.type !== "LOBBY_CHAT_CONTEXT") {
    return;
  }

  const roomId = typeof data.payload?.roomId === "string" ? data.payload.roomId : null;
  const defaultDisplayName = getChatBridgeDisplayName(data.payload);
  if (defaultDisplayName && defaultDisplayName !== openFrontChatState.defaultDisplayName) {
    applyOpenFrontDefaultDisplayNameFromBridge(defaultDisplayName);
  }

  if (roomId === openFrontChatState.lobbyRoomId) {
    return;
  }

  openFrontChatState.lobbyRoomId = roomId;
  const widget = document.getElementById(OPENFRONT_CHAT_WIDGET_ID);
  if (widget) {
    updateChatControls(widget);
    if (openFrontChatState.isOpen && openFrontChatState.activeRoomType === "lobby") {
      refreshChatMessages();
    }
  }
}

function handleChatStorageChange(changes, areaName) {
  if (areaName !== "local" || !changes[OPENFRONT_CHAT_SETTINGS_KEY]) {
    return;
  }
  updateChatSettings(changes[OPENFRONT_CHAT_SETTINGS_KEY].newValue);
}

async function initOpenFrontChat() {
  window.addEventListener("message", handleChatBridgeMessage);
  chrome.storage.onChanged.addListener(handleChatStorageChange);

  const stored = await chrome.storage.local.get(OPENFRONT_CHAT_SETTINGS_KEY);
  const initialSettings = getChatSettings(stored[OPENFRONT_CHAT_SETTINGS_KEY]);
  openFrontChatState.enabled = initialSettings.showExtensionChat === true;
  openFrontChatState.widgetPosition = normalizeChatWidgetPosition(
    initialSettings.chatWidgetPosition,
  );

  if (document.body) {
    applyChatEnabledState();
    return;
  }
  document.addEventListener("DOMContentLoaded", applyChatEnabledState, { once: true });
}

initOpenFrontChat().catch((error) => {
  console.error("Failed to initialize OpenFront chat:", error);
});
