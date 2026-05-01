// Shared content-script state and helper bridge synchronization.

const {
  STORAGE_KEY,
  FILTER_KEYS,
  LOBBY_TYPE_FILTER_KEYS,
  START_GOLD_FILTER_KEYS,
  MAPS,
  MAP_IDS,
  createDefaultMapFilters,
  normalizeSettings,
  normalizeEconomyHeatmapIntensity,
  getEconomyHeatmapIntensityLabel,
} = globalThis.OpenFrontHelperSettings;
const i18n = globalThis.OpenFrontHelperI18n;

const BRIDGE_SOURCE_PAGE = "openfront-autojoin-page";
const BRIDGE_SOURCE_EXTENSION = "openfront-autojoin-extension";
const FLOATING_HELPERS_PANEL_ID = "openfront-helper-floating-helpers-panel";
const FLOATING_HELPERS_STYLE_ID = "openfront-helper-floating-helpers-styles";
const JOIN_ATTEMPT_TIMEOUT_MS = 12000;
const LOBBY_RETRY_COOLDOWN_MS = 30000;
const PREFERRED_GROUP_ORDER = ["special", "ffa", "team"];

const lobbyCooldowns = new Map();

let settings = normalizeSettings();
let latestLobbySnapshot = null;
let pendingJoin = null;
let joinAlertAudio = null;
let customJoinAlertAudio = null;
let hasCustomNotificationSound = false;
let customNotificationSoundData = null;
let lastProcessedSelectiveTradePolicyRequestAt = null;
let selectiveTradePolicyAvailable = false;
let cheatsAvailable = false;
let translations = i18n?.DEFAULT_TRANSLATIONS || {};

// Shared settings, defaults, and filter normalization live in `shared/settings.js`
// so popup and content stay in sync.

function t(key) {
  return i18n?.getMessage(translations, key) || key;
}

async function loadContentTranslations() {
  if (!i18n) {
    return;
  }
  translations = await i18n.loadBundle(settings.language);
}

// Helper bridge sync -------------------------------------------------------
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

function syncAllianceRequestsPanelHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_ALLIANCE_REQUESTS_PANEL",
      payload: {
        enabled: Boolean(settings.showAllianceRequestsPanel),
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

function syncNukePredictionHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_NUKE_PREDICTION",
      payload: {
        enabled: Boolean(settings.showNukePrediction),
      },
    },
    "*",
  );
}

function syncBoatPredictionHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_BOAT_PREDICTION",
      payload: {
        enabled: Boolean(settings.showBoatPrediction),
      },
    },
    "*",
  );
}

function syncNukeSuggestionsHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_NUKE_SUGGESTIONS",
      payload: {
        enabled: Boolean(settings.showNukeSuggestions && cheatsAvailable),
      },
    },
    "*",
  );
}

function syncAutoNukeHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SET_AUTO_NUKE",
      payload: {
        enabled: Boolean(settings.autoNuke && cheatsAvailable),
        includeAllies: Boolean(settings.autoNukeIncludeAllies),
      },
    },
    "*",
  );
}

function syncSend1PercentBoatHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SET_SEND_1_PERCENT_BOAT",
      payload: {
        enabled: Boolean(settings.send1PercentBoat),
        contextMenu: settings.send1PercentBoatContextMenu !== false,
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

function syncNukeTargetHeatmapHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_NUKE_TARGET_HEATMAP",
      payload: {
        enabled: Boolean(settings.showNukeTargetHeatmap),
      },
    },
    "*",
  );
}

function syncSelectiveTradePolicyToggle() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SET_SELECTIVE_TRADE_POLICY",
      payload: {
        enabled: Boolean(settings.selectiveTradePolicyEnabled),
      },
    },
    "*",
  );
}

function updateAutoCancelDeniedTradesAvailability(available) {
  const nextAvailable = Boolean(available);
  const availabilityChanged =
    nextAvailable !== selectiveTradePolicyAvailable ||
    nextAvailable !== Boolean(settings.autoCancelDeniedTradesAvailable);

  selectiveTradePolicyAvailable = nextAvailable;

  if (availabilityChanged) {
    saveSettings({
      ...settings,
      autoCancelDeniedTradesAvailable: nextAvailable,
      selectiveTradePolicyEnabled:
        settings.selectiveTradePolicyEnabled && nextAvailable,
    }).catch((error) => {
      console.error("Failed to sync denied trade cancellation availability:", error);
    });
  }

  syncFloatingHelpersPanel();
}

function updateCheatsAvailability(available) {
  const nextAvailable = Boolean(available);
  const availabilityChanged =
    nextAvailable !== cheatsAvailable ||
    nextAvailable !== Boolean(settings.cheatsAvailable);

  cheatsAvailable = nextAvailable;

  if (availabilityChanged) {
    saveSettings({
      ...settings,
      cheatsAvailable: nextAvailable,
    }).catch((error) => {
      console.error("Failed to sync cheats availability:", error);
    });
  }

  syncHelpers();
}

function syncHelpers() {
  syncBotNationMarkers();
  syncGoldPerMinuteHelper();
  syncTeamGoldPerMinuteHelper();
  syncTopGoldPerMinuteHelper();
  syncHoveredAlliesHelper();
  syncAllianceRequestsPanelHelper();
  syncTradeBalancesHelper();
  syncSelectiveTradePolicyToggle();
  syncNukePredictionHelper();
  syncBoatPredictionHelper();
  syncNukeSuggestionsHelper();
  syncAutoNukeHelper();
  syncSend1PercentBoatHelper();
  syncEconomyHeatmapHelper();
  syncExportPartnerHeatmapHelper();
  syncNukeTargetHeatmapHelper();
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  settings = normalizeSettings(stored[STORAGE_KEY]);
  await loadContentTranslations();
  selectiveTradePolicyAvailable = Boolean(settings.autoCancelDeniedTradesAvailable);
  cheatsAvailable = Boolean(settings.cheatsAvailable);
  lastProcessedSelectiveTradePolicyRequestAt =
    settings.applySelectiveTradePolicyRequestAt;
  syncHelpers();
  syncFloatingHelpersPanel();
}

async function saveSettings(nextSettings) {
  settings = normalizeSettings(nextSettings);
  await chrome.storage.local.set({
    [STORAGE_KEY]: settings,
  });
}
