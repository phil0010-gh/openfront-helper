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
      excludeButton.setAttribute("aria-label", `${popup.t("Exclude")} ${map.name}`);
      excludeButton.textContent = popup.t("Exclude");

      tile.append(button, excludeButton);
      fragment.append(tile);
    }

    refs.mapFiltersContainer.replaceChildren(fragment);
  };

  popup.renderLanguageOptions = function renderLanguageOptions() {
    const query = popup.normalizeSearchText(refs.languageSearchInput.value);
    const fragment = document.createDocumentFragment();
    let visibleCount = 0;

    for (const language of state.languageOptions) {
      if (query && !popup.normalizeSearchText(language.searchText).includes(query)) {
        continue;
      }

      const button = document.createElement("button");
      button.className = "language-option";
      button.type = "button";
      button.dataset.language = language.code;
      button.setAttribute("role", "option");
      button.setAttribute(
        "aria-selected",
        String(language.code === state.settings.language),
      );

      const name = document.createElement("span");
      name.className = "language-option-name";
      name.textContent =
        language.name === language.nativeName
          ? language.name
          : `${language.name} (${language.nativeName})`;

      const code = document.createElement("span");
      code.className = "language-option-code";
      code.textContent = language.code;

      button.append(name, code);
      fragment.append(button);
      visibleCount += 1;
    }

    if (visibleCount === 0) {
      const empty = document.createElement("p");
      empty.className = "language-empty";
      empty.textContent = popup.t("noLanguagesFound");
      fragment.append(empty);
    }

    refs.languageList.replaceChildren(fragment);
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
    let images = null;

    if (button.dataset.infoImages) {
      try {
        images = JSON.parse(button.dataset.infoImages);
      } catch (_) {
        images = null;
      }
    }
    if (!images || images.length === 0) {
      const single = button.dataset.infoImage;
      if (!single) return;
      images = [single];
    }

    state.activeHelperInfoButton = button;
    state.helperInfoImages = images;
    state.helperInfoImageIndex = 0;
    refs.helperInfoTitle.textContent = title;
    popup.showHelperInfoImage(0);
    refs.helperInfoPopup.dataset.open = "true";
    refs.helperInfoPopup.setAttribute("aria-hidden", "false");
    popup.positionHelperInfo();
  };

  popup.showHelperInfoImage = function showHelperInfoImage(index) {
    const images = state.helperInfoImages || [];
    const i = Math.max(0, Math.min(index, images.length - 1));
    state.helperInfoImageIndex = i;
    const title = refs.helperInfoTitle.textContent;
    refs.helperInfoImage.src = images[i];
    refs.helperInfoImage.alt = `${title} preview`;

    if (images.length > 1) {
      refs.helperInfoNav.hidden = false;
      refs.helperInfoNavCounter.textContent = `${i + 1} / ${images.length}`;
      refs.helperInfoPrevButton.disabled = i === 0;
      refs.helperInfoNextButton.disabled = i === images.length - 1;
    } else {
      refs.helperInfoNav.hidden = true;
    }
    popup.positionHelperInfo();
  };

  popup.closeHelperInfo = function closeHelperInfo() {
    state.activeHelperInfoButton = null;
    state.helperInfoImages = null;
    state.helperInfoImageIndex = 0;
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

    if (refs.versionLabel instanceof HTMLElement) {
      const runtime = globalThis.chrome?.runtime;
      const manifestVersion =
        typeof runtime?.getManifest === "function"
          ? runtime.getManifest()?.version
          : "";
      refs.versionLabel.textContent = manifestVersion ? `v${manifestVersion}` : "";
    }
    refs.settingsButton.setAttribute("aria-label", popup.t("openSettings"));
    refs.settingsButton.querySelector(".settings-button-label").textContent =
      popup.t("settings");
    if (refs.chatToggleButton instanceof HTMLButtonElement) {
      const chatEnabled = state.settings.showExtensionChat === true;
      refs.chatToggleButton.dataset.enabled = String(chatEnabled);
      refs.chatToggleButton.setAttribute("aria-pressed", String(chatEnabled));
      refs.chatToggleButton.setAttribute(
        "aria-label",
        chatEnabled ? popup.t("hideExtensionChat") : popup.t("showExtensionChat"),
      );
      refs.chatToggleButton.title = chatEnabled
        ? popup.t("hideExtensionChat")
        : popup.t("showExtensionChat");
      refs.chatToggleButton.querySelector(".chat-toggle-button-label").textContent =
        popup.t("chat");
    }
    if (refs.analyticsOptInButton instanceof HTMLButtonElement) {
      const analyticsEnabled = Boolean(state.settings.analyticsEnabled);
      const analyticsTitle = analyticsEnabled
        ? popup.t("analyticsOptInOn")
        : popup.t("analyticsOptInOff");
      refs.analyticsOptInButton.dataset.enabled = String(analyticsEnabled);
      refs.analyticsOptInButton.setAttribute("aria-pressed", String(analyticsEnabled));
      refs.analyticsOptInButton.setAttribute("aria-label", analyticsTitle);
      refs.analyticsOptInButton.title = popup.t("analyticsOptInDescription");
      refs.analyticsOptInButton.querySelector(
        ".analytics-opt-in-button-label",
      ).textContent = popup.t("sendAnonymousUsageData");
    }
    if (refs.analyticsSupportPopup instanceof HTMLElement) {
      refs.analyticsSupportPopup.hidden =
        !state.showAnalyticsSupportNotice || state.settings.analyticsEnabled;
      refs.analyticsSupportPopup.querySelector(".analytics-support-title").textContent =
        popup.t("analyticsSupportTitle");
      refs.analyticsSupportPopup.querySelector(".analytics-support-text").textContent =
        popup.t("analyticsSupportText");
      refs.analyticsSupportDismissButton.textContent =
        popup.t("analyticsSupportDismiss");
      refs.analyticsSupportReviewButton.textContent =
        popup.t("analyticsSupportReview");
    }
    if (refs.chatSafetyPopup instanceof HTMLElement) {
      refs.chatSafetyPopup.querySelector(".chat-safety-title").textContent =
        popup.t("chatSafetyTitle");
      refs.chatSafetyPopup.querySelector(".chat-safety-text").textContent =
        popup.t("chatSafetyNotice");
      refs.chatSafetyPopup.querySelector('[data-chat-safety-item="public"]').textContent =
        popup.t("chatSafetyPublic");
      refs.chatSafetyPopup.querySelector('[data-chat-safety-item="backend"]').textContent =
        popup.t("chatSafetyBackend");
      refs.chatSafetyPopup.querySelector('[data-chat-safety-item="private"]').textContent =
        popup.t("chatSafetyNoPrivate");
      refs.chatSafetyPopup.querySelector('[data-chat-safety-item="sensitive"]').textContent =
        popup.t("chatSafetyNoSensitive");
      refs.chatSafetyCancelButton.textContent = popup.t("cancel");
      refs.chatSafetyEnableButton.textContent = popup.t("chatSafetyEnable");
    }
    if (refs.openFrontReloadPopup instanceof HTMLElement) {
      refs.openFrontReloadPopup.querySelector(".openfront-reload-title").textContent =
        popup.t("openFrontReloadTitle");
      refs.openFrontReloadPopup.querySelector(".openfront-reload-text").textContent =
        popup.t("openFrontReloadText");
      refs.openFrontReloadCancelButton.textContent = popup.t("cancel");
      refs.openFrontReloadButton.textContent = popup.t("openFrontReloadButton");
    }
    refs.settingsPanel.querySelector(".settings-panel-title").textContent =
      popup.t("settings");
    refs.settingsPanel.querySelector(".settings-panel-label").textContent =
      popup.t("customNotificationSound");
    refs.settingsSoundTestButton.textContent = popup.t("test");
    refs.settingsSoundUploadButton.textContent = popup.t("upload");
    refs.settingsSoundClearButton.textContent = popup.t("remove");
    if (refs.settingsSoundClearButton.hidden) {
      refs.settingsSoundName.textContent = popup.t("defaultSound");
    }
    const languageLabel = refs.languagePanel.querySelector(".language-search-label");
    languageLabel.__openFrontI18nText = "language";
    languageLabel.textContent = popup.t("language");
    refs.languageSearchInput.placeholder = popup.t("searchLanguages");
    refs.languageList.setAttribute("aria-label", popup.t("Languages"));
    refs.powerButton.dataset.enabled = String(enabled);
    refs.powerButton.disabled = !hasOptionsSelected;
    refs.powerButton.setAttribute("aria-pressed", String(enabled));
    refs.powerButton.querySelector(".power-label").textContent = enabled
      ? popup.t("autoJoinOn")
      : popup.t("autoJoinOff");

    if (refs.joinNotificationToggle instanceof HTMLInputElement) {
      refs.joinNotificationToggle.checked = Boolean(state.settings.joinNotification);
    }

    if (refs.minLobbySizeInput instanceof HTMLInputElement) {
      refs.minLobbySizeInput.value =
        state.settings.minLobbySize == null ? "" : String(state.settings.minLobbySize);
    }

    if (refs.helpersPopoutButton instanceof HTMLButtonElement) {
      refs.helpersPopoutButton.dataset.active = String(
        state.settings.showFloatingHelpersPanel,
      );
      refs.helpersPopoutButton.setAttribute(
        "aria-pressed",
        String(state.settings.showFloatingHelpersPanel),
      );
      refs.helpersPopoutButton.title = state.settings.showFloatingHelpersPanel
        ? popup.t("hideFloatingHelpersPanel")
        : popup.t("showFloatingHelpersPanel");
      refs.helpersPopoutButton.setAttribute("aria-label", refs.helpersPopoutButton.title);
    }

    refs.statusText.hidden = true;
    refs.statusText.textContent = "";

    popup.renderSearchTimer();
    popup.syncTimerInterval();
    popup.renderHelperCategoryCollapse();

    if (refs.lobbyForecastPanel instanceof HTMLElement) {
      const setForecastLoading = (element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        element.classList.add("forecast-value-loading");
        element.textContent = "";
      };

      const setForecastValue = (element, value) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        element.classList.remove("forecast-value-loading");
        element.textContent = value;
      };

      const title = refs.lobbyForecastPanel.querySelector(".lobby-forecast-title-text");
      const rows = refs.lobbyForecastPanel.querySelectorAll(".lobby-forecast-item span");
      if (title instanceof HTMLElement) {
        title.textContent = popup.t("Lobby forecast");
      }
      if (rows[0] instanceof HTMLElement) {
        rows[0].textContent = popup.t("ETA (estimate)");
      }
      if (rows[1] instanceof HTMLElement) {
        rows[1].textContent = popup.t("Hit chance next 10 lobbies");
      }
      if (rows[2] instanceof HTMLElement) {
        rows[2].textContent = popup.t("Median to match");
      }

      const forecast = state.settings.lobbyForecast || {};
      const hasForecast = Boolean(forecast.available);
      refs.lobbyForecastPanel.hidden = !hasForecast;
      if (hasForecast) {
        if (refs.forecastEtaValue instanceof HTMLElement) {
          if (
            Number.isFinite(forecast.etaMinSeconds) &&
            Number.isFinite(forecast.etaMaxSeconds) &&
            forecast.etaMinSeconds > 0 &&
            forecast.etaMaxSeconds > 0
          ) {
            setForecastValue(
              refs.forecastEtaValue,
              `${popup.formatDurationShort(forecast.etaMinSeconds)} - ${popup.formatDurationShort(forecast.etaMaxSeconds)}`,
            );
          } else {
            setForecastLoading(refs.forecastEtaValue);
          }
        }

        if (refs.forecastChanceValue instanceof HTMLElement) {
          if (Number.isFinite(forecast.hitChanceNext10)) {
            setForecastValue(
              refs.forecastChanceValue,
              `${Math.round(forecast.hitChanceNext10 * 100)}%`,
            );
          } else {
            setForecastLoading(refs.forecastChanceValue);
          }
        }

        if (refs.forecastMedianValue instanceof HTMLElement) {
          if (Number.isFinite(forecast.medianLobbiesToMatch)) {
            setForecastValue(
              refs.forecastMedianValue,
              `${Math.round(forecast.medianLobbiesToMatch)} ${popup.t("lobbies")}`,
            );
          } else {
            setForecastLoading(refs.forecastMedianValue);
          }
        }
      }
    }

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
      "showAllianceRequestsPanel",
      "showTradeBalances",
      "showNukePrediction",
      "showNukeSuggestions",
      "showBoatPrediction",
      "autoNuke",
      "showEconomyHeatmap",
      "showExportPartnerHeatmap",
    ]) {
      const input = refs.filtersForm.elements.namedItem(settingName);
      if (input instanceof HTMLInputElement) {
        input.checked = Boolean(state.settings[settingName]);
      }
    }

    if (refs.send1PercentBoatToggle instanceof HTMLInputElement) {
      refs.send1PercentBoatToggle.checked = Boolean(state.settings.send1PercentBoat);
      refs.send1PercentBoatSubOptions?.classList.toggle("visible", Boolean(state.settings.send1PercentBoat));
    }
    if (refs.send1PercentBoatContextMenuToggle instanceof HTMLInputElement) {
      refs.send1PercentBoatContextMenuToggle.checked = state.settings.send1PercentBoatContextMenu !== false;
    }

    const cheatsEnabled = Boolean(state.settings.cheatsAvailable);
    const cheatsHint = popup.t("Only available in solo or custom games.");
    const cheatsCategory = refs.filtersForm.querySelector(
      '[data-helper-category-content="cheats"]',
    );
    if (cheatsCategory instanceof HTMLElement) {
      for (const input of cheatsCategory.querySelectorAll('input[type="checkbox"]')) {
        if (!(input instanceof HTMLInputElement)) {
          continue;
        }
        input.disabled = !cheatsEnabled;
        input.title = cheatsEnabled ? "" : cheatsHint;
        const card = input.closest(".toggle-card");
        if (card instanceof HTMLElement) {
          card.dataset.disabled = String(!cheatsEnabled);
          card.title = input.title;
        }
      }

      for (const button of cheatsCategory.querySelectorAll("button")) {
        if (!(button instanceof HTMLButtonElement)) {
          continue;
        }
        button.disabled = !cheatsEnabled;
        button.title = cheatsEnabled ? button.dataset.infoTitle || "" : cheatsHint;
      }
    }

    if (refs.applySelectiveTradePolicyInput instanceof HTMLInputElement) {
      refs.applySelectiveTradePolicyInput.disabled =
        !state.settings.autoCancelDeniedTradesAvailable;
      refs.applySelectiveTradePolicyInput.checked = Boolean(
        state.settings.selectiveTradePolicyEnabled,
      );
      refs.applySelectiveTradePolicyInput.title =
        state.settings.autoCancelDeniedTradesAvailable
          ? popup.t("Blocks trades with players who are not on your team.")
          : popup.t("Available only during an active team game.");

      const actionCard = refs.applySelectiveTradePolicyInput.closest(
        ".helper-action-card",
      );
      if (actionCard instanceof HTMLElement) {
        actionCard.dataset.disabled = String(
          !state.settings.autoCancelDeniedTradesAvailable,
        );
        actionCard.title = refs.applySelectiveTradePolicyInput.title;
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
        popup.t(shared.getEconomyHeatmapIntensityLabel(
          state.settings.economyHeatmapIntensity,
        ));
    }

    popup.renderMapSearch();
    popup.renderLanguageOptions();
    popup.localize();
  };
})(globalThis);
