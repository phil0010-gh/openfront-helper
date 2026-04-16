(function initPopupState(globalScope) {
  const shared = globalScope.OpenFrontHelperSettings;
  const popup = (globalScope.OpenFrontPopup = globalScope.OpenFrontPopup || {});

  const refs = {
    powerButton: document.getElementById("powerButton"),
    appTitleButton: document.getElementById("appTitleButton"),
    statusText: document.getElementById("statusText"),
    searchTimer: document.getElementById("searchTimer"),
    searchTimerValue: document.getElementById("searchTimerValue"),
    filtersForm: document.getElementById("filtersForm"),
    helpersPopoutButton: document.getElementById("helpersPopoutButton"),
    mapFiltersContainer: document.getElementById("mapFilters"),
    mapSearchInput: document.getElementById("mapSearchInput"),
    clearMapFiltersButton: document.getElementById("clearMapFiltersButton"),
    installNotice: document.getElementById("installNotice"),
    dismissInstallNoticeButton: document.getElementById(
      "dismissInstallNoticeButton",
    ),
    whatsNewNotice: document.getElementById("whatsNewNotice"),
    dismissWhatsNewNoticeButton: document.getElementById(
      "dismissWhatsNewNoticeButton",
    ),
    helperInfoPopup: document.getElementById("helperInfoPopup"),
    helperInfoTitle: document.getElementById("helperInfoTitle"),
    helperInfoImage: document.getElementById("helperInfoImage"),
    helperInfoCloseButton: document.getElementById("helperInfoCloseButton"),
    applySelectiveTradePolicyButton: document.getElementById(
      "applySelectiveTradePolicyButton",
    ),
    economyHeatmapIntensityValue: document.getElementById(
      "economyHeatmapIntensityValue",
    ),
  };

  popup.shared = shared;
  popup.refs = refs;
  popup.state = {
    settings: shared.normalizeSettings({}, { ensureActiveSearchTimestamp: true }),
    showInstallNotice: false,
    showWhatsNewNotice: false,
    activeHelperInfoButton: null,
    timerInterval: null,
  };

  popup.normalizeSearchText = function normalizeSearchText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  };

  popup.formatElapsedTime = function formatElapsedTime(startedAt) {
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000),
    );
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  };

  popup.hasSelectedMapFilters = function hasSelectedMapFilters() {
    return shared.MAP_IDS.some((id) => popup.state.settings.mapFilters[id]);
  };

  popup.hasExcludedMapFilters = function hasExcludedMapFilters() {
    return shared.MAP_IDS.some((id) => popup.state.settings.mapExcludeFilters[id]);
  };

  popup.hasSelectedOptions = function hasSelectedOptions() {
    return (
      shared.FILTER_KEYS.some(
        (key) =>
          popup.state.settings.includeFilters[key] ||
          popup.state.settings.excludeFilters[key],
      ) ||
      popup.hasSelectedMapFilters() ||
      popup.hasExcludedMapFilters()
    );
  };

  popup.loadSettings = async function loadSettings() {
    const stored = await chrome.storage.local.get([
      shared.STORAGE_KEY,
      shared.INSTALL_NOTICE_KEY,
      shared.WHATS_NEW_NOTICE_KEY,
    ]);
    const rawSettings = stored[shared.STORAGE_KEY] || {};

    popup.state.settings = shared.normalizeSettings(rawSettings, {
      ensureActiveSearchTimestamp: true,
    });

    if (popup.state.settings.enabled && !rawSettings.searchStartedAt) {
      await popup.saveSettings();
    }

    popup.state.showInstallNotice = stored[shared.INSTALL_NOTICE_KEY] === true;
    popup.state.showWhatsNewNotice =
      stored[shared.WHATS_NEW_NOTICE_KEY] === true;
  };

  popup.saveSettings = async function saveSettings() {
    await chrome.storage.local.set({
      [shared.STORAGE_KEY]: popup.state.settings,
    });
  };

  popup.resetAutoJoinIfEmpty = function resetAutoJoinIfEmpty() {
    if (!popup.hasSelectedOptions()) {
      popup.state.settings.enabled = false;
      popup.state.settings.searchStartedAt = null;
    }
  };

  for (const legacyCard of Array.from(
    document.querySelectorAll(".helper-action-card[hidden]"),
  )) {
    legacyCard.remove();
  }
})(globalThis);
