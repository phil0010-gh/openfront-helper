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
let lastProcessedSelectiveTradePolicyRequestAt = null;
let selectiveTradePolicyAvailable = false;

// Shared settings, defaults, and filter normalization live in `shared/settings.js`
// so popup and content stay in sync.

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

function syncNukeLandingZonesHelper() {
  window.postMessage(
    {
      source: BRIDGE_SOURCE_EXTENSION,
      type: "SHOW_NUKE_LANDING_ZONES",
      payload: {
        enabled: Boolean(settings.showNukeLandingZones),
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

function syncHelpers() {
  syncBotNationMarkers();
  syncGoldPerMinuteHelper();
  syncTeamGoldPerMinuteHelper();
  syncTopGoldPerMinuteHelper();
  syncHoveredAlliesHelper();
  syncTradeBalancesHelper();
  syncSelectiveTradePolicyToggle();
  syncFpsSaverHelper();
  syncAttackAmountsHelper();
  syncNukeLandingZonesHelper();
  syncEconomyHeatmapHelper();
  syncExportPartnerHeatmapHelper();
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  settings = normalizeSettings(stored[STORAGE_KEY]);
  selectiveTradePolicyAvailable = Boolean(settings.autoCancelDeniedTradesAvailable);
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

