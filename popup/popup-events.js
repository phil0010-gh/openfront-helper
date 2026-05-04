(function initPopupEvents(globalScope) {
  const popup = globalScope.OpenFrontPopup;
  const { refs, shared, state } = popup;

  async function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes[shared.STORAGE_KEY]) {
      return;
    }

    const previousLanguage = state.settings.language;
    state.settings = shared.normalizeSettings(changes[shared.STORAGE_KEY].newValue, {
      ensureActiveSearchTimestamp: true,
    });
    if (state.settings.language !== previousLanguage) {
      await popup.loadTranslations();
    }
    popup.render();
  }

  async function updateBooleanSetting(settingName, checked) {
    state.settings[settingName] = checked;
    await popup.saveSettings();
    popup.render();
  }

  const SOUND_KEY = "joinNotificationSoundData";
  const SOUND_NAME_KEY = "joinNotificationSoundName";
  const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
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

  function getSelectedLanguage(settings = state.settings) {
    return String(settings?.language || "unknown");
  }

  function getEnabledTrackedFeatureNames(settings = state.settings) {
    return Object.entries(TRACKED_FEATURE_SETTING_NAMES)
      .filter(([settingName]) => settings?.[settingName] === true)
      .map(([, featureName]) => featureName);
  }

  function sendAnalyticsEvent(name, params = {}, userProperties = {}) {
    return chrome.runtime.sendMessage({
      type: "ANALYTICS_EVENT",
      name,
      params,
      userProperties,
    });
  }

  async function trackPopupAnalyticsSnapshot() {
    if (!state.settings.analyticsEnabled) {
      return;
    }

    const selectedLanguage = getSelectedLanguage();
    const enabledFeatureNames = getEnabledTrackedFeatureNames();
    const userProperties = {
      selected_language: selectedLanguage,
      enabled_feature_count: enabledFeatureNames.length,
    };

    await sendAnalyticsEvent(
      "popup_opened",
      {
        selected_language: selectedLanguage,
        enabled_feature_count: enabledFeatureNames.length,
      },
      userProperties,
    );

    await Promise.all(
      enabledFeatureNames.map((featureName) =>
        sendAnalyticsEvent(
          "feature_active_snapshot",
          {
            feature_name: featureName,
            selected_language: selectedLanguage,
          },
          userProperties,
        ).catch((error) => {
          console.error(`Failed to track analytics feature snapshot for ${featureName}:`, error);
        }),
      ),
    );
  }

  function closeAnalyticsConsentPopup() {
    if (refs.analyticsConsentPopup instanceof HTMLElement) {
      refs.analyticsConsentPopup.hidden = true;
      refs.analyticsConsentPopup.setAttribute("aria-hidden", "true");
    }
  }

  async function dismissAnalyticsSupportNotice() {
    state.showAnalyticsSupportNotice = false;
    await chrome.storage.local.set({
      [shared.ANALYTICS_SUPPORT_NOTICE_KEY]: false,
    });
    popup.render();
  }

  function openAnalyticsConsentPopup() {
    if (refs.analyticsConsentPopup instanceof HTMLElement) {
      refs.settingsPanel.hidden = true;
      refs.settingsButton.setAttribute("aria-expanded", "false");
      closeChatSafetyPopup();
      closeOpenFrontReloadPopup();
      refs.analyticsConsentPopup.hidden = false;
      refs.analyticsConsentPopup.setAttribute("aria-hidden", "false");
      refs.analyticsConsentEnableButton?.focus();
    }
  }

  function closeChatSafetyPopup() {
    if (refs.chatSafetyPopup instanceof HTMLElement) {
      refs.chatSafetyPopup.hidden = true;
      refs.chatSafetyPopup.setAttribute("aria-hidden", "true");
    }
  }

  function closeOpenFrontReloadPopup() {
    if (refs.openFrontReloadPopup instanceof HTMLElement) {
      refs.openFrontReloadPopup.hidden = true;
      refs.openFrontReloadPopup.setAttribute("aria-hidden", "true");
    }
    state.openFrontReloadTabId = null;
  }

  function openChatSafetyPopup() {
    if (refs.chatSafetyPopup instanceof HTMLElement) {
      refs.settingsPanel.hidden = true;
      refs.settingsButton.setAttribute("aria-expanded", "false");
      closeAnalyticsConsentPopup();
      closeOpenFrontReloadPopup();
      refs.chatSafetyPopup.hidden = false;
      refs.chatSafetyPopup.setAttribute("aria-hidden", "false");
      refs.chatSafetyEnableButton?.focus();
    }
  }

  function openOpenFrontReloadPopup(tabId) {
    if (refs.openFrontReloadPopup instanceof HTMLElement) {
      state.openFrontReloadTabId = tabId;
      refs.settingsPanel.hidden = true;
      refs.settingsButton.setAttribute("aria-expanded", "false");
      closeAnalyticsConsentPopup();
      closeChatSafetyPopup();
      refs.openFrontReloadPopup.hidden = false;
      refs.openFrontReloadPopup.setAttribute("aria-hidden", "false");
      refs.openFrontReloadButton?.focus();
    }
  }

  async function getActiveOpenFrontTab() {
    if (!chrome.tabs?.query) {
      return null;
    }
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id || !String(tab.url || "").startsWith("https://openfront.io/")) {
      return null;
    }
    return tab;
  }

  async function checkActiveOpenFrontTabNeedsReload() {
    const tab = await getActiveOpenFrontTab();
    if (!tab?.id || !chrome.tabs?.sendMessage) {
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "OPENFRONT_HELPER_PING",
      });
    } catch (_error) {
      openOpenFrontReloadPopup(tab.id);
    }
  }

  async function setExtensionChatEnabled(enabled) {
    state.settings.showExtensionChat = Boolean(enabled);
    await popup.saveSettings();
    popup.render();
  }

  async function setAnalyticsEnabled(enabled) {
    state.settings.analyticsEnabled = enabled;
    state.showAnalyticsSupportNotice = false;
    await popup.saveSettings();
    await chrome.storage.local.set({
      [shared.ANALYTICS_SUPPORT_NOTICE_KEY]: false,
    });

    if (enabled) {
      sendAnalyticsEvent(
        "analytics_enabled",
        {
          selected_language: getSelectedLanguage(),
          enabled_feature_count: getEnabledTrackedFeatureNames().length,
        },
        {
          selected_language: getSelectedLanguage(),
          enabled_feature_count: getEnabledTrackedFeatureNames().length,
        },
      )
        .catch((error) => {
          console.error("Failed to track analytics opt-in:", error);
        });
    } else {
      await chrome.storage.local.remove(ANALYTICS_CLIENT_ID_KEY);
    }

    popup.render();
  }

  refs.settingsButton.addEventListener("click", (e) => {
    e.stopPropagation();
    state.showAnalyticsSupportNotice = false;
    const isOpen = !refs.settingsPanel.hidden;
    refs.settingsPanel.hidden = isOpen;
    refs.settingsButton.setAttribute("aria-expanded", String(!isOpen));
    popup.render();
  });

  refs.chatToggleButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    state.showAnalyticsSupportNotice = false;
    const nextShowExtensionChat = !state.settings.showExtensionChat;
    if (nextShowExtensionChat) {
      openChatSafetyPopup();
      return;
    }
    await setExtensionChatEnabled(false);
  });

  refs.chatSafetyCancelButton?.addEventListener("click", closeChatSafetyPopup);

  refs.chatSafetyEnableButton?.addEventListener("click", async () => {
    closeChatSafetyPopup();
    await setExtensionChatEnabled(true);
  });

  refs.openFrontReloadCancelButton?.addEventListener("click", closeOpenFrontReloadPopup);

  refs.openFrontReloadButton?.addEventListener("click", async () => {
    const tabId = state.openFrontReloadTabId;
    closeOpenFrontReloadPopup();
    if (typeof tabId === "number" && chrome.tabs?.reload) {
      await chrome.tabs.reload(tabId);
    }
  });

  refs.analyticsOptInButton?.addEventListener("click", async (event) => {
    event.stopPropagation();
    state.showAnalyticsSupportNotice = false;
    await chrome.storage.local.set({
      [shared.ANALYTICS_SUPPORT_NOTICE_KEY]: false,
    });
    if (!state.settings.analyticsEnabled) {
      openAnalyticsConsentPopup();
      popup.render();
      return;
    }

    await setAnalyticsEnabled(false);
  });

  refs.analyticsConsentEnableButton?.addEventListener("click", async () => {
    await setAnalyticsEnabled(true);
    closeAnalyticsConsentPopup();
  });

  refs.analyticsConsentCancelButton?.addEventListener("click", closeAnalyticsConsentPopup);
  refs.analyticsConsentCloseButton?.addEventListener("click", closeAnalyticsConsentPopup);
  refs.analyticsConsentPopup?.addEventListener("click", (event) => {
    if (event.target === refs.analyticsConsentPopup) {
      closeAnalyticsConsentPopup();
    }
  });

  refs.analyticsSupportDismissButton?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await dismissAnalyticsSupportNotice();
  });

  refs.analyticsSupportReviewButton?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await dismissAnalyticsSupportNotice();
    openAnalyticsConsentPopup();
  });

  refs.macrosPanel.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === "send1PercentBoat") {
      await updateBooleanSetting("send1PercentBoat", target.checked);
      refs.send1PercentBoatSubOptions?.classList.toggle("visible", target.checked);
    } else if (target.name === "send1PercentBoatContextMenu") {
      await updateBooleanSetting("send1PercentBoatContextMenu", target.checked);
    }
  });

  document.addEventListener("click", (e) => {
    if (!refs.settingsPanel.hidden && !refs.settingsPanel.contains(e.target) && e.target !== refs.settingsButton) {
      refs.settingsPanel.hidden = true;
      refs.settingsButton.setAttribute("aria-expanded", "false");
    }

  });

  refs.settingsSoundUploadButton.addEventListener("click", () => {
    refs.settingsSoundInput.click();
  });

  refs.settingsSoundInput.addEventListener("change", () => {
    const file = refs.settingsSoundInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      await chrome.storage.local.set({
        [SOUND_KEY]: e.target.result,
        [SOUND_NAME_KEY]: file.name,
      });
      refs.settingsSoundName.textContent = file.name;
      refs.settingsSoundClearButton.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  refs.settingsSoundTestButton.addEventListener("click", async () => {
    const stored = await chrome.storage.local.get(SOUND_KEY);
    if (stored[SOUND_KEY]) {
      new Audio(stored[SOUND_KEY]).play().catch(() => {});
    }
  });

  refs.settingsSoundClearButton.addEventListener("click", async () => {
    await chrome.storage.local.remove([SOUND_KEY, SOUND_NAME_KEY]);
    refs.settingsSoundName.textContent = popup.t("defaultSound");
    refs.settingsSoundClearButton.hidden = true;
    refs.settingsSoundInput.value = "";
  });

  chrome.storage.local.get([SOUND_KEY, SOUND_NAME_KEY]).then((stored) => {
    if (stored[SOUND_KEY]) {
      refs.settingsSoundName.textContent = stored[SOUND_NAME_KEY] || popup.t("customSound");
      refs.settingsSoundClearButton.hidden = false;
    }
  });

  refs.whatsNewNotice?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("[data-whats-new-image-button]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const feature = button.closest(".whats-new-feature");
    const imageWrap = feature?.querySelector(".whats-new-image-wrap");
    if (!(imageWrap instanceof HTMLElement)) {
      return;
    }

    const showImage = imageWrap.hidden;
    imageWrap.hidden = !showImage;
    button.setAttribute("aria-expanded", String(showImage));
    button.textContent = showImage ? "Hide image" : "Show image";
  });

  refs.powerButton.addEventListener("click", async () => {
    if (refs.powerButton.disabled) {
      return;
    }

    state.settings.enabled = !state.settings.enabled;
    state.settings.searchStartedAt = state.settings.enabled ? Date.now() : null;
    await popup.saveSettings();
    popup.render();
  });

  refs.joinNotificationToggle?.addEventListener("change", async () => {
    const wantsOn = refs.joinNotificationToggle.checked;
    if (wantsOn) {
      // chrome.notifications requires the "notifications" manifest permission only —
      // no user prompt needed. We just enable the setting.
      state.settings.joinNotification = true;
    } else {
      state.settings.joinNotification = false;
    }
    await popup.saveSettings();
    popup.render();
  });

  refs.helpersPopoutButton?.addEventListener("click", async () => {
    state.settings.showFloatingHelpersPanel = !state.settings.showFloatingHelpersPanel;
    await popup.saveSettings();
    popup.render();
  });

  refs.filtersForm.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (
      ["showNukeSuggestions", "autoNuke"].includes(target.name) &&
      !state.settings.cheatsAvailable
    ) {
      popup.render();
      return;
    }

    if (target.name === "selectiveTradePolicyEnabled") {
      if (!state.settings.autoCancelDeniedTradesAvailable) {
        popup.render();
        return;
      }

      await updateBooleanSetting(target.name, target.checked);
      return;
    }

    if (target.name === "minLobbySize") {
      state.settings.minLobbySize = shared.normalizeMinLobbySize(target.value);
      state.settings = shared.normalizeSettings(state.settings, {
        ensureActiveSearchTimestamp: true,
      });
      popup.resetAutoJoinIfEmpty();
      await popup.saveSettings();
      popup.render();
      return;
    }

    if (
      [
        "markBotNationsRed",
        "showGoldPerMinute",
        "showTeamGoldPerMinute",
        "showTopGoldPerMinute",
        "markHoveredAlliesGreen",
        "showAllianceRequestsPanel",
        "showTradeBalances",
        "showNukePrediction",
        "showNukeSuggestions",
        "autoNuke",
        "showBoatPrediction",
      ].includes(target.name)
    ) {
      await updateBooleanSetting(target.name, target.checked);
      return;
    }

    if (target.name === "showEconomyHeatmap") {
      state.settings.showEconomyHeatmap = target.checked;
      if (target.checked) {
        state.settings.showExportPartnerHeatmap = false;
      }
      await popup.saveSettings();
      popup.render();
      return;
    }

    if (target.name === "economyHeatmapIntensity") {
      state.settings.economyHeatmapIntensity =
        shared.normalizeEconomyHeatmapIntensity(target.value);
      await popup.saveSettings();
      popup.render();
      return;
    }

    if (target.name === "showExportPartnerHeatmap") {
      state.settings.showExportPartnerHeatmap = target.checked;
      if (target.checked) {
        state.settings.showEconomyHeatmap = false;
      }
      await popup.saveSettings();
      popup.render();
      return;
    }

    state.settings.includeFilters[target.name] = target.checked;
    if (target.checked) {
      state.settings.excludeFilters[target.name] = false;
    }

    state.settings = shared.normalizeSettings(state.settings, {
      ensureActiveSearchTimestamp: true,
    });
    popup.resetAutoJoinIfEmpty();
    await popup.saveSettings();
    popup.render();
  });

  refs.filtersForm.addEventListener("input", (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      target.name !== "economyHeatmapIntensity" ||
      !(refs.economyHeatmapIntensityValue instanceof HTMLElement)
    ) {
      return;
    }

    refs.economyHeatmapIntensityValue.textContent =
      popup.t(shared.getEconomyHeatmapIntensityLabel(target.value));
  });

  refs.filtersForm.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const toggle = target.closest(".helper-category-toggle");
    if (toggle instanceof HTMLButtonElement) {
      const category = toggle.dataset.helperCategory;
      if (!category) {
        return;
      }

      state.settings.collapsedHelperCategories = {
        ...shared.DEFAULT_SETTINGS.collapsedHelperCategories,
        ...state.settings.collapsedHelperCategories,
        [category]: !Boolean(state.settings.collapsedHelperCategories?.[category]),
      };
      await popup.saveSettings();
      popup.renderHelperCategoryCollapse();
      return;
    }

    const infoButton = target.closest(".helper-info-button");
    if (infoButton instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();

      if (
        state.activeHelperInfoButton === infoButton &&
        refs.helperInfoPopup.dataset.open === "true"
      ) {
        popup.closeHelperInfo();
        return;
      }

      popup.openHelperInfo(infoButton);
      return;
    }

    const excludeButton = target.closest(".exclude-button");
    if (!(excludeButton instanceof HTMLButtonElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const filterKey = excludeButton.dataset.filter;
    if (!filterKey) {
      return;
    }

    const nextValue = !state.settings.excludeFilters[filterKey];
    state.settings.excludeFilters[filterKey] = nextValue;
    if (nextValue) {
      state.settings.includeFilters[filterKey] = false;
    }

    state.settings = shared.normalizeSettings(state.settings, {
      ensureActiveSearchTimestamp: true,
    });
    popup.resetAutoJoinIfEmpty();
    await popup.saveSettings();
    popup.render();
  });

  refs.mapFiltersContainer.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const mapButton = target.closest(".map-filter-button");
    if (mapButton instanceof HTMLButtonElement) {
      const mapId = mapButton.dataset.mapId;
      if (!mapId) {
        return;
      }

      state.settings.mapFilters[mapId] = !state.settings.mapFilters[mapId];
      if (state.settings.mapFilters[mapId]) {
        state.settings.mapExcludeFilters[mapId] = false;
      }

      state.settings = shared.normalizeSettings(state.settings, {
        ensureActiveSearchTimestamp: true,
      });
      popup.resetAutoJoinIfEmpty();
      await popup.saveSettings();
      popup.render();
      return;
    }

    const excludeButton = target.closest(".map-exclude-button");
    if (!(excludeButton instanceof HTMLButtonElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const mapId = excludeButton.dataset.mapId;
    if (!mapId) {
      return;
    }

    state.settings.mapExcludeFilters[mapId] = !state.settings.mapExcludeFilters[mapId];
    if (state.settings.mapExcludeFilters[mapId]) {
      state.settings.mapFilters[mapId] = false;
    }

    state.settings = shared.normalizeSettings(state.settings, {
      ensureActiveSearchTimestamp: true,
    });
    popup.resetAutoJoinIfEmpty();
    await popup.saveSettings();
    popup.render();
  });

  refs.clearMapFiltersButton.addEventListener("click", async () => {
    state.settings.mapFilters = shared.createDefaultMapFilters();
    state.settings.mapExcludeFilters = shared.createDefaultMapFilters();
    state.settings = shared.normalizeSettings(state.settings, {
      ensureActiveSearchTimestamp: true,
    });
    popup.resetAutoJoinIfEmpty();
    await popup.saveSettings();
    popup.render();
  });

  refs.filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  refs.mapSearchInput.addEventListener("input", () => {
    popup.renderMapSearch();
  });

  refs.languageSearchInput.addEventListener("input", () => {
    popup.renderLanguageOptions();
  });

  refs.languageList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest(".language-option");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const language = shared.normalizeLanguage(button.dataset.language);
    if (language === state.settings.language) {
      return;
    }

    state.settings.language = language;
    await popup.saveSettings();
    await popup.loadTranslations();
    refs.languageSearchInput.value = "";
    popup.render();
  });

  refs.helperInfoCloseButton.addEventListener("click", () => {
    popup.closeHelperInfo();
  });

  refs.helperInfoPrevButton.addEventListener("click", () => {
    popup.showHelperInfoImage((state.helperInfoImageIndex || 0) - 1);
  });

  refs.helperInfoNextButton.addEventListener("click", () => {
    popup.showHelperInfoImage((state.helperInfoImageIndex || 0) + 1);
  });

  refs.helperInfoPopup.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  refs.helperInfoImage.addEventListener("load", () => {
    popup.positionHelperInfo();
  });

  window.addEventListener("resize", () => {
    popup.positionHelperInfo();
  });

  window.addEventListener("scroll", () => {
    popup.positionHelperInfo();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest(".helper-info-popup") || target.closest(".helper-info-button")) {
      return;
    }

    popup.closeHelperInfo();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAnalyticsConsentPopup();
      closeChatSafetyPopup();
      closeOpenFrontReloadPopup();
      popup.closeHelperInfo();
      refs.settingsPanel.hidden = true;
      refs.settingsButton.setAttribute("aria-expanded", "false");
    }
  });

  async function init() {
    await popup.loadSettings();
    await popup.loadTranslations();
    popup.renderMapFilterButtons();
    popup.renderLanguageOptions();
    chrome.storage.onChanged.addListener(handleStorageChange);
    popup.render();
    trackPopupAnalyticsSnapshot().catch((error) => {
      console.error("Failed to track popup analytics snapshot:", error);
    });
    checkActiveOpenFrontTabNeedsReload().catch((error) => {
      console.error("Failed to check whether OpenFront needs reload:", error);
    });
  }

  init().catch((error) => {
    console.error("Failed to initialize popup:", error);
  });
})(globalThis);
