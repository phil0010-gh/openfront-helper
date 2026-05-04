(function initPopupState(globalScope) {
  const shared = globalScope.OpenFrontHelperSettings;
  const i18n = globalScope.OpenFrontHelperI18n;
  const popup = (globalScope.OpenFrontPopup = globalScope.OpenFrontPopup || {});

  const refs = {
    powerButton: document.getElementById("powerButton"),
    settingsButton: document.getElementById("settingsButton"),
    settingsPanel: document.getElementById("settingsPanel"),
    languagePanel: document.getElementById("languagePanel"),
    chatToggleButton: document.getElementById("chatToggleButton"),
    analyticsOptInButton: document.getElementById("analyticsOptInButton"),
    analyticsSupportPopup: document.getElementById("analyticsSupportPopup"),
    analyticsSupportDismissButton: document.getElementById(
      "analyticsSupportDismissButton",
    ),
    analyticsSupportReviewButton: document.getElementById(
      "analyticsSupportReviewButton",
    ),
    analyticsConsentPopup: document.getElementById("analyticsConsentPopup"),
    analyticsConsentCloseButton: document.getElementById("analyticsConsentCloseButton"),
    analyticsConsentCancelButton: document.getElementById("analyticsConsentCancelButton"),
    analyticsConsentEnableButton: document.getElementById("analyticsConsentEnableButton"),
    chatSafetyPopup: document.getElementById("chatSafetyPopup"),
    chatSafetyCancelButton: document.getElementById("chatSafetyCancelButton"),
    chatSafetyEnableButton: document.getElementById("chatSafetyEnableButton"),
    openFrontReloadPopup: document.getElementById("openFrontReloadPopup"),
    openFrontReloadCancelButton: document.getElementById("openFrontReloadCancelButton"),
    openFrontReloadButton: document.getElementById("openFrontReloadButton"),
    macrosPanel: document.getElementById("macrosPanel"),
    send1PercentBoatToggle: document.getElementById("send1PercentBoatToggle"),
    send1PercentBoatSubOptions: document.getElementById("send1PercentBoatSubOptions"),
    send1PercentBoatContextMenuToggle: document.getElementById("send1PercentBoatContextMenuToggle"),
    languageSearchInput: document.getElementById("languageSearchInput"),
    languageList: document.getElementById("languageList"),
    settingsSoundInput: document.getElementById("settingsSoundInput"),
    settingsSoundName: document.getElementById("settingsSoundName"),
    settingsSoundTestButton: document.getElementById("settingsSoundTestButton"),
    settingsSoundUploadButton: document.getElementById("settingsSoundUploadButton"),
    settingsSoundClearButton: document.getElementById("settingsSoundClearButton"),
    statusText: document.getElementById("statusText"),
    searchTimer: document.getElementById("searchTimer"),
    searchTimerValue: document.getElementById("searchTimerValue"),
    minLobbySizeInput: document.getElementById("minLobbySizeInput"),
    lobbyForecastPanel: document.getElementById("lobbyForecastPanel"),
    forecastEtaValue: document.getElementById("forecastEtaValue"),
    forecastChanceValue: document.getElementById("forecastChanceValue"),
    forecastMedianValue: document.getElementById("forecastMedianValue"),
    filtersForm: document.getElementById("filtersForm"),
    helpersPopoutButton: document.getElementById("helpersPopoutButton"),
    mapFiltersContainer: document.getElementById("mapFilters"),
    mapSearchInput: document.getElementById("mapSearchInput"),
    clearMapFiltersButton: document.getElementById("clearMapFiltersButton"),
    whatsNewNotice: null,
    dismissWhatsNewNoticeButton: null,
    helperInfoPopup: document.getElementById("helperInfoPopup"),
    helperInfoTitle: document.getElementById("helperInfoTitle"),
    helperInfoImage: document.getElementById("helperInfoImage"),
    helperInfoCloseButton: document.getElementById("helperInfoCloseButton"),
    helperInfoNav: document.getElementById("helperInfoNav"),
    helperInfoPrevButton: document.getElementById("helperInfoPrevButton"),
    helperInfoNextButton: document.getElementById("helperInfoNextButton"),
    helperInfoNavCounter: document.getElementById("helperInfoNavCounter"),
    joinNotificationToggle: document.getElementById("joinNotificationToggle"),
    applySelectiveTradePolicyInput: document.getElementById(
      "applySelectiveTradePolicyInput",
    ),
    economyHeatmapIntensityValue: document.getElementById(
      "economyHeatmapIntensityValue",
    ),
    versionLabel: document.getElementById("versionLabel"),
  };

  popup.shared = shared;
  popup.i18n = i18n;
  popup.refs = refs;
  popup.state = {
    settings: shared.normalizeSettings({}, { ensureActiveSearchTimestamp: true }),
    translations: i18n.DEFAULT_TRANSLATIONS,
    languageOptions: i18n.createLanguageOptions("en"),
    showAnalyticsSupportNotice: false,
    activeHelperInfoButton: null,
    helperInfoImages: null,
    helperInfoImageIndex: 0,
    openFrontReloadTabId: null,
    timerInterval: null,
  };

  popup.t = function translate(key) {
    return i18n.getMessage(popup.state.translations, key);
  };

  popup.localize = function localize(root = document.body) {
    i18n.localizeElement(root, popup.state.translations);
  };

  popup.loadTranslations = async function loadTranslations() {
    popup.state.translations = await i18n.loadBundle(popup.state.settings.language);
    popup.state.languageOptions = i18n.createLanguageOptions(
      popup.state.settings.language,
    );
    document.documentElement.lang = popup.state.settings.language;
    document.title = popup.t("Auto-Join & Helpers for OpenFront");
    popup.localize();
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

  popup.formatDurationShort = function formatDurationShort(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes <= 0) {
      return `${remainingSeconds}s`;
    }
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  popup.hasSelectedMapFilters = function hasSelectedMapFilters() {
    return shared.MAP_IDS.some((id) => popup.state.settings.mapFilters[id]);
  };

  popup.hasExcludedMapFilters = function hasExcludedMapFilters() {
    return shared.MAP_IDS.some((id) => popup.state.settings.mapExcludeFilters[id]);
  };

  popup.hasSelectedOptions = function hasSelectedOptions() {
    return (
      popup.state.settings.minLobbySize != null ||
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
      shared.ANALYTICS_SUPPORT_NOTICE_KEY,
    ]);
    const rawSettings = stored[shared.STORAGE_KEY] || {};

    popup.state.settings = shared.normalizeSettings(rawSettings, {
      ensureActiveSearchTimestamp: true,
    });

    if (popup.state.settings.enabled && !rawSettings.searchStartedAt) {
      await popup.saveSettings();
    }

    popup.state.showAnalyticsSupportNotice =
      stored[shared.ANALYTICS_SUPPORT_NOTICE_KEY] === true &&
      !popup.state.settings.analyticsEnabled;
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
