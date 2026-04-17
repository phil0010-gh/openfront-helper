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
    enabled: false,
    searchStartedAt: null,
    markBotNationsRed: false,
    showGoldPerMinute: false,
    showTeamGoldPerMinute: false,
    showTopGoldPerMinute: false,
    markHoveredAlliesGreen: false,
    showTradeBalances: false,
    selectiveTradePolicyEnabled: false,
    autoCancelDeniedTradesAvailable: false,
    fpsSaver: false,
    showAttackAmounts: false,
    showNukeLandingZones: false,
    showNukeSuggestions: false,
    autoNuke: false,
    showEconomyHeatmap: false,
    economyHeatmapIntensity: 1,
    showExportPartnerHeatmap: false,
    showNukeTargetHeatmap: false,
    applySelectiveTradePolicyRequestAt: null,
    showFloatingHelpersPanel: false,
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
      floatingHelpersPanelPosition: normalizeFloatingHelpersPanelPosition(
        floatingHelpersPanelPosition,
      ),
      floatingHelpersPanelHeight: normalizeFloatingHelpersPanelHeight(
        source.floatingHelpersPanelHeight,
      ),
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
    normalizeMapFilters,
    normalizeEconomyHeatmapIntensity,
    normalizeFloatingHelpersPanelPosition,
    normalizeFloatingHelpersPanelHeight,
    normalizeActionRequestTimestamp,
    getEconomyHeatmapIntensityLabel,
  };
})(globalThis);
