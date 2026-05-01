(function initOpenFrontHelperSettings(globalScope) {
  const MAPS = Array.isArray(globalScope.OPENFRONT_MAPS)
    ? globalScope.OPENFRONT_MAPS
    : [];
  const MAP_IDS = MAPS.map((map) => map.id);

  const FILTER_KEYS = [
    "ffaLobby",
    "duosLobby",
    "triosLobby",
    "quadsLobby",
    "teamsLargerThanTriosLobby",
    "startingGold0M",
    "randomSpawn",
    "alliancesDisabled",
    "startingGold5M",
    "startingGold25M",
    "goldMultiplier2x",
  ];

  const LOBBY_TYPE_FILTER_KEYS = [
    "ffaLobby",
    "duosLobby",
    "triosLobby",
    "quadsLobby",
    "teamsLargerThanTriosLobby",
  ];

  const START_GOLD_FILTER_KEYS = [
    "startingGold0M",
    "startingGold5M",
    "startingGold25M",
  ];

  function createDefaultMapFilters() {
    return Object.fromEntries(MAP_IDS.map((id) => [id, false]));
  }

  const DEFAULT_INCLUDE_EXCLUDE_FILTERS = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, false]),
  );

  const DEFAULT_SETTINGS = {
    language: "en",
    enabled: false,
    searchStartedAt: null,
    joinNotification: false,
    minLobbySize: null,
    markBotNationsRed: false,
    showGoldPerMinute: false,
    showTeamGoldPerMinute: false,
    showTopGoldPerMinute: false,
    markHoveredAlliesGreen: false,
    showAllianceRequestsPanel: false,
    showTradeBalances: false,
    selectiveTradePolicyEnabled: false,
    autoCancelDeniedTradesAvailable: false,
    cheatsAvailable: false,
    showNukePrediction: false,
    showNukeSuggestions: false,
    showBoatPrediction: false,
    autoNuke: false,
    send1PercentBoat: false,
    showEconomyHeatmap: false,
    economyHeatmapIntensity: 1,
    showExportPartnerHeatmap: false,
    showNukeTargetHeatmap: false,
    applySelectiveTradePolicyRequestAt: null,
    showFloatingHelpersPanel: false,
    lobbyForecast: {
      available: false,
      sampleSize: 0,
      etaMinSeconds: null,
      etaMaxSeconds: null,
      hitChanceNext10: null,
      medianLobbiesToMatch: null,
      last100Averages: {
        windowSize: 100,
        sampleSize: 0,
        hitRate: null,
        avgLobbyIntervalMs: null,
        avgLobbiesPerMinute: null,
        etaSeconds: null,
        updatedAt: null,
      },
    },
    floatingHelpersPanelPosition: {
      left: null,
      top: null,
    },
    floatingHelpersPanelHeight: null,
    collapsedHelperCategories: {
      game: false,
      economic: false,
    },
    includeFilters: {
      ...DEFAULT_INCLUDE_EXCLUDE_FILTERS,
    },
    excludeFilters: {
      ...DEFAULT_INCLUDE_EXCLUDE_FILTERS,
    },
    mapFilters: createDefaultMapFilters(),
    mapExcludeFilters: createDefaultMapFilters(),
  };

  function normalizeEconomyHeatmapIntensity(value) {
    const intensity = Number(value);
    if (!Number.isFinite(intensity)) {
      return DEFAULT_SETTINGS.economyHeatmapIntensity;
    }
    return Math.max(0, Math.min(2, Math.round(intensity)));
  }

  function getEconomyHeatmapIntensityLabel(value) {
    return ["Low", "Default", "High"][normalizeEconomyHeatmapIntensity(value)];
  }

  function normalizeFloatingHelpersPanelPosition(value = {}) {
    const left = Number(value.left);
    const top = Number(value.top);
    return {
      left:
        value.left == null || value.left === "" || !Number.isFinite(left)
          ? null
          : left,
      top:
        value.top == null || value.top === "" || !Number.isFinite(top)
          ? null
          : top,
    };
  }

  function normalizeFloatingHelpersPanelHeight(value) {
    const height = Number(value);
    return Number.isFinite(height) && height > 0 ? height : null;
  }

  function normalizeActionRequestTimestamp(value) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  }

  function normalizeMinLobbySize(value) {
    if (value == null || value === "") {
      return null;
    }
    const size = Number(value);
    return Number.isFinite(size) && size > 0 ? Math.min(100, Math.floor(size)) : null;
  }

  function normalizeSearchStartedAt(rawSettings, ensureActiveSearchTimestamp) {
    if (!rawSettings?.enabled) {
      return null;
    }

    const searchStartedAt = Number(rawSettings.searchStartedAt);
    if (Number.isFinite(searchStartedAt) && searchStartedAt > 0) {
      return searchStartedAt;
    }

    return ensureActiveSearchTimestamp ? Date.now() : null;
  }

  function normalizeForecastSeconds(value) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  }

  function normalizeForecastProbability(value) {
    const probability = Number(value);
    if (!Number.isFinite(probability)) {
      return null;
    }
    return Math.max(0, Math.min(1, probability));
  }

  function normalizeForecastCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? Math.round(count) : 0;
  }

  function normalizeForecastMilliseconds(value) {
    const milliseconds = Number(value);
    return Number.isFinite(milliseconds) && milliseconds > 0
      ? Math.round(milliseconds)
      : null;
  }

  function normalizeLobbyForecast(value = {}) {
    const source = value || {};
    const averagesSource = source.last100Averages || {};
    return {
      available: Boolean(source.available),
      sampleSize: normalizeForecastCount(source.sampleSize),
      etaMinSeconds: normalizeForecastSeconds(source.etaMinSeconds),
      etaMaxSeconds: normalizeForecastSeconds(source.etaMaxSeconds),
      hitChanceNext10: normalizeForecastProbability(source.hitChanceNext10),
      medianLobbiesToMatch:
        source.medianLobbiesToMatch == null
          ? null
          : Math.max(1, normalizeForecastCount(source.medianLobbiesToMatch)),
      last100Averages: {
        windowSize: 100,
        sampleSize: Math.min(100, normalizeForecastCount(averagesSource.sampleSize)),
        hitRate: normalizeForecastProbability(averagesSource.hitRate),
        avgLobbyIntervalMs: normalizeForecastMilliseconds(
          averagesSource.avgLobbyIntervalMs,
        ),
        avgLobbiesPerMinute:
          averagesSource.avgLobbiesPerMinute == null
            ? null
            : Number.isFinite(Number(averagesSource.avgLobbiesPerMinute))
              ? Math.max(0, Number(averagesSource.avgLobbiesPerMinute))
              : null,
        etaSeconds: normalizeForecastSeconds(averagesSource.etaSeconds),
        updatedAt: normalizeActionRequestTimestamp(averagesSource.updatedAt),
      },
    };
  }

  function normalizeLanguage(value) {
    const language = String(value || "").trim().toLowerCase();
    return /^[a-z]{2}$/.test(language) ? language : DEFAULT_SETTINGS.language;
  }

  function normalizeMapFilters(rawMapFilters = {}) {
    const normalizedMapFilters = createDefaultMapFilters();
    for (const id of MAP_IDS) {
      normalizedMapFilters[id] = Boolean(rawMapFilters[id]);
    }
    return normalizedMapFilters;
  }

  function normalizeSettings(rawSettings = {}, options = {}) {
    const { ensureActiveSearchTimestamp = false } = options;
    const source = rawSettings || {};
    const includeFilters = source.includeFilters || source.filters || {};
    const excludeFilters = source.excludeFilters || source.excludes || {};
    const mapFilters = source.mapFilters || source.maps || {};
    const mapExcludeFilters = source.mapExcludeFilters || source.mapExcludes || {};
    const floatingHelpersPanelPosition = source.floatingHelpersPanelPosition || {};
    const collapsedHelperCategories = source.collapsedHelperCategories || {};

    const normalized = {
      ...DEFAULT_SETTINGS,
      ...source,
      searchStartedAt: normalizeSearchStartedAt(
        source,
        ensureActiveSearchTimestamp,
      ),
      minLobbySize: normalizeMinLobbySize(source.minLobbySize),
      floatingHelpersPanelPosition: normalizeFloatingHelpersPanelPosition(
        floatingHelpersPanelPosition,
      ),
      floatingHelpersPanelHeight: normalizeFloatingHelpersPanelHeight(
        source.floatingHelpersPanelHeight,
      ),
      lobbyForecast: normalizeLobbyForecast(source.lobbyForecast),
      collapsedHelperCategories: {
        ...DEFAULT_SETTINGS.collapsedHelperCategories,
        ...collapsedHelperCategories,
      },
      includeFilters: {
        ...DEFAULT_SETTINGS.includeFilters,
        ...includeFilters,
      },
      excludeFilters: {
        ...DEFAULT_SETTINGS.excludeFilters,
        ...excludeFilters,
      },
      mapFilters: normalizeMapFilters(mapFilters),
      mapExcludeFilters: normalizeMapFilters(mapExcludeFilters),
    };

    if (normalized.showNukeTargetHeatmap) {
      normalized.showEconomyHeatmap = false;
      normalized.showExportPartnerHeatmap = false;
    } else if (normalized.showExportPartnerHeatmap) {
      normalized.showEconomyHeatmap = false;
    }

    normalized.economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(
      normalized.economyHeatmapIntensity,
    );
    normalized.language = normalizeLanguage(normalized.language);
    normalized.applySelectiveTradePolicyRequestAt = normalizeActionRequestTimestamp(
      normalized.applySelectiveTradePolicyRequestAt,
    );

    return normalized;
  }

  globalScope.OpenFrontHelperSettings = {
    STORAGE_KEY: "settings",
    INSTALL_NOTICE_KEY: "installReloadNoticePending",
    WHATS_NEW_NOTICE_KEY: "whatsNewNoticePending",
    MAPS,
    MAP_IDS,
    FILTER_KEYS,
    LOBBY_TYPE_FILTER_KEYS,
    START_GOLD_FILTER_KEYS,
    DEFAULT_SETTINGS,
    createDefaultMapFilters,
    normalizeSettings,
    normalizeMinLobbySize,
    normalizeLanguage,
    normalizeMapFilters,
    normalizeEconomyHeatmapIntensity,
    normalizeFloatingHelpersPanelPosition,
    normalizeFloatingHelpersPanelHeight,
    normalizeActionRequestTimestamp,
    getEconomyHeatmapIntensityLabel,
  };
})(globalThis);
