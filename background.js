const INSTALL_NOTICE_KEY = "installReloadNoticePending";
const WHATS_NEW_NOTICE_KEY = "whatsNewNoticePending";
const STORAGE_KEY = "settings";
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
    chrome.storage.local.set({
      [INSTALL_NOTICE_KEY]: true,
    });
    return;
  }


  if (details.reason === "update") {
    chrome.storage.local.set({
      [WHATS_NEW_NOTICE_KEY]: true,
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
