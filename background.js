const WHATS_NEW_NOTICE_KEY = "whatsNewNoticePending";
const ANALYTICS_SUPPORT_NOTICE_KEY = "analyticsSupportNoticePending";
const STORAGE_KEY = "settings";
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

  setAutoJoinIcon(changes[STORAGE_KEY].newValue);
});

syncAutoJoinIcon().catch((error) => {
  console.error("Failed to sync autojoin icon:", error);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "ANALYTICS_EVENT") {
    trackAnalyticsEvent(message.name, message.params).catch((error) => {
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
