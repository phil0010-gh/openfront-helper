(function initPopupRender(globalScope) {
  const popup = globalScope.OpenFrontPopup;
  const { refs, shared, state } = popup;

  popup.renderMapFilterButtons = function renderMapFilterButtons() {
    const fragment = document.createDocumentFragment();

    for (const map of shared.MAPS) {
      const tile = document.createElement("div");
      tile.className = "map-filter-tile";

      const button = document.createElement("button");
      button.className = "map-filter-button";
      button.type = "button";
      button.dataset.mapId = map.id;
      tile.dataset.searchText = `${popup.normalizeSearchText(map.name)} ${popup.normalizeSearchText(map.id)}`;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `Filter map ${map.name}`);

      const image = document.createElement("img");
      image.src = map.thumbnail;
      image.alt = "";
      image.loading = "lazy";

      const name = document.createElement("span");
      name.className = "map-name";
      name.textContent = map.name;

      button.append(image, name);

      const excludeButton = document.createElement("button");
      excludeButton.className = "map-exclude-button";
      excludeButton.type = "button";
      excludeButton.dataset.mapId = map.id;
      excludeButton.setAttribute("aria-label", `Exclude map ${map.name}`);
      excludeButton.textContent = "Exclude";

      tile.append(button, excludeButton);
      fragment.append(tile);
    }

    refs.mapFiltersContainer.replaceChildren(fragment);
  };

  popup.renderMapSearch = function renderMapSearch() {
    const query = popup.normalizeSearchText(refs.mapSearchInput.value);

    for (const tile of refs.mapFiltersContainer.querySelectorAll(".map-filter-tile")) {
      const searchText = tile.dataset.searchText || "";
      tile.hidden = Boolean(query) && !searchText.includes(query);
    }
  };

  popup.renderSearchTimer = function renderSearchTimer() {
    if (!state.settings.enabled || !state.settings.searchStartedAt) {
      refs.searchTimer.hidden = true;
      refs.searchTimerValue.textContent = "00:00";
      return;
    }

    refs.searchTimer.hidden = false;
    refs.searchTimerValue.textContent = popup.formatElapsedTime(
      state.settings.searchStartedAt,
    );
  };

  popup.renderHelperCategoryCollapse = function renderHelperCategoryCollapse() {
    for (const toggle of refs.filtersForm.querySelectorAll(".helper-category-toggle")) {
      const category = toggle.dataset.helperCategory;
      if (!category) {
        continue;
      }

      const collapsed = Boolean(state.settings.collapsedHelperCategories?.[category]);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      const content = refs.filtersForm.querySelector(
        `[data-helper-category-content="${category}"]`,
      );
      if (content instanceof HTMLElement) {
        content.hidden = collapsed;
      }
    }
  };

  popup.syncTimerInterval = function syncTimerInterval() {
    if (state.settings.enabled && state.settings.searchStartedAt) {
      if (state.timerInterval === null) {
        state.timerInterval = window.setInterval(popup.renderSearchTimer, 1000);
      }
      return;
    }

    if (state.timerInterval !== null) {
      window.clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  };

  popup.openHelperInfo = function openHelperInfo(button) {
    const title = button.dataset.infoTitle || "Helper preview";
    const image = button.dataset.infoImage;
    if (!image) {
      return;
    }

    state.activeHelperInfoButton = button;
    refs.helperInfoTitle.textContent = title;
    refs.helperInfoImage.src = image;
    refs.helperInfoImage.alt = `${title} preview`;
    refs.helperInfoPopup.dataset.open = "true";
    refs.helperInfoPopup.setAttribute("aria-hidden", "false");
    popup.positionHelperInfo();
  };

  popup.closeHelperInfo = function closeHelperInfo() {
    state.activeHelperInfoButton = null;
    refs.helperInfoPopup.dataset.open = "false";
    refs.helperInfoPopup.setAttribute("aria-hidden", "true");
  };

  popup.positionHelperInfo = function positionHelperInfo() {
    if (!state.activeHelperInfoButton || refs.helperInfoPopup.dataset.open !== "true") {
      return;
    }

    const buttonRect = state.activeHelperInfoButton.getBoundingClientRect();
    const popupRect = refs.helperInfoPopup.getBoundingClientRect();
    const margin = 10;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceRight = viewportWidth - buttonRect.right;
    const placeLeft = spaceRight < popupRect.width + gap + margin;
    const left = placeLeft
      ? Math.max(margin, buttonRect.left - popupRect.width - gap)
      : Math.min(viewportWidth - popupRect.width - margin, buttonRect.right + gap);
    const top = Math.min(
      Math.max(margin, buttonRect.top + buttonRect.height / 2 - popupRect.height / 2),
      viewportHeight - popupRect.height - margin,
    );
    const arrowTop = Math.min(
      Math.max(18, buttonRect.top + buttonRect.height / 2 - top),
      popupRect.height - 18,
    );

    refs.helperInfoPopup.style.setProperty("--helper-info-left", `${left}px`);
    refs.helperInfoPopup.style.setProperty("--helper-info-top", `${top}px`);
    refs.helperInfoPopup.style.setProperty("--helper-info-arrow-top", `${arrowTop}px`);
    refs.helperInfoPopup.dataset.placement = placeLeft ? "left" : "right";
  };

  popup.render = function render() {
    const enabled = state.settings.enabled;
    const hasOptionsSelected = popup.hasSelectedOptions();

    refs.installNotice.hidden = !state.showInstallNotice;
    refs.whatsNewNotice.hidden = !state.showWhatsNewNotice;
    refs.powerButton.dataset.enabled = String(enabled);
    refs.powerButton.disabled = !hasOptionsSelected;
    refs.powerButton.setAttribute("aria-pressed", String(enabled));
    refs.powerButton.querySelector(".power-label").textContent = enabled
      ? "Auto-Join ON"
      : "Auto-Join OFF";

    if (refs.helpersPopoutButton instanceof HTMLButtonElement) {
      refs.helpersPopoutButton.dataset.active = String(
        state.settings.showFloatingHelpersPanel,
      );
      refs.helpersPopoutButton.setAttribute(
        "aria-pressed",
        String(state.settings.showFloatingHelpersPanel),
      );
      refs.helpersPopoutButton.title = state.settings.showFloatingHelpersPanel
        ? "Hide floating helpers panel on OpenFront"
        : "Show floating helpers panel on OpenFront";
    }

    if (enabled) {
      refs.statusText.hidden = false;
      refs.statusText.textContent =
        "The extension is watching public lobbies and will join the first match based on your include/exclude rules.";
    } else if (!hasOptionsSelected) {
      refs.statusText.hidden = false;
      refs.statusText.textContent =
        "Select at least one map, include option, or exclude option to enable auto-join.";
    } else {
      refs.statusText.hidden = true;
      refs.statusText.textContent = "";
    }

    popup.renderSearchTimer();
    popup.syncTimerInterval();
    popup.renderHelperCategoryCollapse();

    refs.clearMapFiltersButton.disabled =
      !popup.hasSelectedMapFilters() && !popup.hasExcludedMapFilters();

    for (const button of refs.mapFiltersContainer.querySelectorAll(".map-filter-button")) {
      const mapId = button.dataset.mapId;
      const isActive = Boolean(mapId && state.settings.mapFilters[mapId]);
      button.dataset.active = String(isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }

    for (const button of refs.mapFiltersContainer.querySelectorAll(".map-exclude-button")) {
      const mapId = button.dataset.mapId;
      button.dataset.active = String(
        Boolean(mapId && state.settings.mapExcludeFilters[mapId]),
      );
    }

    for (const key of shared.FILTER_KEYS) {
      const input = refs.filtersForm.elements.namedItem(key);
      if (input instanceof HTMLInputElement) {
        input.checked = Boolean(state.settings.includeFilters[key]);
      }

      const excludeButton = refs.filtersForm.querySelector(
        `.exclude-button[data-filter="${key}"]`,
      );
      if (excludeButton instanceof HTMLButtonElement) {
        excludeButton.dataset.active = String(
          Boolean(state.settings.excludeFilters[key]),
        );
      }
    }

    for (const settingName of [
      "markBotNationsRed",
      "showGoldPerMinute",
      "showTeamGoldPerMinute",
      "showTopGoldPerMinute",
      "markHoveredAlliesGreen",
      "showTradeBalances",
      "fpsSaver",
      "showAttackAmounts",
      "showEconomyHeatmap",
      "showExportPartnerHeatmap",
      "showNukeTargetHeatmap",
    ]) {
      const input = refs.filtersForm.elements.namedItem(settingName);
      if (input instanceof HTMLInputElement) {
        input.checked = Boolean(state.settings[settingName]);
      }
    }

    if (refs.applySelectiveTradePolicyButton instanceof HTMLButtonElement) {
      refs.applySelectiveTradePolicyButton.disabled =
        !state.settings.autoCancelDeniedTradesAvailable;
      refs.applySelectiveTradePolicyButton.dataset.active = String(
        Boolean(state.settings.selectiveTradePolicyEnabled),
      );
      refs.applySelectiveTradePolicyButton.setAttribute(
        "aria-pressed",
        String(Boolean(state.settings.selectiveTradePolicyEnabled)),
      );
      refs.applySelectiveTradePolicyButton.textContent =
        state.settings.selectiveTradePolicyEnabled ? "On" : "Off";
      refs.applySelectiveTradePolicyButton.title =
        state.settings.autoCancelDeniedTradesAvailable
          ? "Blocks trades with players who are not on your team."
          : "Available only during an active team game.";

      const actionCard = refs.applySelectiveTradePolicyButton.closest(
        ".helper-action-card",
      );
      if (actionCard instanceof HTMLElement) {
        actionCard.dataset.disabled = String(
          !state.settings.autoCancelDeniedTradesAvailable,
        );
        actionCard.title = refs.applySelectiveTradePolicyButton.title;
      }
    }

    const economyHeatmapIntensityInput = refs.filtersForm.elements.namedItem(
      "economyHeatmapIntensity",
    );
    if (economyHeatmapIntensityInput instanceof HTMLInputElement) {
      economyHeatmapIntensityInput.value = String(
        state.settings.economyHeatmapIntensity,
      );
    }

    if (refs.economyHeatmapIntensityValue instanceof HTMLElement) {
      refs.economyHeatmapIntensityValue.textContent =
        shared.getEconomyHeatmapIntensityLabel(
          state.settings.economyHeatmapIntensity,
        );
    }

    popup.renderMapSearch();
  };
})(globalThis);
