const STORAGE_KEY = "settings";
const BRIDGE_SOURCE_PAGE = "openfront-autojoin-page";
const BRIDGE_SOURCE_EXTENSION = "openfront-autojoin-extension";
const FLOATING_HELPERS_PANEL_ID = "openfront-helper-floating-helpers-panel";
const FLOATING_HELPERS_STYLE_ID = "openfront-helper-floating-helpers-styles";
const JOIN_ATTEMPT_TIMEOUT_MS = 12000;
const LOBBY_RETRY_COOLDOWN_MS = 30000;
const PREFERRED_GROUP_ORDER = ["special", "ffa", "team"];
const FILTER_KEYS = [
  "ffaLobby",
  "duosLobby",
  "triosLobby",
  "quadsLobby",
  "teamsLargerThanTriosLobby",
  "startingGold0M",
  "randomSpawn",
  "alliancesDisabled",
  "startingGold5M",
  "startingGold25M",
  "goldMultiplier2x",
];
const LOBBY_TYPE_FILTER_KEYS = [
  "ffaLobby",
  "duosLobby",
  "triosLobby",
  "quadsLobby",
  "teamsLargerThanTriosLobby",
];
const START_GOLD_FILTER_KEYS = [
  "startingGold0M",
  "startingGold5M",
  "startingGold25M",
];
const MAPS = Array.isArray(globalThis.OPENFRONT_MAPS)
  ? globalThis.OPENFRONT_MAPS
  : [];
const MAP_IDS = MAPS.map((map) => map.id);

function createDefaultMapFilters() {
  return Object.fromEntries(MAP_IDS.map((id) => [id, false]));
}

const DEFAULT_SETTINGS = {
  enabled: false,
  searchStartedAt: null,
  markBotNationsRed: false,
  showGoldPerMinute: false,
  showTeamGoldPerMinute: false,
  showTopGoldPerMinute: false,
  markHoveredAlliesGreen: false,
  showTradeBalances: false,
  fpsSaver: false,
  showAttackAmounts: false,
  showEconomyHeatmap: false,
  economyHeatmapIntensity: 1,
  showExportPartnerHeatmap: false,
  showFloatingHelpersPanel: false,
  floatingHelpersPanelPosition: {
    left: null,
    top: null,
  },
  includeFilters: {
    ffaLobby: false,
    duosLobby: false,
    triosLobby: false,
    quadsLobby: false,
    teamsLargerThanTriosLobby: false,
    startingGold0M: false,
    randomSpawn: false,
    alliancesDisabled: false,
    startingGold5M: false,
    startingGold25M: false,
    goldMultiplier2x: false,
  },
  excludeFilters: {
    ffaLobby: false,
    duosLobby: false,
    triosLobby: false,
    quadsLobby: false,
    teamsLargerThanTriosLobby: false,
    startingGold0M: false,
    randomSpawn: false,
    alliancesDisabled: false,
    startingGold5M: false,
    startingGold25M: false,
    goldMultiplier2x: false,
  },
  mapFilters: createDefaultMapFilters(),
  mapExcludeFilters: createDefaultMapFilters(),
};

const lobbyCooldowns = new Map();

let settings = normalizeSettings();
let latestLobbySnapshot = null;
let pendingJoin = null;
let joinAlertAudio = null;

