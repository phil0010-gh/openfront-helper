(function initPopupEvents(globalScope) {
  const popup = globalScope.OpenFrontPopup;
  const { refs, shared, state } = popup;

  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !changes[shared.STORAGE_KEY]) {
      return;
    }

    state.settings = shared.normalizeSettings(changes[shared.STORAGE_KEY].newValue, {
      ensureActiveSearchTimestamp: true,
    });
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

  refs.dismissWhatsNewNoticeButton.addEventListener("click", async () => {
    state.showWhatsNewNotice = false;
    await chrome.storage.local.set({
      [shared.WHATS_NEW_NOTICE_KEY]: false,
    });
    popup.render();
  });

  refs.appTitleButton.addEventListener("click", () => {
    state.showWhatsNewNotice = true;
    popup.render();
  });

  refs.whatsNewNotice.addEventListener("click", (event) => {
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
        "showNukeTargetHeatmap",
        "showNukeLandingZones",
        "showNukeTargetHeatmap",
      ].includes(target.name)
    ) {
      if (target.name === "showNukeTargetHeatmap" && target.checked) {
        state.settings.showEconomyHeatmap = false;
        state.settings.showExportPartnerHeatmap = false;
      }
      await updateBooleanSetting(target.name, target.checked);
      return;
    }

    if (target.name === "showEconomyHeatmap") {
      state.settings.showEconomyHeatmap = target.checked;
      if (target.checked) {
        state.settings.showExportPartnerHeatmap = false;
        state.settings.showNukeTargetHeatmap = false;
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
        state.settings.showNukeTargetHeatmap = false;
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
      shared.getEconomyHeatmapIntensityLabel(target.value);
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

  refs.helperInfoCloseButton.addEventListener("click", () => {
    popup.closeHelperInfo();
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
    }
  });

  async function init() {
    popup.renderMapFilterButtons();
    await popup.loadSettings();
    chrome.storage.onChanged.addListener(handleStorageChange);
    popup.render();
  }

  init().catch((error) => {
    console.error("Failed to initialize popup:", error);
  });
})(globalThis);
