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

  refs.dismissInstallNoticeButton.addEventListener("click", async () => {
    state.showInstallNotice = false;
    await chrome.storage.local.set({
      [shared.INSTALL_NOTICE_KEY]: false,
    });
    popup.render();
  });

  const SOUND_KEY = "joinNotificationSoundData";
  const SOUND_NAME_KEY = "joinNotificationSoundName";

  refs.settingsButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !refs.settingsPanel.hidden;
    refs.settingsPanel.hidden = isOpen;
    refs.settingsButton.setAttribute("aria-expanded", String(!isOpen));
    refs.languagePanel.hidden = true;
    refs.languageButton.setAttribute("aria-expanded", "false");
    refs.macrosPanel.hidden = true;
    refs.macrosButton.setAttribute("aria-expanded", "false");
  });

  refs.languageButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !refs.languagePanel.hidden;
    refs.languagePanel.hidden = isOpen;
    refs.languageButton.setAttribute("aria-expanded", String(!isOpen));
    refs.settingsPanel.hidden = true;
    refs.settingsButton.setAttribute("aria-expanded", "false");
    refs.macrosPanel.hidden = true;
    refs.macrosButton.setAttribute("aria-expanded", "false");
    if (!isOpen) {
      refs.languageSearchInput.focus();
    }
  });

  refs.macrosButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !refs.macrosPanel.hidden;
    refs.macrosPanel.hidden = isOpen;
    refs.macrosButton.setAttribute("aria-expanded", String(!isOpen));
    refs.settingsPanel.hidden = true;
    refs.settingsButton.setAttribute("aria-expanded", "false");
    refs.languagePanel.hidden = true;
    refs.languageButton.setAttribute("aria-expanded", "false");
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

    if (
      !refs.languagePanel.hidden &&
      !refs.languagePanel.contains(e.target) &&
      e.target !== refs.languageButton
    ) {
      refs.languagePanel.hidden = true;
      refs.languageButton.setAttribute("aria-expanded", "false");
    }

    if (
      !refs.macrosPanel.hidden &&
      !refs.macrosPanel.contains(e.target) &&
      e.target !== refs.macrosButton
    ) {
      refs.macrosPanel.hidden = true;
      refs.macrosButton.setAttribute("aria-expanded", "false");
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

    if (
      [
        "markBotNationsRed",
        "showGoldPerMinute",
        "showTeamGoldPerMinute",
        "showTopGoldPerMinute",
        "markHoveredAlliesGreen",
        "showTradeBalances",
        "fpsSaver",
        "showAttackAmounts",
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
      refs.languagePanel.hidden = true;
      refs.languageButton.setAttribute("aria-expanded", "false");
      return;
    }

    state.settings.language = language;
    await popup.saveSettings();
    await popup.loadTranslations();
    refs.languagePanel.hidden = true;
    refs.languageButton.setAttribute("aria-expanded", "false");
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
      popup.closeHelperInfo();
      refs.settingsPanel.hidden = true;
      refs.settingsButton.setAttribute("aria-expanded", "false");
      refs.languagePanel.hidden = true;
      refs.languageButton.setAttribute("aria-expanded", "false");
      refs.macrosPanel.hidden = true;
      refs.macrosButton.setAttribute("aria-expanded", "false");
    }
  });

  async function init() {
    await popup.loadSettings();
    await popup.loadTranslations();
    popup.renderMapFilterButtons();
    popup.renderLanguageOptions();
    chrome.storage.onChanged.addListener(handleStorageChange);
    popup.render();
  }

  init().catch((error) => {
    console.error("Failed to initialize popup:", error);
  });
})(globalThis);