function normalizeSettings(rawSettings = {}) {
  rawSettings = rawSettings || {};
  const includeFilters = rawSettings.includeFilters || rawSettings.filters || {};
  const excludeFilters = rawSettings.excludeFilters || rawSettings.excludes || {};
  const mapFilters = rawSettings.mapFilters || rawSettings.maps || {};
  const mapExcludeFilters =
    rawSettings.mapExcludeFilters || rawSettings.mapExcludes || {};
  const floatingHelpersPanelPosition = rawSettings.floatingHelpersPanelPosition || {};

  const normalized = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    floatingHelpersPanelPosition: normalizeFloatingHelpersPanelPosition(
      floatingHelpersPanelPosition,
    ),
    includeFilters: {
      ...DEFAULT_SETTINGS.includeFilters,
      ...includeFilters,
    },
    excludeFilters: {
      ...DEFAULT_SETTINGS.excludeFilters,
      ...excludeFilters,
    },
    mapFilters: normalizeMapFilters(mapFilters),
    mapExcludeFilters: normalizeMapFilters(mapExcludeFilters),
  };

  if (normalized.showEconomyHeatmap && normalized.showExportPartnerHeatmap) {
    normalized.showExportPartnerHeatmap = false;
  }
  normalized.economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(
    normalized.economyHeatmapIntensity,
  );

  return normalized;
}

function normalizeEconomyHeatmapIntensity(value) {
  const intensity = Number(value);
  if (!Number.isFinite(intensity)) {
    return DEFAULT_SETTINGS.economyHeatmapIntensity;
  }
  return Math.max(0, Math.min(2, Math.round(intensity)));
}

function normalizeFloatingHelpersPanelPosition(value = {}) {
  const left = Number(value.left);
  const top = Number(value.top);
  return {
    left: value.left == null || value.left === "" || !Number.isFinite(left) ? null : left,
    top: value.top == null || value.top === "" || !Number.isFinite(top) ? null : top,
  };
}

function normalizeMapFilters(rawMapFilters = {}) {
  const normalizedMapFilters = createDefaultMapFilters();
  for (const id of MAP_IDS) {
    normalizedMapFilters[id] = Boolean(rawMapFilters[id]);
  }
  return normalizedMapFilters;
}

function syncBotNationMarkers() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "MARK_BOT_NATIONS_RED",
      payload: {
        enabled: Boolean(settings.markBotNationsRed),
      },
    },
    "*",
  );
}

function syncGoldPerMinuteHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_GOLD_PER_MINUTE",
      payload: {
        enabled: Boolean(settings.showGoldPerMinute),
      },
    },
    "*",
  );
}

function syncTeamGoldPerMinuteHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_TEAM_GOLD_PER_MINUTE",
      payload: {
        enabled: Boolean(settings.showTeamGoldPerMinute),
      },
    },
    "*",
  );
}

function syncTopGoldPerMinuteHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_TOP_GOLD_PER_MINUTE",
      payload: {
        enabled: Boolean(settings.showTopGoldPerMinute),
      },
    },
    "*",
  );
}

function syncHoveredAlliesHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "MARK_HOVERED_ALLIES_GREEN",
      payload: {
        enabled: Boolean(settings.markHoveredAlliesGreen),
      },
    },
    "*",
  );
}

function syncTradeBalancesHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_TRADE_BALANCES",
      payload: {
        enabled: Boolean(settings.showTradeBalances),
      },
    },
    "*",
  );
}

function syncFpsSaverHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SET_FPS_SAVER",
      payload: {
        enabled: Boolean(settings.fpsSaver),
      },
    },
    "*",
  );
}

function syncAttackAmountsHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_ATTACK_AMOUNTS",
      payload: {
        enabled: Boolean(settings.showAttackAmounts),
      },
    },
    "*",
  );
}

function syncEconomyHeatmapHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_ECONOMY_HEATMAP",
      payload: {
        enabled: Boolean(settings.showEconomyHeatmap),
        intensity: settings.economyHeatmapIntensity,
      },
    },
    "*",
  );
}

function syncExportPartnerHeatmapHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_EXPORT_PARTNER_HEATMAP",
      payload: {
        enabled: Boolean(settings.showExportPartnerHeatmap),
      },
    },
    "*",
  );
}

function syncHelpers() {
  syncBotNationMarkers();
  syncGoldPerMinuteHelper();
  syncTeamGoldPerMinuteHelper();
  syncTopGoldPerMinuteHelper();
  syncHoveredAlliesHelper();
  syncTradeBalancesHelper();
  syncFpsSaverHelper();
  syncAttackAmountsHelper();
  syncEconomyHeatmapHelper();
  syncExportPartnerHeatmapHelper();
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  settings = normalizeSettings(stored[STORAGE_KEY]);
  syncHelpers();
  syncFloatingHelpersPanel();
}

