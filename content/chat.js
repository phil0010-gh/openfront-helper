// Extension chat widget backed by Supabase.

const OPENFRONT_CHAT_WIDGET_ID = "openfront-helper-chat-widget";
const OPENFRONT_CHAT_STYLE_ID = "openfront-helper-chat-styles";
const OPENFRONT_CHAT_USER_ID_KEY = "openfrontChatUserId";
const OPENFRONT_CHAT_DISPLAY_NAME_KEY = "openfrontChatDisplayName";
const OPENFRONT_CHAT_POLL_MS = 2500;
const OPENFRONT_CHAT_MAX_MESSAGE_LENGTH = 500;
const OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH = 32;
const OPENFRONT_CHAT_GLOBAL_ROOM_ID = "global";

const openFrontChatConfig = globalThis.OpenFrontHelperChatConfig || {};
const openFrontChatState = {
  userId: "",
  displayName: "",
  activeRoomType: "global",
  lobbyRoomId: null,
  messagesById: new Map(),
  pollTimer: null,
  isOpen: false,
  isLoading: false,
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

function normalizeChatDisplayName(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH);
  return normalized || `Helper-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeChatMessage(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPENFRONT_CHAT_MAX_MESSAGE_LENGTH);
}

function getCurrentChatRoomId() {
  if (openFrontChatState.activeRoomType === "global") {
    return OPENFRONT_CHAT_GLOBAL_ROOM_ID;
  }
  return openFrontChatState.lobbyRoomId;
}

function createChatHeaders() {
  return {
    apikey: openFrontChatConfig.supabaseAnonKey,
    Authorization: `Bearer ${openFrontChatConfig.supabaseAnonKey}`,
    "Content-Type": "application/json",
  };
}

async function ensureChatIdentity() {
  if (openFrontChatState.userId && openFrontChatState.displayName) {
    return;
  }

  const stored = await chrome.storage.local.get([
    OPENFRONT_CHAT_USER_ID_KEY,
    OPENFRONT_CHAT_DISPLAY_NAME_KEY,
  ]);
  let userId = stored[OPENFRONT_CHAT_USER_ID_KEY];
  let displayName = stored[OPENFRONT_CHAT_DISPLAY_NAME_KEY];

  if (typeof userId !== "string" || !userId.trim()) {
    userId = crypto.randomUUID();
  }
  displayName = normalizeChatDisplayName(displayName);

  openFrontChatState.userId = userId;
  openFrontChatState.displayName = displayName;
  await chrome.storage.local.set({
    [OPENFRONT_CHAT_USER_ID_KEY]: userId,
    [OPENFRONT_CHAT_DISPLAY_NAME_KEY]: displayName,
  });
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
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      color: #f8fafc;
      font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-toggle {
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
      font-size: 12px;
      font-weight: 900;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.38);
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
    }

    #${OPENFRONT_CHAT_WIDGET_ID} .openfront-chat-title {
      margin: 0;
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
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

function setChatStatus(widget, text) {
  const status = widget.querySelector(".openfront-chat-status");
  if (status instanceof HTMLElement) {
    status.textContent = text;
  }
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

async function fetchChatMessages() {
  const roomId = getCurrentChatRoomId();
  if (!roomId || !isChatConfigured()) {
    return [];
  }

  const url = new URL(getChatRestUrl());
  url.searchParams.set("room_type", `eq.${openFrontChatState.activeRoomType}`);
  url.searchParams.set("room_id", `eq.${roomId}`);
  url.searchParams.set("select", "id,room_type,room_id,user_id,display_name,message,created_at");
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

async function refreshChatMessages() {
  const widget = document.getElementById(OPENFRONT_CHAT_WIDGET_ID);
  if (!widget || !openFrontChatState.isOpen || openFrontChatState.isLoading) {
    return;
  }

  openFrontChatState.isLoading = true;
  try {
    updateChatControls(widget);
    const messages = await fetchChatMessages();
    openFrontChatState.messagesById = new Map(messages.map((message) => [message.id, message]));
    renderChatMessages(widget, messages);
  } catch (error) {
    console.error("Failed to refresh OpenFront chat:", error);
    setChatStatus(widget, chatT("Chat connection failed."));
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
    throw new Error(`Chat send failed: ${response.status}`);
  }
}

async function openChatPanel(widget) {
  await ensureChatIdentity();
  openFrontChatState.isOpen = true;

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

  updateChatControls(widget);
  await refreshChatMessages();
  startChatPolling();
}

function closeChatPanel(widget) {
  openFrontChatState.isOpen = false;
  stopChatPolling();

  const panel = widget.querySelector(".openfront-chat-panel");
  const toggle = widget.querySelector(".openfront-chat-toggle");
  if (panel instanceof HTMLElement) {
    panel.hidden = true;
  }
  if (toggle instanceof HTMLElement) {
    toggle.hidden = false;
  }
}

function createChatWidget() {
  ensureChatStyles();
  const widget = document.createElement("div");
  widget.id = OPENFRONT_CHAT_WIDGET_ID;
  widget.innerHTML = `
    <button class="openfront-chat-toggle" type="button">💬 ${chatT("Chat")}</button>
    <section class="openfront-chat-panel" hidden>
      <div class="openfront-chat-header">
        <p class="openfront-chat-title">${chatT("Extension chat")}</p>
        <button class="openfront-chat-close" type="button" aria-label="${chatT("Close chat")}">x</button>
      </div>
      <div class="openfront-chat-controls">
        <input class="openfront-chat-name" type="text" maxlength="${OPENFRONT_CHAT_MAX_DISPLAY_NAME_LENGTH}" aria-label="${chatT("Chat display name")}">
        <div class="openfront-chat-tabs">
          <button class="openfront-chat-tab" data-room-type="global" type="button">${chatT("Global")}</button>
          <button class="openfront-chat-tab" data-room-type="lobby" type="button">${chatT("Lobby")}</button>
        </div>
        <div class="openfront-chat-status"></div>
      </div>
      <div class="openfront-chat-messages" aria-live="polite"></div>
      <form class="openfront-chat-form">
        <input class="openfront-chat-input" type="text" maxlength="${OPENFRONT_CHAT_MAX_MESSAGE_LENGTH}" autocomplete="off">
        <button class="openfront-chat-send" type="submit">${chatT("Send")}</button>
      </form>
    </section>
  `;

  widget.querySelector(".openfront-chat-toggle")?.addEventListener("click", () => {
    openChatPanel(widget).catch((error) => {
      console.error("Failed to open OpenFront chat:", error);
    });
  });

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
    input.value = "";
    try {
      await sendChatMessage(message);
      await refreshChatMessages();
    } catch (error) {
      console.error("Failed to send OpenFront chat message:", error);
      setChatStatus(widget, chatT("Message could not be sent."));
    }
  });

  updateChatControls(widget);
  return widget;
}

function ensureChatWidget() {
  if (!isChatConfigured()) {
    return;
  }

  if (document.getElementById(OPENFRONT_CHAT_WIDGET_ID)) {
    return;
  }

  const widget = createChatWidget();
  (document.body || document.documentElement).appendChild(widget);
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

function initOpenFrontChat() {
  window.addEventListener("message", handleChatBridgeMessage);
  if (document.body) {
    ensureChatWidget();
    return;
  }
  document.addEventListener("DOMContentLoaded", ensureChatWidget, { once: true });
}

initOpenFrontChat();
