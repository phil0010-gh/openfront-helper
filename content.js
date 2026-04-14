const STORAGE_KEY = "settings";
const BRIDGE_SOURCE_PAGE = "openfront-autojoin-page";
const BRIDGE_SOURCE_EXTENSION = "openfront-autojoin-extension";
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
  showExportPartnerHeatmap: false,
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

  const normalized = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
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

  return normalized;
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
  ensureJoinAlertAudio();
  tryAutoJoin();
  window.setInterval(resetPendingJoinIfExpired, 1000);
}

init().catch((error) => {
  console.error("OpenFront Auto Join failed to initialize:", error);
});