async function saveSettings(nextSettings) {
  settings = normalizeSettings(nextSettings);
  await chrome.storage.local.set({
    [STORAGE_KEY]: settings,
  });
}

function getEconomyHeatmapIntensityLabel(value) {
  return ["Low", "Default", "High"][normalizeEconomyHeatmapIntensity(value)];
}

function ensureFloatingHelpersStyles() {
  if (document.getElementById(FLOATING_HELPERS_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = FLOATING_HELPERS_STYLE_ID;
  style.textContent = `
    #${FLOATING_HELPERS_PANEL_ID} {
      position: fixed;
      left: var(--openfront-helper-left, 18px);
      top: var(--openfront-helper-top, 92px);
      z-index: 2147483647;
      width: min(340px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
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

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px;
      border-bottom: 1px solid rgba(134, 239, 172, 0.16);
      cursor: move;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-title {
      margin: 0;
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-close {
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

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-body {
      display: grid;
      gap: 10px;
      max-height: calc(100vh - 82px);
      overflow: auto;
      padding: 10px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-category {
      display: grid;
      gap: 7px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-category-title {
      margin: 0 2px;
      color: rgba(187, 247, 208, 0.74);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 9px;
      align-items: center;
      min-height: 40px;
      padding: 9px;
      border: 1px solid rgba(151, 181, 214, 0.16);
      border-radius: 8px;
      background: rgba(8, 31, 28, 0.76);
      cursor: pointer;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #22c55e;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-copy strong {
      color: #f3f4f6;
      font-size: 12px;
      line-height: 1.15;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-copy small {
      color: rgba(203, 213, 225, 0.78);
      font-size: 10px;
      line-height: 1.25;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-subpanel {
      display: grid;
      gap: 7px;
      padding: 8px;
      border: 1px solid rgba(248, 113, 113, 0.22);
      border-radius: 8px;
      background: rgba(23, 16, 24, 0.54);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 7px 10px;
      align-items: center;
      padding: 6px 2px 2px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider strong {
      color: #e5e7eb;
      font-size: 11px;
      line-height: 1.1;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider-value {
      color: #fde68a;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider input {
      grid-column: 1 / -1;
      width: 100%;
      accent-color: #f59e0b;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function createFloatingHelperRow(key, title, description) {
  const label = document.createElement("label");
  label.className = "openfront-helper-floating-row";
  label.innerHTML = `
    <input type="checkbox" data-helper-setting="${key}">
    <span class="openfront-helper-floating-copy">
      <strong></strong>
      <small></small>
    </span>
  `;
  label.querySelector("strong").textContent = title;
  label.querySelector("small").textContent = description;
  return label;
}

function createFloatingHelpersPanel() {
  ensureFloatingHelpersStyles();

  const panel = document.createElement("div");
  panel.id = FLOATING_HELPERS_PANEL_ID;
  panel.innerHTML = `
    <div class="openfront-helper-floating-header">
      <p class="openfront-helper-floating-title">Helpers</p>
      <button class="openfront-helper-floating-close" type="button" aria-label="Close helpers panel">x</button>
    </div>
    <div class="openfront-helper-floating-body"></div>
  `;

  const body = panel.querySelector(".openfront-helper-floating-body");
  const gameCategory = document.createElement("section");
  gameCategory.className = "openfront-helper-floating-category";
  gameCategory.innerHTML = `<p class="openfront-helper-floating-category-title">Game helpers</p>`;
  gameCategory.append(
    createFloatingHelperRow("markBotNationsRed", "Mark bot nations red", "Adds a red marker to nation AI names."),
    createFloatingHelperRow("markHoveredAlliesGreen", "Alliances", "Highlights allies with remaining alliance time."),
    createFloatingHelperRow("fpsSaver", "FPS Saver", "Disables nuke explosion animations."),
    createFloatingHelperRow("showAttackAmounts", "Attack amounts", "Shows how many troops a player attacks with."),
  );

  const economyCategory = document.createElement("section");
  economyCategory.className = "openfront-helper-floating-category";
  economyCategory.innerHTML = `<p class="openfront-helper-floating-category-title">Economic helpers</p>`;
  economyCategory.append(
    createFloatingHelperRow("showGoldPerMinute", "Gold per minute", "Adds GPM to the player hover panel."),
    createFloatingHelperRow("showTeamGoldPerMinute", "Team gold per minute", "Lists each team's total GPM."),
    createFloatingHelperRow("showTopGoldPerMinute", "Top 10 gold per minute", "Lists the highest tracked player GPM."),
    createFloatingHelperRow("showTradeBalances", "Trade balances", "Shows observed trade imports and exports."),
  );

  const heatmapPanel = document.createElement("div");
  heatmapPanel.className = "openfront-helper-floating-subpanel";
  heatmapPanel.append(
    createFloatingHelperRow("showEconomyHeatmap", "Economic heatmap", "Highlights structures with observed trade revenue."),
  );
  const slider = document.createElement("label");
  slider.className = "openfront-helper-floating-slider";
  slider.innerHTML = `
    <strong>Economic heatmap intensity</strong>
    <span class="openfront-helper-floating-slider-value"></span>
    <input type="range" min="0" max="2" step="1" data-helper-setting="economyHeatmapIntensity">
  `;
  heatmapPanel.append(
    slider,
    createFloatingHelperRow("showExportPartnerHeatmap", "Export partner heatmap", "Hover a player to highlight export partners."),
  );
  economyCategory.append(heatmapPanel);
  body.append(gameCategory, economyCategory);

  panel.querySelector(".openfront-helper-floating-close")?.addEventListener("click", () => {
    saveSettings({
      ...settings,
      showFloatingHelpersPanel: false,
    }).catch((error) => {
      console.error("Failed to close floating helpers panel:", error);
    });
  });

  panel.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const key = target.dataset.helperSetting;
    if (!key) {
      return;
    }

    const nextSettings = {
      ...settings,
      [key]: target.type === "checkbox" ? target.checked : target.value,
    };
    if (key === "showEconomyHeatmap" && target.checked) {
      nextSettings.showExportPartnerHeatmap = false;
    }
    if (key === "showExportPartnerHeatmap" && target.checked) {
      nextSettings.showEconomyHeatmap = false;
    }
    if (key === "economyHeatmapIntensity") {
      nextSettings.economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(target.value);
    }

    saveSettings(nextSettings).catch((error) => {
      console.error("Failed to update floating helpers setting:", error);
    });
  });

  panel.addEventListener("input", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.dataset.helperSetting === "economyHeatmapIntensity"
    ) {
      const value = panel.querySelector(".openfront-helper-floating-slider-value");
      if (value) {
        value.textContent = getEconomyHeatmapIntensityLabel(target.value);
      }
    }
  });

  installFloatingHelpersDrag(panel);
  return panel;
}

function installFloatingHelpersDrag(panel) {
  const header = panel.querySelector(".openfront-helper-floating-header");
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
    setFloatingHelpersPosition(panel, left, top);
  });

  function finishDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragState = null;
    const rect = panel.getBoundingClientRect();
    saveSettings({
      ...settings,
      floatingHelpersPanelPosition: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      },
    }).catch((error) => {
      console.error("Failed to save floating helpers position:", error);
    });
  }

  header.addEventListener("pointerup", finishDrag);
  header.addEventListener("pointercancel", finishDrag);
}

function setFloatingHelpersPosition(panel, left, top) {
  panel.style.setProperty("--openfront-helper-left", `${Math.round(left)}px`);
  panel.style.setProperty("--openfront-helper-top", `${Math.round(top)}px`);
}

function positionFloatingHelpersPanel(panel) {
  const left = settings.floatingHelpersPanelPosition.left ?? window.innerWidth - 360;
  const top = settings.floatingHelpersPanelPosition.top ?? 92;
  const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
  const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
  setFloatingHelpersPosition(
    panel,
    Math.max(8, Math.min(maxLeft, left)),
    Math.max(8, Math.min(maxTop, top)),
  );
}

function updateFloatingHelpersPanel(panel) {
  for (const input of panel.querySelectorAll("[data-helper-setting]")) {
    if (!(input instanceof HTMLInputElement)) {
      continue;
    }

    const key = input.dataset.helperSetting;
    if (key === "economyHeatmapIntensity") {
      input.value = String(settings.economyHeatmapIntensity);
      const value = panel.querySelector(".openfront-helper-floating-slider-value");
      if (value) {
        value.textContent = getEconomyHeatmapIntensityLabel(settings.economyHeatmapIntensity);
      }
      continue;
    }

    input.checked = Boolean(settings[key]);
  }
}

function syncFloatingHelpersPanel() {
  let panel = document.getElementById(FLOATING_HELPERS_PANEL_ID);
  if (!settings.showFloatingHelpersPanel) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = createFloatingHelpersPanel();
    (document.body || document.documentElement).appendChild(panel);
    positionFloatingHelpersPanel(panel);
  }

  updateFloatingHelpersPanel(panel);
}

function normalizeComparableText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeMapToken(value) {
  return normalizeComparableText(value).replace(/[^a-z0-9]+/g, "");
}

function addMapTokensFromValue(value, tokens, depth = 0) {
  if (depth > 4 || value == null) {
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    const comparable = normalizeComparableText(value);
    const token = normalizeMapToken(value);
    if (comparable) {
      tokens.add(comparable);
    }
    if (token) {
      tokens.add(token);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      addMapTokensFromValue(entry, tokens, depth + 1);
    }
    return;
  }

  if (typeof value === "object") {
    for (const entry of Object.values(value)) {
      addMapTokensFromValue(entry, tokens, depth + 1);
    }
  }
}

function addMapTokensFromMapFields(value, tokens, depth = 0) {
  if (depth > 4 || value == null || typeof value !== "object") {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (normalizeMapToken(key).includes("map")) {
      addMapTokensFromValue(entry, tokens);
    }

    if (entry != null && typeof entry === "object") {
      addMapTokensFromMapFields(entry, tokens, depth + 1);
    }
  }
}

function getLobbyMapTokens(lobby) {
  const config = lobby?.gameConfig || {};
  const tokens = new Set();
  const candidateValues = [
    config.map,
    config.mapId,
    config.mapID,
    config.mapName,
    config.mapInfo,
    config.mapConfig,
    config.mapMetadata,
    config.gameMap,
    config.gameMapId,
    config.gameMapID,
    config.gameMapName,
    config.terrain,
    lobby?.map,
    lobby?.mapId,
    lobby?.mapID,
    lobby?.mapName,
    lobby?.gameMap,
    lobby?.gameMapId,
    lobby?.gameMapID,
    lobby?.gameMapName,
  ];

  for (const value of candidateValues) {
    addMapTokensFromValue(value, tokens);
  }
  addMapTokensFromMapFields(lobby, tokens);

  return tokens;
}

function mapMatchesTokens(map, tokens) {
  const candidates = [
    normalizeComparableText(map.id),
    normalizeComparableText(map.name),
    normalizeMapToken(map.id),
    normalizeMapToken(map.name),
  ];

  return candidates.some((candidate) => candidate && tokens.has(candidate));
}

function lobbyMatchesMapFilters(lobby) {
  const includedMaps = MAPS.filter((map) => settings.mapFilters[map.id]);
  const excludedMaps = MAPS.filter((map) => settings.mapExcludeFilters[map.id]);
  if (includedMaps.length === 0 && excludedMaps.length === 0) {
    return true;
  }

  const lobbyMapTokens = getLobbyMapTokens(lobby);
  if (lobbyMapTokens.size === 0) {
    return includedMaps.length === 0;
  }

  if (excludedMaps.some((map) => mapMatchesTokens(map, lobbyMapTokens))) {
    return false;
  }

  if (includedMaps.length === 0) {
    return true;
  }

  return includedMaps.some((map) => mapMatchesTokens(map, lobbyMapTokens));
}

function injectBridge() {
  if (window.__openfrontAutoJoinBridgeInjected) {
    return;
  }

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("page-bridge.js");
  script.async = false;
  script.dataset.openfrontAutoJoin = "true";
  script.addEventListener("load", () => {
    script.remove();
    syncHelpers();
  });
  script.addEventListener("error", () => {
    window.__openfrontAutoJoinBridgeInjected = false;
  });

  window.__openfrontAutoJoinBridgeInjected = true;
  (document.head || document.documentElement).appendChild(script);
}

function pruneCooldowns() {
  const now = Date.now();
  for (const [gameID, expiresAt] of lobbyCooldowns.entries()) {
    if (expiresAt <= now) {
      lobbyCooldowns.delete(gameID);
    }
  }
}

function resetPendingJoinIfExpired() {
  if (!pendingJoin) {
    return;
  }

  if (isInActiveGame() || Date.now() - pendingJoin.startedAt > JOIN_ATTEMPT_TIMEOUT_MS) {
    pendingJoin = null;
  }
}

function isInActiveGame() {
  if (document.body?.classList.contains("in-game")) {
    return true;
  }

  return /\/game\/[^/]+/.test(window.location.pathname) && window.location.search.includes("live");
}

function objectContainsFreeForAll(value, depth = 0) {
  if (depth > 4 || value == null) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = normalizeComparableText(value);
    return normalized === "free for all" || normalized.includes("free for all");
  }

  if (Array.isArray(value)) {
    return value.some((entry) => objectContainsFreeForAll(entry, depth + 1));
  }

  if (typeof value === "object") {
    return Object.values(value).some((entry) =>
      objectContainsFreeForAll(entry, depth + 1),
    );
  }

  return false;
}

function objectContainsPhrase(value, phrase, depth = 0) {
  if (depth > 4 || value == null) {
    return false;
  }

  if (typeof value === "string") {
    return normalizeComparableText(value).includes(phrase);
  }

  if (Array.isArray(value)) {
    return value.some((entry) => objectContainsPhrase(entry, phrase, depth + 1));
  }

  if (typeof value === "object") {
    return Object.values(value).some((entry) =>
      objectContainsPhrase(entry, phrase, depth + 1),
    );
  }

  return false;
}

function isFfaLobby(lobby, groupKey) {
  const gameMode = normalizeComparableText(lobby?.gameConfig?.gameMode);

  if (gameMode === "free for all" || gameMode === "ffa") {
    return true;
  }

  if (gameMode === "team") {
    return false;
  }

  if (objectContainsFreeForAll(lobby)) {
    return true;
  }

  return groupKey === "ffa";
}

function getTeamSizePerLobby(lobby) {
  const config = lobby?.gameConfig || {};
  const gameMode = normalizeComparableText(config.gameMode);
  if (gameMode !== "team") {
    return null;
  }

  const playerTeams = config.playerTeams;
  const normalizedTeams = normalizeComparableText(playerTeams);
  if (normalizedTeams === "duos") {
    return 2;
  }
  if (normalizedTeams === "trios") {
    return 3;
  }
  if (normalizedTeams === "quads") {
    return 4;
  }

  const maxPlayers = Number(config.maxPlayers);
  if (typeof playerTeams === "number" && Number.isFinite(playerTeams) && playerTeams > 0 && Number.isFinite(maxPlayers) && maxPlayers > 0) {
    return Math.floor(maxPlayers / playerTeams);
  }

  if (objectContainsPhrase(lobby, "teams of 2")) {
    return 2;
  }
  if (objectContainsPhrase(lobby, "teams of 3")) {
    return 3;
  }
  if (objectContainsPhrase(lobby, "teams of 4")) {
    return 4;
  }
  if (objectContainsPhrase(lobby, "teams of 5")) {
    return 5;
  }
  if (objectContainsPhrase(lobby, "teams of 6")) {
    return 6;
  }

  return null;
}

function extractTrackedFilters(lobby, groupKey) {
  const config = lobby?.gameConfig || {};
  const publicModifiers = config.publicGameModifiers || {};
  const startingGoldValue = publicModifiers.startingGold ?? config.startingGold;
  const startingGold =
    typeof startingGoldValue === "number" && Number.isFinite(startingGoldValue)
      ? startingGoldValue
      : 0;
  const goldMultiplier = Number(
    publicModifiers.goldMultiplier ?? config.goldMultiplier ?? 0,
  );
  const teamSize = getTeamSizePerLobby(lobby);

  return {
    ffaLobby: isFfaLobby(lobby, groupKey),
    duosLobby: teamSize === 2 || objectContainsPhrase(lobby, "teams of 2"),
    triosLobby: teamSize === 3 || objectContainsPhrase(lobby, "teams of 3"),
    quadsLobby: teamSize === 4 || objectContainsPhrase(lobby, "teams of 4"),
    teamsLargerThanTriosLobby: teamSize !== null && teamSize > 4,
    startingGold0M: startingGold === 0,
    randomSpawn: Boolean(publicModifiers.isRandomSpawn ?? config.randomSpawn),
    alliancesDisabled: Boolean(
      publicModifiers.isAlliancesDisabled ?? config.disableAlliances,
    ),
    startingGold5M: startingGold === 5_000_000,
    startingGold25M: startingGold === 25_000_000,
    goldMultiplier2x: goldMultiplier === 2,
  };
}

function lobbyMatchesFilters(lobby, groupKey) {
  if (!lobbyMatchesMapFilters(lobby)) {
    return false;
  }

  const modifiers = extractTrackedFilters(lobby, groupKey);
  const selectedLobbyTypeIncludes = LOBBY_TYPE_FILTER_KEYS.filter(
    (key) => settings.includeFilters[key],
  );
  const selectedLobbyTypeExcludes = LOBBY_TYPE_FILTER_KEYS.filter(
    (key) => settings.excludeFilters[key],
  );

  if (selectedLobbyTypeExcludes.some((key) => modifiers[key] === true)) {
    return false;
  }

  if (
    selectedLobbyTypeIncludes.length > 0 &&
    !selectedLobbyTypeIncludes.some((key) => modifiers[key] === true)
  ) {
    return false;
  }

  const nonStartGoldMatches = FILTER_KEYS.every((key) => {
    if (START_GOLD_FILTER_KEYS.includes(key) || LOBBY_TYPE_FILTER_KEYS.includes(key)) {
      return true;
    }

    if (settings.includeFilters[key] && !modifiers[key]) {
      return false;
    }

    if (settings.excludeFilters[key] && modifiers[key]) {
      return false;
    }

    return true;
  });

  if (!nonStartGoldMatches) {
    return false;
  }

  const selectedStartGoldIncludes = START_GOLD_FILTER_KEYS.filter(
    (key) => settings.includeFilters[key],
  );
  const selectedStartGoldExcludes = START_GOLD_FILTER_KEYS.filter(
    (key) => settings.excludeFilters[key],
  );

  const startGoldExcluded = selectedStartGoldExcludes.some(
    (key) => modifiers[key] === true,
  );

  if (startGoldExcluded) {
    return false;
  }

  if (selectedStartGoldIncludes.length === 0) {
    return true;
  }

  return selectedStartGoldIncludes.some((key) => modifiers[key] === true);
}

function flattenLobbies(snapshot) {
  const groups = snapshot?.games;
  if (!groups || typeof groups !== "object") {
    return [];
  }

  const orderedKeys = [...PREFERRED_GROUP_ORDER];
  for (const key of Object.keys(groups)) {
    if (!orderedKeys.includes(key)) {
      orderedKeys.push(key);
    }
  }

  const lobbies = [];
  for (const key of orderedKeys) {
    const value = groups[key];
    if (Array.isArray(value)) {
      lobbies.push(
        ...value.map((lobby) => ({
          groupKey: key,
          lobby,
        })),
      );
    }
  }

  return lobbies;
}

function findMatchingLobby(snapshot) {
  pruneCooldowns();

  const match = flattenLobbies(snapshot).find(({ lobby, groupKey }) => {
    if (!lobby?.gameID || lobbyCooldowns.has(lobby.gameID)) {
      return false;
    }

    return lobbyMatchesFilters(lobby, groupKey);
  });

  return match?.lobby ?? null;
}

function ensureJoinAlertAudio() {
  if (joinAlertAudio) {
    return joinAlertAudio;
  }

  joinAlertAudio = new Audio(chrome.runtime.getURL("assets/autojoin.wav"));
  joinAlertAudio.preload = "auto";
  return joinAlertAudio;
}

function playJoinAlert() {
  try {
    const audio = ensureJoinAlertAudio();
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (_error) {
    // Ignore audio playback failures caused by browser autoplay rules.
  }
}

async function disableAutoJoin() {
  settings = {
    ...settings,
    enabled: false,
    searchStartedAt: null,
  };

  await chrome.storage.local.set({
    [STORAGE_KEY]: settings,
  });
}

async function requestJoin(lobby) {
  pendingJoin = {
    gameID: lobby.gameID,
    startedAt: Date.now(),
  };

  lobbyCooldowns.set(lobby.gameID, Date.now() + LOBBY_RETRY_COOLDOWN_MS);
  await disableAutoJoin();
  playJoinAlert();

  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "JOIN_PUBLIC_LOBBY",
      payload: {
        gameID: lobby.gameID,
        publicLobbyInfo: lobby,
      },
    },
    "*",
  );
}

function tryAutoJoin() {
  resetPendingJoinIfExpired();

  if (!settings.enabled || !latestLobbySnapshot || pendingJoin || isInActiveGame()) {
    return;
  }

  const matchingLobby = findMatchingLobby(latestLobbySnapshot);
  if (!matchingLobby) {
    return;
  }

  requestJoin(matchingLobby).catch((error) => {
    pendingJoin = null;
    console.error("Failed to auto-join matching lobby:", error);
  });
}

function handleBridgeMessage(event) {
  if (event.source !== window) {
    return;
  }

  const data = event.data;
  if (!data || data.source !== BRIDGE_SOURCE_PAGE) {
    return;
  }

  if (data.type === "PUBLIC_LOBBIES_UPDATE") {
    latestLobbySnapshot = data.payload;
    tryAutoJoin();
  }
}

function handleStorageChange(changes, areaName) {
  if (areaName !== "local" || !changes[STORAGE_KEY]) {
    return;
  }

  settings = normalizeSettings(changes[STORAGE_KEY].newValue);
  syncHelpers();
  syncFloatingHelpersPanel();
  if (!settings.enabled) {
    pendingJoin = null;
  }
  tryAutoJoin();
}

async function init() {
  injectBridge();
  window.addEventListener("message", handleBridgeMessage);
  chrome.storage.onChanged.addListener(handleStorageChange);
  await loadSettings();
  window.addEventListener("resize", () => {
    const panel = document.getElementById(FLOATING_HELPERS_PANEL_ID);
    if (panel) {
      positionFloatingHelpersPanel(panel);
    }
  });
  ensureJoinAlertAudio();
  tryAutoJoin();
  window.setInterval(resetPendingJoinIfExpired, 1000);
}

init().catch((error) => {
  console.error("OpenFront Auto Join failed to initialize:", error);
});
