const WHATS_NEW_NOTICE_KEY = "whatsNewNoticePending";
const ANALYTICS_SUPPORT_NOTICE_KEY = "analyticsSupportNoticePending";
const STORAGE_KEY = "settings";
const TRACKED_FEATURE_SETTING_NAMES = {
  enabled: "auto_join",
  joinNotification: "join_notification",
  showFloatingHelpersPanel: "floating_helpers_panel",
  showExtensionChat: "extension_chat",
  markBotNationsRed: "mark_bot_nations_red",
  showGoldPerMinute: "gold_per_minute",
  showTeamGoldPerMinute: "team_gold_per_minute",
  showTopGoldPerMinute: "top_gold_per_minute",
  markHoveredAlliesGreen: "hovered_allies",
  showAllianceRequestsPanel: "alliance_requests_panel",
  showTradeBalances: "trade_balances",
  selectiveTradePolicyEnabled: "selective_trade_policy",
  showNukePrediction: "nuke_prediction",
  showNukeSuggestions: "nuke_suggestions",
  autoNuke: "auto_nuke",
  showBoatPrediction: "boat_prediction",
  send1PercentBoat: "send_1_percent_boat",
  send1PercentBoatContextMenu: "send_1_percent_boat_context_menu",
  showEconomyHeatmap: "economy_heatmap",
  showExportPartnerHeatmap: "export_partner_heatmap",
};
importScripts("analytics-config.js");
importScripts("analytics.js");
const DEFAULT_ICON = {
  16: "assets/icon-16.png",
  32: "assets/icon-32.png",
  48: "assets/icon-48.png",
  128: "assets/icon-128.png",
};
const ACTIVE_ICON = {
  16: "assets/icon-active-16.png",
  32: "assets/icon-active-32.png",
  48: "assets/icon-active-48.png",
  128: "assets/icon-active-128.png",
};

function setAutoJoinIcon(settings = {}) {
  chrome.action.setIcon({
    path: settings?.enabled ? ACTIVE_ICON : DEFAULT_ICON,
  });
}

function trackSettingsDiff(previousSettings = {}, nextSettings = {}) {
  for (const [key, featureName] of Object.entries(TRACKED_FEATURE_SETTING_NAMES)) {
    const previousValue = previousSettings?.[key] === true;
    const nextValue = nextSettings?.[key] === true;
    if (previousValue === nextValue) {
      continue;
    }

    trackAnalyticsEvent("feature_config_changed", {
      feature_name: featureName,
      enabled: nextValue,
      selected_language: String(nextSettings?.language || "unknown"),
    }).catch((error) => {
      console.error(`Failed to track analytics feature toggle for ${key}:`, error);
    });
  }
}

async function syncAutoJoinIcon() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  setAutoJoinIcon(stored[STORAGE_KEY]);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    trackAnalyticsEvent("extension_installed").catch((error) => {
      console.error("Failed to track analytics event:", error);
    });
    return;
  }

  if (details.reason === "update") {
    trackAnalyticsEvent("extension_updated").catch((error) => {
      console.error("Failed to track analytics event:", error);
    });
    chrome.storage.local.get(STORAGE_KEY).then((stored) => {
      const analyticsEnabled = stored[STORAGE_KEY]?.analyticsEnabled === true;
      return chrome.storage.local.set({
        [WHATS_NEW_NOTICE_KEY]: true,
        [ANALYTICS_SUPPORT_NOTICE_KEY]: !analyticsEnabled,
      });
    }).catch((error) => {
      console.error("Failed to prepare update notices:", error);
    });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[STORAGE_KEY]) {
    return;
  }

  const settingsChange = changes[STORAGE_KEY];
  setAutoJoinIcon(settingsChange.newValue);
  trackSettingsDiff(settingsChange.oldValue, settingsChange.newValue);
});

syncAutoJoinIcon().catch((error) => {
  console.error("Failed to sync autojoin icon:", error);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ANALYTICS_EVENT") {
    trackAnalyticsEvent(message.name, message.params, {
      userProperties: message.userProperties,
    }).catch((error) => {
      console.error("Failed to track analytics event:", error);
    });
    return;
  }

  if (message?.type === "SHOW_JOIN_NOTIFICATION") {
    trackAnalyticsEvent("join_notification_shown").catch((error) => {
      console.error("Failed to track analytics event:", error);
    });
    chrome.windows.create({
      url: chrome.runtime.getURL("game-found.html"),
      type: "popup",
      width: 320,
      height: 180,
      focused: true,
    });
  }
});
