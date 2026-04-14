(function () {
  if (window.__openfrontAutoJoinBridgeReady) {
    return;
  }

  const PAGE_SOURCE = "openfront-autojoin-page";
  const EXTENSION_SOURCE = "openfront-autojoin-extension";
  const BOT_MARKER_CONTAINER_ID = "openfront-helper-bot-marker-layer";
  const BOT_MARKER_STYLE_ID = "openfront-helper-bot-marker-styles";
  const ALLY_MARKER_CONTAINER_ID = "openfront-helper-ally-marker-layer";
  const ALLY_MARKER_STYLE_ID = "openfront-helper-ally-marker-styles";
  const ECONOMY_HEATMAP_CONTAINER_ID = "openfront-helper-economy-heatmap-layer";
  const ECONOMY_HEATMAP_STYLE_ID = "openfront-helper-economy-heatmap-styles";
  const ECONOMY_HEATMAP_CANVAS_CLASS = "openfront-helper-economy-heatmap-canvas";
  const EXPORT_PARTNER_HEATMAP_CONTAINER_ID = "openfront-helper-export-partner-heatmap-layer";
  const EXPORT_PARTNER_HEATMAP_STYLE_ID = "openfront-helper-export-partner-heatmap-styles";
  const EXPORT_PARTNER_HEATMAP_CANVAS_CLASS = "openfront-helper-export-partner-heatmap-canvas";
  const HELPER_STATS_CONTAINER_ID = "openfront-helper-stats-container";
  const HELPER_STATS_STYLE_ID = "openfront-helper-stats-container-styles";
  const GOLD_PER_MINUTE_BADGE_ID = "openfront-helper-gpm-badge";
  const GOLD_PER_MINUTE_STYLE_ID = "openfront-helper-gpm-styles";
  const TEAM_GOLD_PER_MINUTE_BADGE_ID = "openfront-helper-team-gpm-badge";
  const TEAM_GOLD_PER_MINUTE_STYLE_ID = "openfront-helper-team-gpm-styles";
  const TOP_GOLD_PER_MINUTE_BADGE_ID = "openfront-helper-top-gpm-badge";
  const TOP_GOLD_PER_MINUTE_STYLE_ID = "openfront-helper-top-gpm-styles";
  const TRADE_BALANCE_BADGE_ID = "openfront-helper-trade-balance-badge";
  const TRADE_BALANCE_STYLE_ID = "openfront-helper-trade-balance-styles";
  const ATTACK_AMOUNT_CONTAINER_ID = "openfront-helper-attack-amount-layer";
  const ATTACK_AMOUNT_STYLE_ID = "openfront-helper-attack-amount-styles";
  const GOLD_PER_MINUTE_SAMPLE_MS = 1000;
  const GOLD_PER_MINUTE_WINDOW_MS = 60000;
  const ECONOMY_HEATMAP_DRAW_MS = 66;
  const ECONOMY_HEATMAP_DATA_REFRESH_MS = 1000;
  const ECONOMY_HEATMAP_VIEWPORT_PADDING = 120;
  const HEATMAP_REFERENCE_ZOOM = 1.8;
  const TEAM_COLORS = {
    Red: "#ef4444",
    Blue: "#3b82f6",
    Teal: "#14b8a6",
    Purple: "#a855f7",
    Yellow: "#facc15",
    Orange: "#f97316",
    Green: "#22c55e",
    Humans: "#60a5fa",
    Nations: "#ef4444",
  };

  let botMarkersEnabled = false;
  let botMarkerAnimationFrame = null;
  let allyMarkersEnabled = false;
  let allyMarkerAnimationFrame = null;
  let goldPerMinuteEnabled = false;
  let goldPerMinuteInterval = null;
  let goldPerMinuteAnimationFrame = null;
  let lastGoldPerMinuteSampleAt = 0;
  let lastProcessedIncomingGoldTransferTick = null;
  let teamGoldPerMinuteEnabled = false;
  let teamGoldPerMinuteAnimationFrame = null;
  let topGoldPerMinuteEnabled = false;
  let topGoldPerMinuteAnimationFrame = null;
  let tradeBalancesEnabled = false;
  let tradeBalanceAnimationFrame = null;
  let lastProcessedTradeBalanceTick = null;
  let fpsSaverEnabled = false;
  let fpsSaverPatchInstalled = false;
  let attackAmountsEnabled = false;
  let attackAmountAnimationFrame = null;
  let nextAttackAmountPositionRefreshAt = 0;
  let attackAmountPositionVersion = 0;
  let attackAmountPositionRequestInFlight = false;
  let economyHeatmapEnabled = false;
  let economyHeatmapAnimationFrame = null;
  let lastEconomyHeatmapDrawAt = 0;
  let lastEconomyHeatmapDataAt = 0;
  let economyHeatmapDataGame = null;
  let economyHeatmapSources = [];
  let exportPartnerHeatmapEnabled = false;
  let exportPartnerHeatmapAnimationFrame = null;
  let lastExportPartnerHeatmapDrawAt = 0;
  let lastOpenFrontGameContext = null;
  const goldTrackers = new Map();
  const incomingGoldTransfers = new Map();
  const tradeBalanceTrackers = new Map();
  const exportPartnerSourceTrackers = new Map();
  const factoryPortSpendTrackers = new Map();
  const factoryPortUnitTrackers = new Map();
  const trainTradeTrackers = new Map();
  const attackAmountPositions = new Map();
  const attackAmountBorderTiles = new Map();
  const attackAmountBorderTileRequests = new Set();
  const trackedNukeFx = new WeakSet();
  const trackedFxArrays = new Set();
  const originalArrayConcat = Array.prototype.concat;

  function postToExtension(type, payload) {
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type,
        payload,
      },
      "*",
    );
  }

  document.addEventListener("public-lobbies-update", (event) => {
    postToExtension("PUBLIC_LOBBIES_UPDATE", event.detail?.payload ?? null);
  });

  function ensureBotMarkerStyles() {
    if (document.getElementById(BOT_MARKER_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = BOT_MARKER_STYLE_ID;
    style.textContent = `
      #${BOT_MARKER_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
      }

      #${BOT_MARKER_CONTAINER_ID} .openfront-helper-bot-dot {
        position: fixed;
        width: 13px;
        height: 13px;
        margin: -6.5px 0 0 -6.5px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.68);
        box-shadow:
          0 0 0 2px rgba(127, 29, 29, 0.34),
          0 0 10px rgba(239, 68, 68, 0.72);
        transform: translate(var(--bot-x), var(--bot-y));
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureBotMarkerContainer() {
    ensureBotMarkerStyles();

    let container = document.getElementById(BOT_MARKER_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = BOT_MARKER_CONTAINER_ID;
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function ensureAllyMarkerStyles() {
    if (document.getElementById(ALLY_MARKER_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = ALLY_MARKER_STYLE_ID;
    style.textContent = `
      #${ALLY_MARKER_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-lines {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        overflow: visible;
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-line {
        stroke: rgba(34, 197, 94, 0.58);
        stroke-width: 2.5;
        stroke-linecap: round;
        filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.72));
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-dot {
        position: fixed;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: max-content;
        margin: -7.5px 0 0 -50px;
        color: #dcfce7;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 10px;
        font-weight: 900;
        line-height: 1;
        text-align: center;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.92);
        transform: translate(var(--ally-x), var(--ally-y));
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-dot::before {
        content: "";
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: rgba(34, 197, 94, 0.72);
        box-shadow:
          0 0 0 2px rgba(20, 83, 45, 0.38),
          0 0 13px rgba(34, 197, 94, 0.78);
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-time {
        display: grid;
        gap: 2px;
        min-width: 100px;
        padding: 4px 6px;
        border: 1px solid rgba(134, 239, 172, 0.34);
        border-radius: 8px;
        background: rgba(5, 46, 22, 0.78);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-time span {
        white-space: nowrap;
      }

      #${ALLY_MARKER_CONTAINER_ID} .openfront-helper-ally-label {
        color: rgba(220, 252, 231, 0.82);
        font-size: 9px;
        letter-spacing: 0;
        text-transform: uppercase;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAllyMarkerContainer() {
    ensureAllyMarkerStyles();

    let container = document.getElementById(ALLY_MARKER_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = ALLY_MARKER_CONTAINER_ID;
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function ensureAllyLineSvg(container) {
    let svg = container.querySelector(".openfront-helper-ally-lines");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("openfront-helper-ally-lines");
      svg.setAttribute("aria-hidden", "true");
      container.prepend(svg);
    }
    return svg;
  }

  function ensureAttackAmountStyles() {
    if (document.getElementById(ATTACK_AMOUNT_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = ATTACK_AMOUNT_STYLE_ID;
    style.textContent = `
      #${ATTACK_AMOUNT_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
      }

      #${ATTACK_AMOUNT_CONTAINER_ID} .openfront-helper-attack-amount {
        position: fixed;
        left: var(--attack-x);
        top: var(--attack-y);
        min-width: 38px;
        padding: 3px 7px;
        border: 1px solid rgba(250, 204, 21, 0.58);
        border-radius: 8px;
        background: rgba(7, 12, 18, 0.82);
        box-shadow:
          0 6px 16px rgba(0, 0, 0, 0.36),
          0 0 13px rgba(250, 204, 21, 0.22);
        color: var(--attack-color, #facc15);
        font: 900 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-variant-numeric: tabular-nums;
        text-align: center;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.92);
        transform: translate(-50%, -50%);
        transition:
          left 240ms ease-in-out,
          top 240ms ease-in-out;
        white-space: nowrap;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAttackAmountContainer() {
    ensureAttackAmountStyles();

    let container = document.getElementById(ATTACK_AMOUNT_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = ATTACK_AMOUNT_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function ensureEconomyHeatmapStyles() {
    if (document.getElementById(ECONOMY_HEATMAP_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = ECONOMY_HEATMAP_STYLE_ID;
    style.textContent = `
      #${ECONOMY_HEATMAP_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        pointer-events: none;
      }

      #${ECONOMY_HEATMAP_CONTAINER_ID} .${ECONOMY_HEATMAP_CANVAS_CLASS} {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        opacity: 0.82;
        mix-blend-mode: normal;
      }

      #${ECONOMY_HEATMAP_CONTAINER_ID}[data-status]::after {
        content: attr(data-status);
        position: fixed;
        left: 18px;
        bottom: 18px;
        padding: 7px 10px;
        border: 1px solid rgba(74, 222, 128, 0.45);
        border-radius: 8px;
        background: rgba(6, 30, 18, 0.78);
        color: rgba(220, 252, 231, 0.95);
        font: 600 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureEconomyHeatmapCanvas() {
    ensureEconomyHeatmapStyles();

    let container = document.getElementById(ECONOMY_HEATMAP_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = ECONOMY_HEATMAP_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }

    let canvas = container.querySelector(`.${ECONOMY_HEATMAP_CANVAS_CLASS}`);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = ECONOMY_HEATMAP_CANVAS_CLASS;
      container.appendChild(canvas);
    }

    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.floor(window.innerWidth * pixelRatio));
    const height = Math.max(1, Math.floor(window.innerHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    return { canvas, pixelRatio };
  }

  function ensureExportPartnerHeatmapStyles() {
    if (document.getElementById(EXPORT_PARTNER_HEATMAP_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = EXPORT_PARTNER_HEATMAP_STYLE_ID;
    style.textContent = `
      #${EXPORT_PARTNER_HEATMAP_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
      }

      #${EXPORT_PARTNER_HEATMAP_CONTAINER_ID} .${EXPORT_PARTNER_HEATMAP_CANVAS_CLASS} {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        opacity: 0.84;
        mix-blend-mode: normal;
      }

      #${EXPORT_PARTNER_HEATMAP_CONTAINER_ID}[data-status]::after {
        content: attr(data-status);
        position: fixed;
        left: 18px;
        bottom: 18px;
        padding: 7px 10px;
        border: 1px solid rgba(45, 212, 191, 0.45);
        border-radius: 8px;
        background: rgba(10, 30, 34, 0.78);
        color: rgba(204, 251, 241, 0.95);
        font: 600 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureExportPartnerHeatmapCanvas() {
    ensureExportPartnerHeatmapStyles();

    let container = document.getElementById(EXPORT_PARTNER_HEATMAP_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = EXPORT_PARTNER_HEATMAP_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }

    let canvas = container.querySelector(`.${EXPORT_PARTNER_HEATMAP_CANVAS_CLASS}`);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = EXPORT_PARTNER_HEATMAP_CANVAS_CLASS;
      container.appendChild(canvas);
    }

    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.floor(window.innerWidth * pixelRatio));
    const height = Math.max(1, Math.floor(window.innerHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    return { canvas, pixelRatio };
  }

  function getPlayerEconomicRate(game, player) {
    try {
      const rate = Number(game?.config?.().goldAdditionRate?.(player));
      if (Number.isFinite(rate) && rate > 0) {
        return rate;
      }
    } catch (_error) {
      // Fall through to a terrain-size estimate when the exact config method is unavailable.
    }

    const tiles = Number(player?.numTilesOwned?.());
    if (Number.isFinite(tiles) && tiles > 0) {
      return Math.pow(tiles, 0.6) * 1000;
    }
    return 0;
  }

  function toFiniteNumber(value, fallback = 0) {
    const numberValue = typeof value === "bigint" ? Number(value) : Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  }

  function getUnitLevel(unit) {
    return Math.max(1, toFiniteNumber(unit?.level?.(), 1));
  }

  function getUnitEconomicWeight(unit) {
    const type = String(unit?.type?.() ?? "");
    const level = getUnitLevel(unit);
    if (type === "Factory") {
      return 8 + level * 2;
    }
    if (type === "Port") {
      return 6 + level * 2;
    }
    if (type === "City") {
      return 5 + level;
    }
    return 0;
  }

  function getEconomicUnits(player) {
    try {
      return Array.from(player?.units?.("City", "Port", "Factory") || []);
    } catch (_error) {
      return [];
    }
  }

  function getObservedPlayerGoldPerMinute(player, fallbackIndex) {
    const playerId = getPlayerMarkerId(player, fallbackIndex);
    const tracker = goldTrackers.get(playerId);
    if (!tracker || tracker.samples.length < 2) {
      return null;
    }

    const first = tracker.samples[0];
    const last = tracker.samples[tracker.samples.length - 1];
    const elapsedMs = last.time - first.time;
    if (elapsedMs <= 0) {
      return null;
    }

    return ((last.earnedTotal - first.earnedTotal) / elapsedMs) * 60000;
  }

  function canStationTradeWith(player, otherPlayer) {
    if (!player || !otherPlayer) {
      return false;
    }
    if (getPlayerSmallId(player) === getPlayerSmallId(otherPlayer)) {
      return true;
    }
    return canPlayersTrade(player, otherPlayer);
  }

  function getPotentialPortTradeProfit(game, port, allPorts) {
    if (String(port?.type?.() ?? "") !== "Port") {
      return 0;
    }

    const owner = port.owner?.();
    const tile = port.tile?.();
    if (!owner || tile == null) {
      return 0;
    }

    const routeValues = [];
    for (const otherPort of allPorts) {
      if (otherPort === port || !otherPort?.isActive?.()) {
        continue;
      }

      const otherOwner = otherPort.owner?.();
      const otherTile = otherPort.tile?.();
      if (!otherOwner || otherTile == null || !canPlayersTrade(owner, otherOwner)) {
        continue;
      }

      const distance = toFiniteNumber(game?.manhattanDist?.(tile, otherTile));
      if (distance <= 0) {
        continue;
      }

      const gold = toFiniteNumber(game?.config?.().tradeShipGold?.(distance));
      if (gold > 0) {
        routeValues.push(gold);
      }
    }

    routeValues.sort((a, b) => b - a);
    const bestRoutes = routeValues.slice(0, 4).reduce((total, value) => total + value, 0);
    return (bestRoutes / 2800) * (1 + (getUnitLevel(port) - 1) * 0.18);
  }

  function getPotentialTrainStationProfit(game, unit, allStations) {
    if (!unit?.hasTrainStation?.()) {
      return 0;
    }

    const owner = unit.owner?.();
    const tile = unit.tile?.();
    if (!owner || tile == null) {
      return 0;
    }

    const maxRange = Math.max(
      1,
      toFiniteNumber(game?.config?.().trainStationMaxRange?.(), 100),
    );
    const stationValues = [];
    for (const otherStation of allStations) {
      if (otherStation === unit || !otherStation?.isActive?.()) {
        continue;
      }

      const otherType = String(otherStation?.type?.() ?? "");
      if (otherType !== "City" && otherType !== "Port") {
        continue;
      }

      const otherOwner = otherStation.owner?.();
      const otherTile = otherStation.tile?.();
      if (!otherOwner || otherTile == null || !canStationTradeWith(owner, otherOwner)) {
        continue;
      }

      const distance = toFiniteNumber(game?.manhattanDist?.(tile, otherTile));
      if (distance <= 0 || distance > maxRange) {
        continue;
      }

      const relation = getTrainRelation(owner, otherOwner);
      const gold = toFiniteNumber(
        game?.config?.().trainGold?.(relation, stationValues.length),
      );
      if (gold > 0) {
        const proximity = 1 + (maxRange - distance) / maxRange;
        stationValues.push(gold * proximity);
      }
    }

    stationValues.sort((a, b) => b - a);
    const bestStations = stationValues.slice(0, 8).reduce((total, value) => total + value, 0);
    const type = String(unit?.type?.() ?? "");
    if (type === "Factory") {
      return (bestStations / 2600) * 1.55;
    }
    return bestStations / 3800;
  }

  function getStructureProfitWeight(game, unit, context) {
    const portProfit = getPotentialPortTradeProfit(game, unit, context.allPorts);
    const trainProfit = getPotentialTrainStationProfit(game, unit, context.allStations);
    const directProfit = portProfit + trainProfit;
    if (directProfit <= 0) {
      return 0;
    }

    return directProfit * (1 + Math.max(0, getUnitLevel(unit) - 1) * 0.18);
  }

  function getHeatmapTypePriority(type) {
    if (type === "Factory") {
      return 4;
    }
    if (type === "Port") {
      return 3;
    }
    if (type === "City") {
      return 2;
    }
    return 1;
  }

  function addEconomicSource(sources, tile, weight, type = "Industry") {
    if (tile == null || !Number.isFinite(weight) || weight <= 0) {
      return;
    }

    const key = String(tile);
    const existing = sources.find((source) => String(source.tile) === key);
    if (existing) {
      existing.weight += weight;
      if (getHeatmapTypePriority(type) > getHeatmapTypePriority(existing.type)) {
        existing.type = type;
      }
      return;
    }

    sources.push({
      tile,
      weight,
      type,
    });
  }

  function getHeatmapZoomScale(transform) {
    const scale = Number(transform?.scale);
    if (!Number.isFinite(scale) || scale <= 0) {
      return 1;
    }

    return scale / HEATMAP_REFERENCE_ZOOM;
  }

  function projectEconomyHeatmapPoints(sources, game, transform) {
    const points = [];
    const padding = ECONOMY_HEATMAP_VIEWPORT_PADDING;
    const zoomScale = getHeatmapZoomScale(transform);

    for (const source of sources) {
      if (source.tile == null) {
        continue;
      }

      try {
        const worldPoint = {
          x: game.x(source.tile),
          y: game.y(source.tile),
        };
        const screenPoint = transform.worldToScreenCoordinates(worldPoint);
        if (
          Number.isFinite(screenPoint?.x) &&
          Number.isFinite(screenPoint?.y) &&
          screenPoint.x > -padding &&
          screenPoint.y > -padding &&
          screenPoint.x < window.innerWidth + padding &&
          screenPoint.y < window.innerHeight + padding
        ) {
          points.push({
            x: screenPoint.x,
            y: screenPoint.y,
            weight: source.weight,
            type: source.type,
            zoomScale,
          });
        }
      } catch (_error) {
        // Ignore points from stale units or off-map references.
      }
    }

    return points;
  }

  function collectEconomyHeatmapSources(game) {
    const sources = [];
    const players = Array.from(game?.playerViews?.() || []);
    const allPorts = Array.from(game?.units?.("Port") || []);
    const allStations = Array.from(game?.units?.("City", "Port", "Factory") || []).filter(
      (unit) => unit?.hasTrainStation?.(),
    );

    for (const player of players) {
      if (!player?.isAlive?.()) {
        continue;
      }

      const units = getEconomicUnits(player).filter((unit) => !unit?.isUnderConstruction?.());
      for (const unit of units) {
        const profitWeight = getStructureProfitWeight(game, unit, {
          allPorts,
          allStations,
        });
        addEconomicSource(
          sources,
          unit.tile?.(),
          profitWeight,
          String(unit?.type?.() ?? "Industry"),
        );
      }
    }

    return sources;
  }

  function getEconomyHeatmapSources(game) {
    const now = performance.now();
    if (
      economyHeatmapDataGame !== game ||
      lastEconomyHeatmapDataAt === 0 ||
      now - lastEconomyHeatmapDataAt >= ECONOMY_HEATMAP_DATA_REFRESH_MS
    ) {
      economyHeatmapSources = collectEconomyHeatmapSources(game);
      economyHeatmapDataGame = game;
      lastEconomyHeatmapDataAt = now;
    }

    return economyHeatmapSources;
  }

  function drawEconomyHeatmapPoint(ctx, point, maxWeight, pixelRatio) {
    const intensity = Math.max(0.28, Math.min(1, point.weight / maxWeight));
    const x = point.x * pixelRatio;
    const y = point.y * pixelRatio;
    const typeScale =
      point.type === "Factory" ? 1.25 : point.type === "Port" ? 1.05 : 0.9;
    const radius =
      (18 + intensity * 52) * typeScale * point.zoomScale * pixelRatio;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(239, 68, 68, ${0.9 * intensity})`);
    gradient.addColorStop(0.3, `rgba(250, 204, 21, ${0.68 * intensity})`);
    gradient.addColorStop(0.66, `rgba(34, 197, 94, ${0.38 * intensity})`);
    gradient.addColorStop(1, "rgba(34, 197, 94, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEconomyHeatmap() {
    if (!economyHeatmapEnabled) {
      economyHeatmapAnimationFrame = null;
      return;
    }

    const now = performance.now();
    if (now - lastEconomyHeatmapDrawAt < ECONOMY_HEATMAP_DRAW_MS) {
      economyHeatmapAnimationFrame = requestAnimationFrame(drawEconomyHeatmap);
      return;
    }
    lastEconomyHeatmapDrawAt = now;

    const context = getOpenFrontGameContext();
    const { canvas, pixelRatio } = ensureEconomyHeatmapCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      economyHeatmapAnimationFrame = requestAnimationFrame(drawEconomyHeatmap);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!context?.game || !context?.transform) {
      canvas.parentElement?.setAttribute("data-status", "Economic heatmap: waiting for game data");
      economyHeatmapAnimationFrame = requestAnimationFrame(drawEconomyHeatmap);
      return;
    }

    sampleGoldPerMinuteIfDue();
    let points = [];
    try {
      const sources = getEconomyHeatmapSources(context.game);
      points = projectEconomyHeatmapPoints(
        sources,
        context.game,
        context.transform,
      );
    } catch (_error) {
      canvas.parentElement?.setAttribute("data-status", "Economic heatmap: data error");
      economyHeatmapAnimationFrame = requestAnimationFrame(drawEconomyHeatmap);
      return;
    }
    if (points.length === 0) {
      canvas.parentElement?.setAttribute("data-status", "Economic heatmap: no profitable structures found");
      economyHeatmapAnimationFrame = requestAnimationFrame(drawEconomyHeatmap);
      return;
    }

    canvas.parentElement?.removeAttribute("data-status");
    const maxWeight = Math.max(1, ...points.map((point) => point.weight));
    ctx.globalCompositeOperation = "lighter";
    for (const point of points) {
      drawEconomyHeatmapPoint(ctx, point, maxWeight, pixelRatio);
    }
    ctx.globalCompositeOperation = "source-over";

    economyHeatmapAnimationFrame = requestAnimationFrame(drawEconomyHeatmap);
  }

  function drawExportPartnerHeatmapPoint(ctx, point, maxWeight, pixelRatio) {
    const intensity = Math.max(0.3, Math.min(1, point.weight / maxWeight));
    const x = point.x * pixelRatio;
    const y = point.y * pixelRatio;
    const typeScale =
      point.type === "City"
        ? 1.35
        : point.type === "Factory"
          ? 1.15
          : point.type === "Port"
            ? 1.05
            : 0.95;
    const radius =
      (20 + intensity * 64) * typeScale * point.zoomScale * pixelRatio;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(20, 184, 166, ${0.94 * intensity})`);
    gradient.addColorStop(0.34, `rgba(250, 204, 21, ${0.66 * intensity})`);
    gradient.addColorStop(0.72, `rgba(59, 130, 246, ${0.36 * intensity})`);
    gradient.addColorStop(1, "rgba(59, 130, 246, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawExportPartnerHeatmap() {
    if (!exportPartnerHeatmapEnabled) {
      exportPartnerHeatmapAnimationFrame = null;
      return;
    }

    const now = performance.now();
    if (now - lastExportPartnerHeatmapDrawAt < ECONOMY_HEATMAP_DRAW_MS) {
      exportPartnerHeatmapAnimationFrame = requestAnimationFrame(drawExportPartnerHeatmap);
      return;
    }
    lastExportPartnerHeatmapDrawAt = now;

    const { canvas, pixelRatio } = ensureExportPartnerHeatmapCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      exportPartnerHeatmapAnimationFrame = requestAnimationFrame(drawExportPartnerHeatmap);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const overlay = getHoveredPlayerInfoOverlay();
    if (!overlay?.game || !overlay?.transform || !overlay?.player) {
      canvas.parentElement?.removeAttribute("data-status");
      exportPartnerHeatmapAnimationFrame = requestAnimationFrame(drawExportPartnerHeatmap);
      return;
    }

    processTradeBalanceUpdates(overlay.game);
    const sources = collectExportPartnerHeatmapSources(overlay.game, overlay.player);
    const points = projectEconomyHeatmapPoints(sources, overlay.game, overlay.transform);
    if (points.length === 0) {
      canvas.parentElement?.setAttribute("data-status", "Export partner heatmap: no observed exports yet");
      exportPartnerHeatmapAnimationFrame = requestAnimationFrame(drawExportPartnerHeatmap);
      return;
    }

    canvas.parentElement?.removeAttribute("data-status");
    const maxWeight = Math.max(1, ...points.map((point) => point.weight));
    ctx.globalCompositeOperation = "lighter";
    for (const point of points) {
      drawExportPartnerHeatmapPoint(ctx, point, maxWeight, pixelRatio);
    }
    ctx.globalCompositeOperation = "source-over";

    exportPartnerHeatmapAnimationFrame = requestAnimationFrame(drawExportPartnerHeatmap);
  }

  function ensureHelperStatsContainerStyles() {
    if (document.getElementById(HELPER_STATS_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = HELPER_STATS_STYLE_ID;
    style.textContent = `
      #${HELPER_STATS_CONTAINER_ID} {
        position: fixed;
        bottom: var(--helper-stats-bottom, calc(8px + env(safe-area-inset-bottom, 0px)));
        left: var(--helper-stats-x, 260px);
        z-index: 2147483647;
        display: none;
        width: min(280px, calc(100vw - 16px));
        gap: 6px;
        padding: 7px;
        border: 1px solid rgba(148, 163, 184, 0.34);
        border-radius: 8px;
        background: rgba(12, 18, 20, 0.88);
        box-shadow:
          0 12px 28px rgba(0, 0, 0, 0.36),
          0 0 18px rgba(45, 212, 191, 0.1);
        pointer-events: none;
      }

      #${HELPER_STATS_CONTAINER_ID}[data-visible="true"] {
        display: grid;
      }

      #${HELPER_STATS_CONTAINER_ID} > * {
        min-width: 0;
      }

    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureHelperStatsContainer() {
    ensureHelperStatsContainerStyles();

    let container = document.getElementById(HELPER_STATS_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = HELPER_STATS_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function positionHelperStatsContainer() {
    const container = ensureHelperStatsContainer();
    const gap = 8;
    const viewportOffsetLeft = Number(window.visualViewport?.offsetLeft) || 0;
    const viewportOffsetBottom = Number(window.visualViewport?.offsetTop) || 0;

    container.style.setProperty(
      "--helper-stats-x",
      `${Math.round(gap + viewportOffsetLeft)}px`,
    );
    container.style.setProperty(
      "--helper-stats-bottom",
      `${Math.round(gap + viewportOffsetBottom)}px`,
    );
    return container;
  }

  function syncHelperStatsContainerVisibility() {
    const container = ensureHelperStatsContainer();
    const hasVisibleCard = Boolean(
      container.querySelector('[data-visible="true"]'),
    );
    container.dataset.visible = String(hasVisibleCard);
    container.setAttribute("aria-hidden", String(!hasVisibleCard));
  }

  function ensureGoldPerMinuteStyles() {
    if (document.getElementById(GOLD_PER_MINUTE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = GOLD_PER_MINUTE_STYLE_ID;
    style.textContent = `
      #${GOLD_PER_MINUTE_BADGE_ID} {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        width: 100%;
        padding: 5px 9px;
        border: 1px solid var(--team-border-color, rgba(250, 204, 21, 0.42));
        border-radius: 8px;
        background:
          linear-gradient(90deg, var(--team-bg-color, rgba(250, 204, 21, 0.16)), rgba(24, 18, 5, 0.86) 62%),
          rgba(24, 18, 5, 0.86);
        color: #fde68a;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        box-shadow:
          0 8px 22px rgba(0, 0, 0, 0.34),
          0 0 14px rgba(250, 204, 21, 0.16);
      }

      #${GOLD_PER_MINUTE_BADGE_ID}[data-visible="true"] {
        display: flex;
      }

      #${GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-gpm-label {
        color: rgba(254, 243, 199, 0.76);
        font-size: 10px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      #${GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-gpm-value {
        color: var(--team-accent-color, #facc15);
        font-variant-numeric: tabular-nums;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureGoldPerMinuteBadge() {
    ensureGoldPerMinuteStyles();

    let badge = document.getElementById(GOLD_PER_MINUTE_BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = GOLD_PER_MINUTE_BADGE_ID;
      badge.innerHTML = `
        <span class="openfront-helper-gpm-label">Gold per minute</span>
        <span class="openfront-helper-gpm-value">tracking</span>
      `;
    }
    const container = ensureHelperStatsContainer();
    if (badge.parentElement !== container) {
      container.appendChild(badge);
    }
    return badge;
  }

  function ensureTeamGoldPerMinuteStyles() {
    if (document.getElementById(TEAM_GOLD_PER_MINUTE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = TEAM_GOLD_PER_MINUTE_STYLE_ID;
    style.textContent = `
      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} {
        display: none;
        width: 100%;
        padding: 7px 9px;
        border: 1px solid rgba(74, 222, 128, 0.38);
        border-radius: 8px;
        background: rgba(6, 30, 18, 0.9);
        color: #dcfce7;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.15;
        box-shadow:
          0 8px 22px rgba(0, 0, 0, 0.34),
          0 0 14px rgba(74, 222, 128, 0.14);
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID}[data-visible="true"] {
        display: grid;
        gap: 5px;
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-team-gpm-title {
        color: rgba(187, 247, 208, 0.76);
        font-size: 10px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-team-gpm-rows {
        display: grid;
        gap: 4px;
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-team-gpm-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        padding-left: 7px;
        border-left: 3px solid var(--team-accent-color, rgba(187, 247, 208, 0.65));
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-team-gpm-name {
        overflow: hidden;
        color: var(--team-accent-color, #bbf7d0);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-team-gpm-value {
        color: var(--team-accent-color, #4ade80);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      #${TEAM_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-team-gpm-empty {
        color: rgba(220, 252, 231, 0.72);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureTeamGoldPerMinuteBadge() {
    ensureTeamGoldPerMinuteStyles();

    let badge = document.getElementById(TEAM_GOLD_PER_MINUTE_BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = TEAM_GOLD_PER_MINUTE_BADGE_ID;
      badge.innerHTML = `
        <span class="openfront-helper-team-gpm-title">Team gold per minute</span>
        <span class="openfront-helper-team-gpm-rows"></span>
      `;
    }
    const container = ensureHelperStatsContainer();
    if (badge.parentElement !== container) {
      container.appendChild(badge);
    }
    return badge;
  }

  function ensureTopGoldPerMinuteStyles() {
    if (document.getElementById(TOP_GOLD_PER_MINUTE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = TOP_GOLD_PER_MINUTE_STYLE_ID;
    style.textContent = `
      #${TOP_GOLD_PER_MINUTE_BADGE_ID} {
        position: fixed;
        bottom: var(--top-gpm-bottom, calc(8px + env(safe-area-inset-bottom, 0px)));
        left: var(--top-gpm-x, 296px);
        z-index: 2147483647;
        display: none;
        width: min(280px, calc(100vw - 16px));
        padding: 7px 9px;
        border: 1px solid rgba(96, 165, 250, 0.38);
        border-radius: 8px;
        background: rgba(10, 22, 36, 0.9);
        color: #dbeafe;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 11px;
        font-weight: 800;
        line-height: 1.15;
        box-shadow:
          0 8px 22px rgba(0, 0, 0, 0.34),
          0 0 14px rgba(96, 165, 250, 0.14);
        pointer-events: none;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID}[data-visible="true"] {
        display: grid;
        gap: 5px;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-title {
        color: rgba(191, 219, 254, 0.76);
        font-size: 10px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-rows {
        display: grid;
        gap: 4px;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-row {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr) auto;
        gap: 6px;
        align-items: center;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-rank {
        color: rgba(191, 219, 254, 0.72);
        font-variant-numeric: tabular-nums;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-name {
        overflow: hidden;
        color: var(--team-accent-color, #bfdbfe);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-value {
        color: #60a5fa;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      #${TOP_GOLD_PER_MINUTE_BADGE_ID} .openfront-helper-top-gpm-empty {
        color: rgba(219, 234, 254, 0.72);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureTopGoldPerMinuteBadge() {
    ensureTopGoldPerMinuteStyles();

    let badge = document.getElementById(TOP_GOLD_PER_MINUTE_BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = TOP_GOLD_PER_MINUTE_BADGE_ID;
      badge.innerHTML = `
        <span class="openfront-helper-top-gpm-title">Top 10 gold per minute</span>
        <span class="openfront-helper-top-gpm-rows"></span>
      `;
    }
    if (!badge.parentElement) {
      (document.body || document.documentElement).appendChild(badge);
    }
    return badge;
  }

  function positionTopGoldPerMinuteBadge() {
    const badge = ensureTopGoldPerMinuteBadge();
    const gap = 8;
    const viewportOffsetLeft = Number(window.visualViewport?.offsetLeft) || 0;
    const viewportOffsetTop = Number(window.visualViewport?.offsetTop) || 0;
    const viewportWidth = Number(window.visualViewport?.width) || window.innerWidth;
    const defaultLeft = Math.round(gap + viewportOffsetLeft);
    const statsContainer = ensureHelperStatsContainer();
    const statsRect =
      statsContainer.dataset.visible === "true"
        ? statsContainer.getBoundingClientRect?.()
        : null;
    const preferredLeft =
      statsRect && statsRect.width > 0
        ? Math.round(statsRect.right + gap + viewportOffsetLeft)
        : defaultLeft;
    const maxLeft = Math.max(
      defaultLeft,
      Math.round(viewportOffsetLeft + viewportWidth - badge.offsetWidth - gap),
    );

    badge.style.setProperty("--top-gpm-x", `${Math.min(preferredLeft, maxLeft)}px`);
    badge.style.setProperty(
      "--top-gpm-bottom",
      `${Math.round(gap + viewportOffsetTop)}px`,
    );
  }

  function ensureTradeBalanceStyles() {
    if (document.getElementById(TRADE_BALANCE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = TRADE_BALANCE_STYLE_ID;
    style.textContent = `
      #${TRADE_BALANCE_BADGE_ID} {
        display: none;
        width: 100%;
        padding: 7px 9px;
        border: 1px solid rgba(45, 212, 191, 0.38);
        border-radius: 8px;
        background: rgba(5, 28, 32, 0.9);
        color: #ccfbf1;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        font-size: 11px;
        font-weight: 800;
        line-height: 1.15;
        box-shadow:
          0 10px 24px rgba(0, 0, 0, 0.36),
          0 0 16px rgba(45, 212, 191, 0.16);
      }

      #${TRADE_BALANCE_BADGE_ID}[data-visible="true"] {
        display: grid;
        gap: 5px;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-title {
        color: rgba(153, 246, 228, 0.82);
        font-size: 10px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        padding: 4px 0 5px;
        border-bottom: 1px solid rgba(153, 246, 228, 0.16);
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-total {
        display: grid;
        gap: 2px;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-total-label {
        color: rgba(204, 251, 241, 0.7);
        font-size: 9px;
        text-transform: uppercase;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-total-value {
        color: #5eead4;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-roi[data-status="unprofitable"] {
        color: #f87171;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-roi[data-status="profitable"] {
        color: #4ade80;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-roi[data-status="unknown"] {
        color: rgba(204, 251, 241, 0.58);
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-rows {
        display: grid;
        gap: 3px;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-name {
        overflow: hidden;
        color: #e0f2fe;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-value {
        color: #2dd4bf;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-value-wrap {
        display: grid;
        gap: 2px;
        justify-items: end;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-direction {
        color: rgba(153, 246, 228, 0.72);
        font-size: 9px;
        text-transform: uppercase;
        white-space: nowrap;
      }

      #${TRADE_BALANCE_BADGE_ID} .openfront-helper-trade-empty {
        color: rgba(204, 251, 241, 0.72);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureTradeBalanceBadge() {
    ensureTradeBalanceStyles();

    let badge = document.getElementById(TRADE_BALANCE_BADGE_ID);
    if (!badge) {
      badge = document.createElement("div");
      badge.id = TRADE_BALANCE_BADGE_ID;
      badge.innerHTML = `
        <span class="openfront-helper-trade-title">Trade balance</span>
        <span class="openfront-helper-trade-summary">
          <span class="openfront-helper-trade-total">
            <span class="openfront-helper-trade-total-label">Total imports</span>
            <span class="openfront-helper-trade-total-value openfront-helper-trade-imports">+0</span>
          </span>
          <span class="openfront-helper-trade-total">
            <span class="openfront-helper-trade-total-label">Total exports</span>
            <span class="openfront-helper-trade-total-value openfront-helper-trade-exports">+0</span>
          </span>
          <span class="openfront-helper-trade-total">
            <span class="openfront-helper-trade-total-label">Factory/port spent</span>
            <span class="openfront-helper-trade-total-value openfront-helper-trade-factory-port-spend">0</span>
          </span>
          <span class="openfront-helper-trade-total">
            <span class="openfront-helper-trade-total-label">Return on investment</span>
            <span class="openfront-helper-trade-total-value openfront-helper-trade-roi">n/a</span>
          </span>
          <span class="openfront-helper-trade-total">
            <span class="openfront-helper-trade-total-label">Break even</span>
            <span class="openfront-helper-trade-total-value openfront-helper-trade-break-even">tracking</span>
          </span>
        </span>
        <span class="openfront-helper-trade-rows"></span>
      `;
    }
    const container = ensureHelperStatsContainer();
    if (badge.parentElement !== container) {
      container.appendChild(badge);
    }
    return badge;
  }

  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  function isLikelyNukeShockwave(fx) {
    return (
      isObject(fx) &&
      "lifeTime" in fx &&
      "duration" in fx &&
      "maxRadius" in fx &&
      Number(fx.duration) === 1500 &&
      Number(fx.maxRadius) >= 100
    );
  }

  function isLikelyNukeSprite(fx) {
    const duration = Number(fx?.duration);
    return (
      isObject(fx) &&
      "animatedSprite" in fx &&
      "elapsedTime" in fx &&
      Number.isFinite(duration) &&
      duration >= 500 &&
      duration <= 900
    );
  }

  function isNukeFxBatch(value) {
    return (
      Array.isArray(value) &&
      value.length >= 2 &&
      value.some(isLikelyNukeShockwave) &&
      value.some(isLikelyNukeSprite)
    );
  }

  function rememberNukeFxBatch(batch) {
    for (const fx of batch) {
      if (isObject(fx)) {
        trackedNukeFx.add(fx);
      }
    }
  }

  function removeTrackedNukeFx() {
    for (const fxArray of trackedFxArrays) {
      if (!Array.isArray(fxArray)) {
        trackedFxArrays.delete(fxArray);
        continue;
      }

      for (let index = fxArray.length - 1; index >= 0; index--) {
        const fx = fxArray[index];
        if (isObject(fx) && trackedNukeFx.has(fx)) {
          fxArray.splice(index, 1);
        }
      }
    }
  }

  function installFpsSaverPatch() {
    if (fpsSaverPatchInstalled) {
      return;
    }

    fpsSaverPatchInstalled = true;
    Array.prototype.concat = function (...items) {
      const nukeBatches = items.filter(isNukeFxBatch);
      if (nukeBatches.length === 0) {
        return originalArrayConcat.apply(this, items);
      }

      for (const batch of nukeBatches) {
        rememberNukeFxBatch(batch);
      }

      if (fpsSaverEnabled) {
        return originalArrayConcat.apply(
          this,
          items.filter((item) => !isNukeFxBatch(item)),
        );
      }

      const result = originalArrayConcat.apply(this, items);
      if (Array.isArray(result)) {
        trackedFxArrays.add(result);
      }
      return result;
    };
  }

  function isUsableOpenFrontGameContext(game, transform) {
    return Boolean(
      game?.playerViews &&
        transform?.worldToScreenCoordinates,
    );
  }

  function rememberOpenFrontGameContext(game, transform) {
    if (!isUsableOpenFrontGameContext(game, transform)) {
      return null;
    }

    lastOpenFrontGameContext = { game, transform };
    return lastOpenFrontGameContext;
  }

  function findOpenFrontGameContextInDom() {
    const gameSources = [];
    const transformSources = [];

    for (const element of document.querySelectorAll("*")) {
      if (element?.game) {
        gameSources.push(element.game);
      }
      if (element?.g) {
        gameSources.push(element.g);
      }
      if (element?.transformHandler) {
        transformSources.push(element.transformHandler);
      }
      if (element?.transform) {
        transformSources.push(element.transform);
      }
    }

    for (const game of gameSources) {
      for (const transform of transformSources) {
        const context = rememberOpenFrontGameContext(game, transform);
        if (context) {
          return context;
        }
      }
    }

    return null;
  }

  function getOpenFrontGameContext() {
    const playerInfoOverlay = document.querySelector("player-info-overlay");
    const playerPanel = document.querySelector("player-panel");
    const emojiTable = document.querySelector("emoji-table");
    const buildMenu = document.querySelector("build-menu");
    const gameLeftSidebar = document.querySelector("game-left-sidebar");
    const gameRightSidebar = document.querySelector("game-right-sidebar");
    const leaderBoard = document.querySelector("leader-board");
    const teamStats = document.querySelector("team-stats");
    const spawnTimer = document.querySelector("spawn-timer");
    const unitDisplay = document.querySelector("unit-display");
    const controlPanel = document.querySelector("control-panel");

    const gameSources = [
      playerInfoOverlay?.game,
      playerPanel?.g,
      emojiTable?.game,
      leaderBoard?.game,
      teamStats?.game,
      gameLeftSidebar?.game,
      gameRightSidebar?.game,
      buildMenu?.game,
      spawnTimer?.game,
      unitDisplay?.game,
      controlPanel?.game,
    ];
    const transformSources = [
      playerInfoOverlay?.transform,
      emojiTable?.transformHandler,
      buildMenu?.transformHandler,
      spawnTimer?.transformHandler,
      unitDisplay?.transformHandler,
      controlPanel?.transformHandler,
    ];

    for (const game of gameSources) {
      for (const transform of transformSources) {
        const context = rememberOpenFrontGameContext(game, transform);
        if (context) {
          return context;
        }
      }
    }

    const discoveredContext = findOpenFrontGameContextInDom();
    if (discoveredContext) {
      return discoveredContext;
    }

    if (
      isUsableOpenFrontGameContext(
        lastOpenFrontGameContext?.game,
        lastOpenFrontGameContext?.transform,
      )
    ) {
      return lastOpenFrontGameContext;
    }

    return null;
  }

  function isNationBotPlayer(player) {
    try {
      const playerType = player?.type?.() ?? player?.data?.playerType;
      return playerType === "NATION";
    } catch (_error) {
      return false;
    }
  }

  function getPlayerMarkerId(player, fallbackIndex) {
    try {
      return String(
        player?.id?.() ??
          player?.smallID?.() ??
          player?.data?.id ??
          player?.displayName?.() ??
          fallbackIndex,
      );
    } catch (_error) {
      return String(fallbackIndex);
    }
  }

  function getPlayerGoldNumber(player) {
    try {
      const gold = player?.gold?.();
      if (typeof gold === "bigint") {
        return Number(gold);
      }
      return Number(gold);
    } catch (_error) {
      return NaN;
    }
  }

  function addIncomingGoldTransfer(playerSmallId, goldAmount) {
    if (
      !Number.isFinite(playerSmallId) ||
      !Number.isFinite(goldAmount) ||
      goldAmount <= 0
    ) {
      return;
    }

    const key = String(playerSmallId);
    incomingGoldTransfers.set(
      key,
      (incomingGoldTransfers.get(key) || 0) + goldAmount,
    );
  }

  function processIncomingGoldTransferUpdates(game) {
    const currentTick = Number(game?.ticks?.());
    if (
      !Number.isFinite(currentTick) ||
      currentTick === lastProcessedIncomingGoldTransferTick
    ) {
      return;
    }
    lastProcessedIncomingGoldTransferTick = currentTick;

    const updates = game?.updatesSinceLastTick?.();
    if (!updates) {
      return;
    }

    for (const updateGroup of Object.values(updates)) {
      if (!Array.isArray(updateGroup)) {
        continue;
      }

      for (const event of updateGroup) {
        if (event?.message !== "events_display.received_gold_from_player") {
          continue;
        }

        addIncomingGoldTransfer(
          Number(event.playerID),
          getTradeEventGoldAmount(event.goldAmount),
        );
      }
    }
  }

  function formatGoldPerMinute(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "tracking";
    }

    const sign = value < 0 ? "-" : "";
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000_000) {
      return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B/min`;
    }
    if (absValue >= 1_000_000) {
      return `${sign}${(absValue / 1_000_000).toFixed(1)}M/min`;
    }
    if (absValue >= 1_000) {
      return `${sign}${(absValue / 1_000).toFixed(1)}K/min`;
    }
    return `${sign}${Math.round(absValue)}/min`;
  }

  function getGoldTracker(player, fallbackIndex) {
    const playerId = getPlayerMarkerId(player, fallbackIndex);
    let tracker = goldTrackers.get(playerId);
    if (!tracker) {
      tracker = {
        lastGold: null,
        earnedTotal: 0,
        samples: [],
      };
      goldTrackers.set(playerId, tracker);
    }
    return { playerId, tracker };
  }

  function sampleGoldPerMinute() {
    const context = getOpenFrontGameContext();
    if (!context) {
      return;
    }

    processIncomingGoldTransferUpdates(context.game);
    const now = Date.now();
    lastGoldPerMinuteSampleAt = now;
    const activeIds = new Set();
    const players = Array.from(context.game.playerViews?.() || []);

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      if (!player?.isAlive?.()) {
        continue;
      }

      const gold = getPlayerGoldNumber(player);
      if (!Number.isFinite(gold)) {
        continue;
      }

      const { playerId, tracker } = getGoldTracker(player, index);
      activeIds.add(playerId);
      const playerSmallId = getPlayerSmallId(player, index);
      const incomingTransfer =
        incomingGoldTransfers.get(String(playerSmallId)) || 0;

      if (tracker.lastGold !== null && gold > tracker.lastGold) {
        tracker.earnedTotal += Math.max(0, gold - tracker.lastGold - incomingTransfer);
      }
      incomingGoldTransfers.delete(String(playerSmallId));
      tracker.lastGold = gold;
      tracker.samples.push({
        time: now,
        earnedTotal: tracker.earnedTotal,
      });

      const oldestAllowed = now - GOLD_PER_MINUTE_WINDOW_MS;
      while (
        tracker.samples.length > 1 &&
        tracker.samples[0].time < oldestAllowed
      ) {
        tracker.samples.shift();
      }
    }

    for (const playerId of goldTrackers.keys()) {
      if (!activeIds.has(playerId)) {
        goldTrackers.delete(playerId);
      }
    }
  }

  function sampleGoldPerMinuteIfDue() {
    const context = getOpenFrontGameContext();
    if (context?.game) {
      processIncomingGoldTransferUpdates(context.game);
    }
    if (Date.now() - lastGoldPerMinuteSampleAt >= GOLD_PER_MINUTE_SAMPLE_MS) {
      sampleGoldPerMinute();
    }
  }

  function getGoldPerMinuteForPlayer(player, fallbackIndex) {
    const { tracker } = getGoldTracker(player, fallbackIndex);
    if (tracker.samples.length < 2) {
      return null;
    }

    const first = tracker.samples[0];
    const last = tracker.samples[tracker.samples.length - 1];
    const elapsedMs = last.time - first.time;
    if (elapsedMs <= 0) {
      return null;
    }

    return ((last.earnedTotal - first.earnedTotal) / elapsedMs) * 60000;
  }

  function getPlayerTeamName(player) {
    try {
      const team = player?.team?.();
      return team == null ? null : String(team);
    } catch (_error) {
      return null;
    }
  }

  function getTeamColor(team, game = null) {
    if (team != null && game?.config?.().theme?.().teamColor) {
      try {
        const color = game.config().theme().teamColor(String(team));
        const hex = color?.toHex?.();
        if (hex) {
          return hex;
        }
      } catch (_error) {
        // Fall back to the local palette when the game theme is unavailable.
      }
    }

    const teamKey = String(team ?? "");
    const normalizedKey = teamKey.trim().toLowerCase();
    const directMatch = Object.entries(TEAM_COLORS).find(
      ([name]) => name.toLowerCase() === normalizedKey,
    );
    if (directMatch) {
      return directMatch[1];
    }

    return TEAM_COLORS[teamKey] || "#4ade80";
  }

  function getTeamColorBackground(team, game = null) {
    const color = getTeamColor(team, game);
    return `${color}2b`;
  }

  function getTeamGoldPerMinuteRows(game) {
    const players = Array.from(game?.playerViews?.() || []);
    const teams = new Map();

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      if (!player?.isAlive?.()) {
        continue;
      }

      const team = getPlayerTeamName(player);
      if (!team || team === "Bot") {
        continue;
      }

      const gpm = getGoldPerMinuteForPlayer(player, index);
      const entry = teams.get(team) ?? {
        team,
        total: 0,
        trackedPlayers: 0,
        players: 0,
      };
      entry.players += 1;
      if (Number.isFinite(gpm)) {
        entry.total += gpm;
        entry.trackedPlayers += 1;
      }
      teams.set(team, entry);
    }

    return Array.from(teams.values()).sort((a, b) => b.total - a.total);
  }

  function getTopGoldPerMinuteRows(game) {
    const players = Array.from(game?.playerViews?.() || []);
    const rows = [];

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      if (!player?.isAlive?.()) {
        continue;
      }

      const gpm = getGoldPerMinuteForPlayer(player, index);
      if (!Number.isFinite(gpm)) {
        continue;
      }

      rows.push({
        player,
        gpm,
        team: getPlayerTeamName(player),
        name: getPlayerDisplayName(player),
      });
    }

    return rows
      .sort((a, b) => b.gpm - a.gpm)
      .slice(0, 10);
  }

  function updateTeamGoldPerMinuteBadge() {
    const badge = ensureTeamGoldPerMinuteBadge();
    if (!teamGoldPerMinuteEnabled) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      teamGoldPerMinuteAnimationFrame = null;
      return;
    }

    const context = getOpenFrontGameContext();
    if (!context?.game) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      teamGoldPerMinuteAnimationFrame = requestAnimationFrame(
        updateTeamGoldPerMinuteBadge,
      );
      return;
    }

    sampleGoldPerMinuteIfDue();
    const rows = getTeamGoldPerMinuteRows(context.game);
    const rowsContainer = badge.querySelector(".openfront-helper-team-gpm-rows");
    if (rowsContainer) {
      if (rows.length < 2) {
        rowsContainer.innerHTML = `<span class="openfront-helper-team-gpm-empty">Only shown in team games</span>`;
      } else {
        rowsContainer.replaceChildren(
          ...rows.map((entry) => {
            const row = document.createElement("span");
            row.className = "openfront-helper-team-gpm-row";
            row.style.setProperty(
              "--team-accent-color",
              getTeamColor(entry.team, context.game),
            );
            const name = document.createElement("span");
            name.className = "openfront-helper-team-gpm-name";
            name.textContent = entry.team;
            const value = document.createElement("span");
            value.className = "openfront-helper-team-gpm-value";
            value.textContent =
              entry.trackedPlayers > 0 ? formatGoldPerMinute(entry.total) : "tracking";
            row.append(name, value);
            return row;
          }),
        );
      }
    }

    positionHelperStatsContainer();
    badge.dataset.visible = "true";
    syncHelperStatsContainerVisibility();
    teamGoldPerMinuteAnimationFrame = requestAnimationFrame(
      updateTeamGoldPerMinuteBadge,
    );
  }

  function updateTopGoldPerMinuteBadge() {
    const badge = ensureTopGoldPerMinuteBadge();
    if (!topGoldPerMinuteEnabled) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      topGoldPerMinuteAnimationFrame = null;
      return;
    }

    const context = getOpenFrontGameContext();
    if (!context?.game) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      topGoldPerMinuteAnimationFrame = requestAnimationFrame(
        updateTopGoldPerMinuteBadge,
      );
      return;
    }

    sampleGoldPerMinuteIfDue();
    const rows = getTopGoldPerMinuteRows(context.game);
    const rowsContainer = badge.querySelector(".openfront-helper-top-gpm-rows");
    if (rowsContainer) {
      if (rows.length === 0) {
        rowsContainer.innerHTML = `<span class="openfront-helper-top-gpm-empty">Tracking player income</span>`;
      } else {
        rowsContainer.replaceChildren(
          ...rows.map((entry, index) => {
            const row = document.createElement("span");
            row.className = "openfront-helper-top-gpm-row";
            if (entry.team) {
              row.style.setProperty(
                "--team-accent-color",
                getTeamColor(entry.team, context.game),
              );
            } else {
              row.style.removeProperty("--team-accent-color");
            }

            const rank = document.createElement("span");
            rank.className = "openfront-helper-top-gpm-rank";
            rank.textContent = String(index + 1);
            const name = document.createElement("span");
            name.className = "openfront-helper-top-gpm-name";
            name.textContent = entry.name;
            const value = document.createElement("span");
            value.className = "openfront-helper-top-gpm-value";
            value.textContent = formatGoldPerMinute(entry.gpm);
            row.append(rank, name, value);
            return row;
          }),
        );
      }
    }

    badge.dataset.visible = "true";
    positionTopGoldPerMinuteBadge();
    topGoldPerMinuteAnimationFrame = requestAnimationFrame(
      updateTopGoldPerMinuteBadge,
    );
  }

  function getHoveredPlayerInfoOverlay() {
    const overlay = document.querySelector("player-info-overlay");
    if (!overlay?.player) {
      return null;
    }

    const visible = overlay._isInfoVisible ?? overlay.isInfoVisible;
    if (visible === false) {
      return null;
    }

    return overlay;
  }

  function getPlayerInfoPanelRect(overlay) {
    const panel =
      overlay.querySelector('[class*="bg-gray-800"]') ??
      overlay.querySelector('[class*="backdrop-blur"]') ??
      overlay;
    const rect = panel.getBoundingClientRect?.();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      return rect;
    }

    return null;
  }

  function updateGoldPerMinuteBadge() {
    const badge = ensureGoldPerMinuteBadge();
    if (!goldPerMinuteEnabled) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      goldPerMinuteAnimationFrame = null;
      return;
    }

    const overlay = getHoveredPlayerInfoOverlay();
    if (!overlay) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      goldPerMinuteAnimationFrame = requestAnimationFrame(
        updateGoldPerMinuteBadge,
      );
      return;
    }

    const players = Array.from(overlay.game?.playerViews?.() || []);
    const hoveredIndex = players.indexOf(overlay.player);
    const gpm = getGoldPerMinuteForPlayer(
      overlay.player,
      hoveredIndex >= 0 ? hoveredIndex : 0,
    );
    const team = getPlayerTeamName(overlay.player);
    if (team) {
      badge.style.setProperty("--team-accent-color", getTeamColor(team, overlay.game));
      badge.style.setProperty("--team-border-color", getTeamColor(team, overlay.game));
      badge.style.setProperty("--team-bg-color", getTeamColorBackground(team, overlay.game));
    } else {
      badge.style.removeProperty("--team-accent-color");
      badge.style.removeProperty("--team-border-color");
      badge.style.removeProperty("--team-bg-color");
    }
    const value = badge.querySelector(".openfront-helper-gpm-value");
    if (value) {
      value.textContent = formatGoldPerMinute(gpm);
    }
    positionHelperStatsContainer();
    badge.dataset.visible = "true";
    syncHelperStatsContainerVisibility();
    goldPerMinuteAnimationFrame = requestAnimationFrame(
      updateGoldPerMinuteBadge,
    );
  }

  function escapeCssIdentifier(value) {
    if (globalThis.CSS?.escape) {
      return CSS.escape(value);
    }

    return value.replace(/["\\]/g, "\\$&");
  }

  function isAlliedPlayer(player, otherPlayer) {
    try {
      return player !== otherPlayer && Boolean(player?.isAlliedWith?.(otherPlayer));
    } catch (_error) {
      return false;
    }
  }

  function getAllianceView(player, otherPlayer) {
    try {
      return Array.from(player?.alliances?.() || []).find(
        (alliance) => alliance?.other === otherPlayer?.id?.(),
      );
    } catch (_error) {
      return null;
    }
  }

  function formatAllianceDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  function getAllianceTimingText(game, alliance) {
    const currentTick = Number(game?.ticks?.());
    const expiresAt = Number(alliance?.expiresAt);
    if (
      !Number.isFinite(currentTick) ||
      !Number.isFinite(expiresAt)
    ) {
      return {
        remaining: "unknown left",
      };
    }

    return {
      remaining: `${formatAllianceDuration((expiresAt - currentTick) / 10)} left`,
    };
  }

  function syncAllyMarkers() {
    if (!allyMarkersEnabled) {
      document.getElementById(ALLY_MARKER_CONTAINER_ID)?.remove();
      allyMarkerAnimationFrame = null;
      return;
    }

    const container = ensureAllyMarkerContainer();
    const lineSvg = ensureAllyLineSvg(container);
    const overlay = getHoveredPlayerInfoOverlay();
    const transform = overlay?.transform;
    if (!overlay?.game || !transform) {
      container.replaceChildren();
      allyMarkerAnimationFrame = requestAnimationFrame(syncAllyMarkers);
      return;
    }

    const hoveredNameLocation = overlay.player?.nameLocation?.();
    if (!hoveredNameLocation) {
      lineSvg.replaceChildren();
      container.replaceChildren(lineSvg);
      allyMarkerAnimationFrame = requestAnimationFrame(syncAllyMarkers);
      return;
    }

    const hoveredScreenPos =
      transform.worldToScreenCoordinates(hoveredNameLocation);
    if (
      !Number.isFinite(hoveredScreenPos?.x) ||
      !Number.isFinite(hoveredScreenPos?.y)
    ) {
      lineSvg.replaceChildren();
      container.replaceChildren(lineSvg);
      allyMarkerAnimationFrame = requestAnimationFrame(syncAllyMarkers);
      return;
    }

    const activeIds = new Set();
    const players = Array.from(overlay.game.playerViews?.() || []);

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      if (!player?.isAlive?.() || !isAlliedPlayer(overlay.player, player)) {
        continue;
      }

      const nameLocation = player.nameLocation?.();
      if (!nameLocation) {
        continue;
      }

      const screenPos = transform.worldToScreenCoordinates(nameLocation);
      if (
        !Number.isFinite(screenPos?.x) ||
        !Number.isFinite(screenPos?.y) ||
        screenPos.x < -30 ||
        screenPos.y < -30 ||
        screenPos.x > window.innerWidth + 30 ||
        screenPos.y > window.innerHeight + 30
      ) {
        continue;
      }

      const markerId = getPlayerMarkerId(player, index);
      activeIds.add(markerId);

      let line = lineSvg.querySelector(
        `.openfront-helper-ally-line[data-ally-id="${escapeCssIdentifier(markerId)}"]`,
      );
      if (!line) {
        line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.classList.add("openfront-helper-ally-line");
        line.dataset.allyId = markerId;
        lineSvg.appendChild(line);
      }
      line.setAttribute("x1", String(hoveredScreenPos.x));
      line.setAttribute("y1", String(hoveredScreenPos.y));
      line.setAttribute("x2", String(screenPos.x));
      line.setAttribute("y2", String(screenPos.y));

      let marker = container.querySelector(
        `.openfront-helper-ally-dot[data-ally-id="${escapeCssIdentifier(markerId)}"]`,
      );
      if (!marker) {
        marker = document.createElement("div");
        marker.className = "openfront-helper-ally-dot";
        marker.dataset.allyId = markerId;
        marker.innerHTML = `
          <span class="openfront-helper-ally-time">
            <span class="openfront-helper-ally-label">Alliance</span>
            <span class="openfront-helper-ally-remaining"></span>
          </span>
        `;
        container.appendChild(marker);
      }

      const alliance = getAllianceView(overlay.player, player);
      const timing = getAllianceTimingText(overlay.game, alliance);
      const remaining = marker.querySelector(".openfront-helper-ally-remaining");
      if (remaining) {
        remaining.textContent = timing.remaining;
      }

      marker.style.setProperty("--ally-x", `${screenPos.x}px`);
      marker.style.setProperty("--ally-y", `${screenPos.y}px`);
    }

    for (const marker of container.querySelectorAll(".openfront-helper-ally-dot")) {
      if (!activeIds.has(marker.dataset.allyId || "")) {
        marker.remove();
      }
    }
    for (const line of lineSvg.querySelectorAll(".openfront-helper-ally-line")) {
      if (!activeIds.has(line.dataset.allyId || "")) {
        line.remove();
      }
    }

    allyMarkerAnimationFrame = requestAnimationFrame(syncAllyMarkers);
  }

  function getPlayerSmallId(player, fallbackIndex = 0) {
    try {
      return Number(player?.smallID?.() ?? player?.data?.smallID ?? fallbackIndex);
    } catch (_error) {
      return Number(fallbackIndex);
    }
  }

  function getPlayerDisplayName(player) {
    try {
      return String(
        player?.displayName?.() ??
          player?.name?.() ??
          player?.data?.displayName ??
          player?.data?.name ??
          "Unknown",
      );
    } catch (_error) {
      return "Unknown";
    }
  }

  function normalizeTradeName(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function findPlayerByTradeName(players, name) {
    const normalizedName = normalizeTradeName(name);
    if (!normalizedName) {
      return null;
    }

    return (
      players.find((player) => normalizeTradeName(getPlayerDisplayName(player)) === normalizedName) ??
      players.find((player) => normalizeTradeName(player?.name?.()) === normalizedName) ??
      null
    );
  }

  function getTradeBalanceTracker(playerId) {
    const key = String(playerId);
    let tracker = tradeBalanceTrackers.get(key);
    if (!tracker) {
      tracker = new Map();
      tradeBalanceTrackers.set(key, tracker);
    }
    return tracker;
  }

  function addExportPartnerProfitSource(exporterId, partnerId, unit, goldAmount) {
    if (
      !Number.isFinite(exporterId) ||
      !Number.isFinite(Number(partnerId)) ||
      !unit ||
      !Number.isFinite(goldAmount) ||
      goldAmount <= 0
    ) {
      return;
    }

    const exporterKey = String(exporterId);
    let sourceTracker = exportPartnerSourceTrackers.get(exporterKey);
    if (!sourceTracker) {
      sourceTracker = new Map();
      exportPartnerSourceTrackers.set(exporterKey, sourceTracker);
    }

    const tile = unit.tile?.();
    const sourceKey = `${partnerId}:${unit.id?.() ?? tile}`;
    const entry = sourceTracker.get(sourceKey) ?? {
      partnerId: Number(partnerId),
      tile,
      type: String(unit?.type?.() ?? "Industry"),
      total: 0,
    };
    entry.tile = tile ?? entry.tile;
    entry.type = String(unit?.type?.() ?? entry.type);
    entry.total += goldAmount;
    sourceTracker.set(sourceKey, entry);
  }

  function addTradeBalance(receiverId, partnerId, partnerName, goldAmount, direction = "unknown", sourceUnit = null) {
    if (!Number.isFinite(receiverId) || !Number.isFinite(goldAmount) || goldAmount <= 0) {
      return;
    }

    const tracker = getTradeBalanceTracker(receiverId);
    const key = String(partnerId || partnerName || "unknown");
    const entry = tracker.get(key) ?? {
      partnerId,
      partnerName: partnerName || "Unknown",
      total: 0,
      imports: 0,
      exports: 0,
      unknown: 0,
      firstExportAt: null,
      lastExportAt: null,
    };
    entry.partnerId = partnerId ?? entry.partnerId;
    entry.partnerName = partnerName || entry.partnerName;
    entry.total += goldAmount;
    if (direction === "import") {
      entry.imports += goldAmount;
    } else if (direction === "export") {
      const now = Date.now();
      entry.firstExportAt ??= now;
      entry.lastExportAt = now;
      entry.exports += goldAmount;
      addExportPartnerProfitSource(receiverId, partnerId, sourceUnit, goldAmount);
    } else {
      entry.unknown += goldAmount;
    }
    tracker.set(key, entry);
  }

  function getTradeEventGoldAmount(value) {
    if (typeof value === "bigint") {
      return Number(value);
    }
    return Number(value);
  }

  function getTradeDirection(receiverId, partnerId, boatRoutes) {
    const route = getTradeRoute(receiverId, partnerId, boatRoutes);
    if (!route) {
      return "unknown";
    }
    return route.sourceId === receiverId ? "export" : "import";
  }

  function collectCompletedBoatTradeRoutes(game, updates) {
    const routes = [];
    for (const updateGroup of Object.values(updates || {})) {
      if (!Array.isArray(updateGroup)) {
        continue;
      }

      for (const event of updateGroup) {
        if (
          event?.unitType !== "Trade Ship" ||
          event?.isActive !== false ||
          event?.targetUnitId === undefined
        ) {
          continue;
        }

        const targetUnit = game?.unit?.(event.targetUnitId);
        const destinationOwner = targetUnit?.owner?.();
        const destinationId = destinationOwner ? getPlayerSmallId(destinationOwner) : NaN;
        const sourceId = Number(event.ownerID);
        if (!Number.isFinite(sourceId) || !Number.isFinite(destinationId) || sourceId === destinationId) {
          continue;
        }

        routes.push({
          sourceId,
          destinationId,
          destinationUnit: targetUnit,
        });
      }
    }
    return routes;
  }

  function getTradeRoute(receiverId, partnerId, boatRoutes) {
    return boatRoutes.find(
      (entry) =>
        (entry.sourceId === receiverId && entry.destinationId === partnerId) ||
        (entry.destinationId === receiverId && entry.sourceId === partnerId),
    );
  }

  function takeTradeRoute(receiverId, partnerId, boatRoutes) {
    const routeIndex = boatRoutes.findIndex(
      (entry) =>
        (entry.sourceId === receiverId && entry.destinationId === partnerId) ||
        (entry.destinationId === receiverId && entry.sourceId === partnerId),
    );
    if (routeIndex < 0) {
      return null;
    }
    return boatRoutes.splice(routeIndex, 1)[0];
  }

  function isTradeStationUnit(unit) {
    try {
      const type = unit?.type?.();
      return (type === "City" || type === "Port") && unit?.hasTrainStation?.();
    } catch (_error) {
      return false;
    }
  }

  function findTrainStationAtTile(game, tile) {
    if (tile == null) {
      return null;
    }

    const exact = Array.from(game?.units?.("City", "Port") || []).find(
      (unit) => isTradeStationUnit(unit) && unit.tile?.() === tile,
    );
    if (exact) {
      return exact;
    }

    const nearby = game?.nearbyUnits?.(tile, 2, ["City", "Port"]);
    return nearby?.find((entry) => isTradeStationUnit(entry?.unit))?.unit ?? null;
  }

  function getTrainRelation(trainOwner, stationOwner) {
    if (trainOwner === stationOwner || getPlayerSmallId(trainOwner) === getPlayerSmallId(stationOwner)) {
      return "self";
    }
    if (trainOwner?.isOnSameTeam?.(stationOwner)) {
      return "team";
    }
    if (trainOwner?.isAlliedWith?.(stationOwner)) {
      return "ally";
    }
    return "other";
  }

  function canPlayersTrade(player, otherPlayer) {
    try {
      return (
        getPlayerSmallId(player) !== getPlayerSmallId(otherPlayer) &&
        !player?.hasEmbargo?.(otherPlayer)
      );
    } catch (_error) {
      return false;
    }
  }

  function processTrainTradeStops(game) {
    const activeEngineIds = new Set();
    const engines = Array.from(game?.units?.("Train") || []).filter(
      (unit) => unit?.trainType?.() === "Engine" && unit?.isActive?.(),
    );

    for (const engine of engines) {
      const engineId = engine.id?.();
      if (!Number.isFinite(engineId)) {
        continue;
      }
      activeEngineIds.add(engineId);

      const station = findTrainStationAtTile(game, engine.tile?.());
      let tracker = trainTradeTrackers.get(engineId);
      if (!tracker) {
        tracker = {
          lastStationKey: station ? String(station.id?.() ?? station.tile?.()) : null,
          stopsVisited: 0,
        };
        trainTradeTrackers.set(engineId, tracker);
        continue;
      }

      if (!station) {
        tracker.lastStationKey = null;
        continue;
      }

      const stationKey = String(station.id?.() ?? station.tile?.());
      if (tracker.lastStationKey === stationKey) {
        continue;
      }
      tracker.lastStationKey = stationKey;

      const trainOwner = engine.owner?.();
      const stationOwner = station.owner?.();
      if (!trainOwner || !stationOwner || !canPlayersTrade(trainOwner, stationOwner)) {
        continue;
      }

      const relation = getTrainRelation(trainOwner, stationOwner);
      const goldAmount = Number(game?.config?.().trainGold?.(relation, tracker.stopsVisited));
      tracker.stopsVisited += 1;
      if (!Number.isFinite(goldAmount) || goldAmount <= 0) {
        continue;
      }

      const trainOwnerId = getPlayerSmallId(trainOwner);
      const stationOwnerId = getPlayerSmallId(stationOwner);
      addTradeBalance(
        trainOwnerId,
        stationOwnerId,
        getPlayerDisplayName(stationOwner),
        goldAmount,
        "export",
        station,
      );
      addTradeBalance(
        stationOwnerId,
        trainOwnerId,
        getPlayerDisplayName(trainOwner),
        goldAmount,
        "import",
      );
    }

    for (const engineId of trainTradeTrackers.keys()) {
      if (!activeEngineIds.has(engineId)) {
        trainTradeTrackers.delete(engineId);
      }
    }
  }
  function processTradeBalanceUpdates(game) {
    const currentTick = Number(game?.ticks?.());
    if (!Number.isFinite(currentTick) || currentTick === lastProcessedTradeBalanceTick) {
      return;
    }
    lastProcessedTradeBalanceTick = currentTick;

    processTrainTradeStops(game);

    const updates = game?.updatesSinceLastTick?.();
    if (!updates) {
      return;
    }

    const players = Array.from(game.playerViews?.() || []);
    const boatRoutes = collectCompletedBoatTradeRoutes(game, updates);
    for (const updateGroup of Object.values(updates)) {
      if (!Array.isArray(updateGroup)) {
        continue;
      }

      for (const event of updateGroup) {
        if (event?.message !== "events_display.received_gold_from_trade") {
          continue;
        }

        const receiverId = Number(event.playerID);
        const goldAmount = getTradeEventGoldAmount(event.goldAmount);
        const partnerName = String(event.params?.name ?? "Unknown");
        const partner = findPlayerByTradeName(players, partnerName);
        const partnerId = partner ? getPlayerSmallId(partner) : `name:${partnerName}`;
        const numericPartnerId = Number(partnerId);
        const matchedRoute = getTradeRoute(receiverId, numericPartnerId, boatRoutes);
        const direction = matchedRoute
          ? matchedRoute.sourceId === receiverId
            ? "export"
            : "import"
          : "unknown";
        const route =
          direction === "export"
            ? takeTradeRoute(receiverId, numericPartnerId, boatRoutes)
            : matchedRoute;
        const sourceUnit = direction === "export" ? route?.destinationUnit : null;
        addTradeBalance(receiverId, partnerId, partnerName, goldAmount, direction, sourceUnit);
      }
    }
  }

  function formatTradeBalanceAmount(value) {
    if (!Number.isFinite(value)) {
      return "+0";
    }

    const absValue = Math.abs(value);
    const sign = value >= 0 ? "+" : "-";
    if (absValue >= 1_000_000_000) {
      return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
    }
    if (absValue >= 1_000_000) {
      return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
    }
    if (absValue >= 1_000) {
      return `${sign}${(absValue / 1_000).toFixed(1)}K`;
    }
    return `${sign}${Math.round(absValue)}`;
  }

  function formatTradeSpendAmount(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return "0";
    }

    return formatTradeBalanceAmount(value).replace(/^\+/, "");
  }

  function formatTradeRoi(exports, spend) {
    if (
      !Number.isFinite(exports) ||
      !Number.isFinite(spend) ||
      spend <= 0
    ) {
      return "n/a";
    }

    const ratio = exports / spend;
    return `${(ratio * 100).toFixed(ratio >= 1 ? 0 : 1)}%`;
  }

  function formatBreakEvenDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
      return "tracking";
    }

    const totalSeconds = Math.ceil(ms / 1000);
    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    }

    const totalMinutes = Math.ceil(totalSeconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  function formatBreakEvenEstimate(exports, spend, exportWindowMs) {
    if (!Number.isFinite(spend) || spend <= 0) {
      return "n/a";
    }
    if (exports >= spend) {
      return "now";
    }
    if (
      !Number.isFinite(exports) ||
      exports <= 0 ||
      !Number.isFinite(exportWindowMs) ||
      exportWindowMs <= 0
    ) {
      return "tracking";
    }

    const exportPerMs = exports / exportWindowMs;
    return formatBreakEvenDuration((spend - exports) / exportPerMs);
  }

  function getTradeRoiStatus(exports, spend) {
    if (
      !Number.isFinite(exports) ||
      !Number.isFinite(spend) ||
      spend <= 0
    ) {
      return "unknown";
    }

    return exports >= spend ? "profitable" : "unprofitable";
  }

  function getFactoryPortSpendForLevels(startLevelCount, levelsToAdd) {
    let total = 0;
    const safeStart = Math.max(0, Math.floor(Number(startLevelCount) || 0));
    const safeLevels = Math.max(0, Math.floor(Number(levelsToAdd) || 0));
    for (let offset = 0; offset < safeLevels; offset += 1) {
      const index = safeStart + offset;
      total += Math.min(1_000_000, Math.pow(2, index) * 125_000);
    }
    return total;
  }

  function addFactoryPortSpend(playerId, levels) {
    if (!Number.isFinite(playerId) || !Number.isFinite(levels) || levels <= 0) {
      return;
    }

    const key = String(playerId);
    const tracker = factoryPortSpendTrackers.get(key) ?? {
      levels: 0,
      total: 0,
    };
    tracker.total += getFactoryPortSpendForLevels(tracker.levels, levels);
    tracker.levels += levels;
    factoryPortSpendTrackers.set(key, tracker);
  }

  function processFactoryPortSpendUpdates(game) {
    const activeUnitKeys = new Set();
    for (const unit of game?.units?.("Factory", "Port") || []) {
      const unitId = unit?.id?.();
      const owner = unit?.owner?.();
      const ownerId = owner ? getPlayerSmallId(owner) : NaN;
      const level = getUnitLevel(unit);
      if (!Number.isFinite(unitId) || !Number.isFinite(ownerId) || level <= 0) {
        continue;
      }

      const key = String(unitId);
      activeUnitKeys.add(key);
      const tracked = factoryPortUnitTrackers.get(key);
      if (!tracked) {
        factoryPortUnitTrackers.set(key, {
          ownerId,
          level,
        });
        addFactoryPortSpend(ownerId, level);
        continue;
      }

      if (tracked.ownerId === ownerId && level > tracked.level) {
        addFactoryPortSpend(ownerId, level - tracked.level);
      }
      tracked.ownerId = ownerId;
      tracked.level = level;
    }

    for (const key of factoryPortUnitTrackers.keys()) {
      if (!activeUnitKeys.has(key)) {
        factoryPortUnitTrackers.delete(key);
      }
    }
  }

  function getFactoryPortSpendTotal(player) {
    const playerId = getPlayerSmallId(player);
    return factoryPortSpendTrackers.get(String(playerId))?.total ?? 0;
  }

  function getTradeBalanceTotals(player) {
    const playerId = getPlayerSmallId(player);
    const tracker = tradeBalanceTrackers.get(String(playerId));
    const totals = {
      imports: 0,
      exports: 0,
      firstExportAt: null,
      lastExportAt: null,
    };
    if (!tracker) {
      return totals;
    }

    for (const entry of tracker.values()) {
      totals.imports += entry.imports || 0;
      totals.exports += entry.exports || 0;
      if (Number.isFinite(entry.firstExportAt)) {
        totals.firstExportAt =
          totals.firstExportAt === null
            ? entry.firstExportAt
            : Math.min(totals.firstExportAt, entry.firstExportAt);
      }
      if (Number.isFinite(entry.lastExportAt)) {
        totals.lastExportAt =
          totals.lastExportAt === null
            ? entry.lastExportAt
            : Math.max(totals.lastExportAt, entry.lastExportAt);
      }
    }
    return totals;
  }
  function getTradeBalanceDirection(entry) {
    if ((entry.exports || 0) > (entry.imports || 0)) {
      return "Player exports more to them";
    }
    if ((entry.imports || 0) > (entry.exports || 0)) {
      return "Player imports more from them";
    }
    return "Imports and exports are balanced";
  }
  function getTradeBalanceEntries(player) {
    const playerId = getPlayerSmallId(player);
    const tracker = tradeBalanceTrackers.get(String(playerId));
    if (!tracker) {
      return [];
    }

    return Array.from(tracker.values())
      .filter((entry) => Number.isFinite(entry.total) && entry.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  function findTradePartnerPlayer(players, entry) {
    const numericPartnerId = Number(entry?.partnerId);
    if (Number.isFinite(numericPartnerId)) {
      const match = players.find((player) => getPlayerSmallId(player) === numericPartnerId);
      if (match) {
        return match;
      }
    }

    return findPlayerByTradeName(players, entry?.partnerName);
  }

  function getExportPartnerEntries(player) {
    const playerId = getPlayerSmallId(player);
    const tracker = tradeBalanceTrackers.get(String(playerId));
    if (!tracker) {
      return [];
    }

    return Array.from(tracker.values())
      .filter((entry) => Number.isFinite(entry.exports) && entry.exports > 0)
      .sort((a, b) => b.exports - a.exports);
  }

  function collectExportPartnerHeatmapSources(game, player) {
    const sources = [];
    const playerId = getPlayerSmallId(player);
    const sourceTracker = exportPartnerSourceTrackers.get(String(playerId));
    if (!sourceTracker) {
      return sources;
    }

    const players = Array.from(game?.playerViews?.() || []);
    const alivePartnerIds = new Set(
      players
        .filter((entry) => entry?.isAlive?.())
        .map((entry) => getPlayerSmallId(entry)),
    );
    const sourceEntries = Array.from(sourceTracker.values()).filter(
      (entry) =>
        entry.tile != null &&
        Number.isFinite(entry.total) &&
        entry.total > 0 &&
        alivePartnerIds.has(Number(entry.partnerId)),
    );
    const maxSourceTotal = Math.max(1, ...sourceEntries.map((entry) => entry.total || 0));

    for (const entry of sourceEntries) {
      const type = String(entry.type ?? "Industry");
      if (type !== "City" && type !== "Port") {
        continue;
      }

      const sourceWeight = Math.max(0.2, (entry.total || 0) / maxSourceTotal);
      const typeBonus = type === "City" ? 1.25 : 1;
      addEconomicSource(
        sources,
        entry.tile,
        (8 + (type === "City" ? 6 : 8)) * sourceWeight * typeBonus,
        type,
      );
    }

    return sources;
  }

  function updateTradeBalanceBadge() {
    const badge = ensureTradeBalanceBadge();
    if (!tradeBalancesEnabled) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      tradeBalanceAnimationFrame = null;
      return;
    }

    const context = getOpenFrontGameContext();
    if (context?.game) {
      processFactoryPortSpendUpdates(context.game);
      processTradeBalanceUpdates(context.game);
    }

    const overlay = getHoveredPlayerInfoOverlay();
    if (!overlay?.game) {
      badge.dataset.visible = "false";
      syncHelperStatsContainerVisibility();
      tradeBalanceAnimationFrame = requestAnimationFrame(updateTradeBalanceBadge);
      return;
    }

    const totals = getTradeBalanceTotals(overlay.player);
    const imports = badge.querySelector(".openfront-helper-trade-imports");
    const exports = badge.querySelector(".openfront-helper-trade-exports");
    const factoryPortSpend = badge.querySelector(
      ".openfront-helper-trade-factory-port-spend",
    );
    const roi = badge.querySelector(".openfront-helper-trade-roi");
    const breakEven = badge.querySelector(".openfront-helper-trade-break-even");
    const factoryPortSpendTotal = getFactoryPortSpendTotal(overlay.player);
    const exportWindowMs = Number.isFinite(totals.firstExportAt)
      ? Date.now() - totals.firstExportAt
      : NaN;
    if (imports) {
      imports.textContent = formatTradeBalanceAmount(totals.imports);
    }
    if (exports) {
      exports.textContent = formatTradeBalanceAmount(totals.exports);
    }
    if (factoryPortSpend) {
      factoryPortSpend.textContent = formatTradeSpendAmount(factoryPortSpendTotal);
    }
    if (roi) {
      roi.textContent = formatTradeRoi(totals.exports, factoryPortSpendTotal);
      roi.dataset.status = getTradeRoiStatus(totals.exports, factoryPortSpendTotal);
    }
    if (breakEven) {
      breakEven.textContent = formatBreakEvenEstimate(
        totals.exports,
        factoryPortSpendTotal,
        exportWindowMs,
      );
    }

    const rows = badge.querySelector(".openfront-helper-trade-rows");
    if (rows) {
      const entries = getTradeBalanceEntries(overlay.player);
      if (entries.length === 0) {
        rows.innerHTML = `<span class="openfront-helper-trade-empty">No observed trade yet</span>`;
      } else {
        rows.replaceChildren(
          ...entries.map((entry) => {
            const row = document.createElement("span");
            row.className = "openfront-helper-trade-row";
            const name = document.createElement("span");
            name.className = "openfront-helper-trade-name";
            name.textContent = entry.partnerName;
            const valueWrap = document.createElement("span");
            valueWrap.className = "openfront-helper-trade-value-wrap";
            const value = document.createElement("span");
            value.className = "openfront-helper-trade-value";
            value.textContent = formatTradeBalanceAmount(entry.total);
            const direction = document.createElement("span");
            direction.className = "openfront-helper-trade-direction";
            direction.textContent = getTradeBalanceDirection(entry);
            valueWrap.append(value, direction);
            row.append(name, valueWrap);
            return row;
          }),
        );
      }
    }

    positionHelperStatsContainer();
    badge.dataset.visible = "true";
    syncHelperStatsContainerVisibility();
    tradeBalanceAnimationFrame = requestAnimationFrame(updateTradeBalanceBadge);
  }

  function formatTroopAmount(value) {
    const troopCount = Math.max(0, toFiniteNumber(value) / 10);
    const absValue = Math.abs(troopCount);
    if (absValue >= 10_000_000) {
      return `${(Math.floor(absValue / 100000) / 10).toFixed(1)}M`;
    }
    if (absValue >= 1_000_000) {
      return `${(Math.floor(absValue / 10000) / 100).toFixed(2)}M`;
    }
    if (absValue >= 100_000) {
      return `${Math.floor(absValue / 1000)}K`;
    }
    if (absValue >= 10_000) {
      return `${(Math.floor(absValue / 100) / 10).toFixed(1)}K`;
    }
    if (absValue >= 1_000) {
      return `${(Math.floor(absValue / 10) / 100).toFixed(2)}K`;
    }
    return String(Math.floor(absValue));
  }

  function getPlayerOutgoingAttacks(player) {
    try {
      return Array.from(player?.outgoingAttacks?.() || []).filter(
        (attack) => attack && !attack.retreating,
      );
    } catch (_error) {
      return [];
    }
  }

  function getPlayerIncomingAttacks(player) {
    try {
      return Array.from(player?.incomingAttacks?.() || []).filter(
        (attack) => attack && !attack.retreating,
      );
    } catch (_error) {
      return [];
    }
  }

  function getPlayerBySmallId(players, smallId) {
    const numericSmallId = Number(smallId);
    if (!Number.isFinite(numericSmallId)) {
      return null;
    }

    return players.find((player, index) => {
      try {
        return getPlayerSmallId(player, index) === numericSmallId;
      } catch (_error) {
        return false;
      }
    }) || null;
  }

  function isAttackAmountTargetPlayer(player) {
    if (!player?.isPlayer?.()) {
      return false;
    }

    try {
      const playerType = player?.type?.() ?? player?.data?.playerType;
      return playerType === "HUMAN" || playerType === "NATION";
    } catch (_error) {
      return false;
    }
  }

  function collectAttackAmountRecords(players) {
    const records = new Map();

    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      const player = players[playerIndex];
      if (!player?.isAlive?.()) {
        continue;
      }

      for (const attack of getPlayerOutgoingAttacks(player)) {
        const attackId = String(attack?.id ?? "");
        if (!attackId || records.has(attackId)) {
          continue;
        }
        const target = getPlayerBySmallId(players, attack.targetID);
        if (!isAttackAmountTargetPlayer(target)) {
          continue;
        }
        records.set(attackId, {
          attack,
          attacker: player,
          target,
        });
      }

      for (const attack of getPlayerIncomingAttacks(player)) {
        const attackId = String(attack?.id ?? "");
        if (!attackId || records.has(attackId)) {
          continue;
        }
        if (!isAttackAmountTargetPlayer(player)) {
          continue;
        }
        records.set(attackId, {
          attack,
          attacker: getPlayerBySmallId(players, attack.attackerID),
          target: player,
        });
      }
    }

    return records;
  }

  function requestAttackAmountBorderTiles(player) {
    if (!player?.isPlayer?.()) {
      return;
    }

    const playerId = getPlayerSmallId(player);
    if (!Number.isFinite(playerId) || attackAmountBorderTileRequests.has(playerId)) {
      return;
    }
    if (typeof player?.borderTiles !== "function") {
      return;
    }

    attackAmountBorderTileRequests.add(playerId);
    let borderRequest;
    try {
      borderRequest = Promise.resolve(player.borderTiles());
    } catch (_error) {
      attackAmountBorderTileRequests.delete(playerId);
      return;
    }

    borderRequest
      .then((result) => {
        attackAmountBorderTiles.set(playerId, {
          tiles: Array.from(result?.borderTiles || []),
          updatedAt: performance.now(),
        });
      })
      .catch(() => {})
      .finally(() => {
        attackAmountBorderTileRequests.delete(playerId);
      });
  }

  function refreshAttackAmountBorderTiles(records) {
    const activePlayerIds = new Set();
    for (const record of records.values()) {
      for (const player of [record.attacker, record.target]) {
        if (!player?.isPlayer?.()) {
          continue;
        }
        const playerId = getPlayerSmallId(player);
        if (!Number.isFinite(playerId)) {
          continue;
        }
        activePlayerIds.add(playerId);
        requestAttackAmountBorderTiles(player);
      }
    }

    for (const playerId of attackAmountBorderTiles.keys()) {
      if (!activePlayerIds.has(playerId)) {
        attackAmountBorderTiles.delete(playerId);
      }
    }
  }

  function refreshAttackAmountPositions(players, records) {
    const activeAttackIds = new Set(records.keys());
    if (activeAttackIds.size === 0) {
      attackAmountPositions.clear();
      attackAmountBorderTiles.clear();
      return;
    }

    if (attackAmountPositionRequestInFlight) {
      return;
    }

    const version = ++attackAmountPositionVersion;

    for (const [attackId, entry] of attackAmountPositions.entries()) {
      if (!activeAttackIds.has(attackId) || entry.version < version - 2) {
        attackAmountPositions.delete(attackId);
      }
    }

    attackAmountPositionRequestInFlight = true;
    let pendingRequests = 0;

    function finishRequest() {
      pendingRequests -= 1;
      if (pendingRequests <= 0) {
        attackAmountPositionRequestInFlight = false;
      }
    }

    for (const player of players) {
      if (!player?.isAlive?.() || typeof player.attackClusteredPositions !== "function") {
        continue;
      }

      const hasRelevantAttack = [
        ...getPlayerOutgoingAttacks(player),
        ...getPlayerIncomingAttacks(player),
      ].some((attack) => activeAttackIds.has(String(attack?.id ?? "")));
      if (!hasRelevantAttack) {
        continue;
      }

      pendingRequests += 1;
      let positionRequest;
      try {
        positionRequest = Promise.resolve(player.attackClusteredPositions());
      } catch (_error) {
        finishRequest();
        continue;
      }

      positionRequest
        .then((clusters) => {
          for (const cluster of Array.from(clusters || [])) {
            const attackId = String(cluster?.id ?? "");
            if (!activeAttackIds.has(attackId)) {
              continue;
            }
            attackAmountPositions.set(attackId, {
              positions: Array.from(cluster?.positions || []),
              version,
            });
          }
        })
        .catch(() => {})
        .finally(finishRequest);
    }

    if (pendingRequests === 0) {
      attackAmountPositionRequestInFlight = false;
    }
  }

  function getBorderTilesForPlayer(player) {
    const playerId = getPlayerSmallId(player);
    return Array.from(attackAmountBorderTiles.get(playerId)?.tiles || []);
  }

  function getTilePoint(game, tile) {
    try {
      return {
        x: game.x(tile),
        y: game.y(tile),
      };
    } catch (_error) {
      return null;
    }
  }

  function getAttackBorderFallbackPosition(game, record) {
    const attackerId = getPlayerSmallId(record.attacker);
    const targetId = getPlayerSmallId(record.target);
    if (!Number.isFinite(attackerId) || !Number.isFinite(targetId)) {
      return null;
    }

    const attackerLocation = record.attacker?.nameLocation?.();
    const targetLocation = record.target?.nameLocation?.();
    const reference =
      attackerLocation &&
      targetLocation &&
      Number.isFinite(attackerLocation.x) &&
      Number.isFinite(attackerLocation.y) &&
      Number.isFinite(targetLocation.x) &&
      Number.isFinite(targetLocation.y)
        ? {
            x: (attackerLocation.x + targetLocation.x) / 2,
            y: (attackerLocation.y + targetLocation.y) / 2,
          }
        : null;

    let bestPoint = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    function considerBorderTiles(neighborOwnerId, tiles) {
      for (const tile of tiles) {
        let neighbors = [];
        try {
          neighbors = Array.from(game.neighbors?.(tile) || []);
        } catch (_error) {
          neighbors = [];
        }

        for (const neighbor of neighbors) {
          let ownerId = NaN;
          try {
            ownerId = Number(game.ownerID?.(neighbor));
          } catch (_error) {
            ownerId = NaN;
          }
          if (ownerId !== neighborOwnerId) {
            continue;
          }

          const tilePoint = getTilePoint(game, tile);
          const neighborPoint = getTilePoint(game, neighbor);
          if (!tilePoint || !neighborPoint) {
            continue;
          }

          const point = {
            x: (tilePoint.x + neighborPoint.x) / 2,
            y: (tilePoint.y + neighborPoint.y) / 2,
          };
          const distance = reference
            ? Math.hypot(point.x - reference.x, point.y - reference.y)
            : 0;
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPoint = point;
          }
        }
      }
    }

    considerBorderTiles(targetId, getBorderTilesForPlayer(record.attacker));
    if (!bestPoint) {
      considerBorderTiles(attackerId, getBorderTilesForPlayer(record.target));
    }

    return bestPoint;
  }

  function getAttackMarkerPositions(game, attackId, record) {
    const cached = attackAmountPositions.get(attackId);
    const positions = Array.from(cached?.positions || []);
    if (positions.length > 0) {
      return positions;
    }

    const borderPosition = getAttackBorderFallbackPosition(game, record);
    return borderPosition ? [borderPosition] : [];
  }

  function isAttackTargetingMyPlayer(game, record) {
    try {
      const myPlayer = game?.myPlayer?.();
      if (!myPlayer?.isPlayer?.()) {
        return false;
      }
      return getPlayerSmallId(record.target) === getPlayerSmallId(myPlayer);
    } catch (_error) {
      return false;
    }
  }

  function isNationPlayer(player) {
    try {
      const playerType = player?.type?.() ?? player?.data?.playerType;
      return playerType === "NATION";
    } catch (_error) {
      return false;
    }
  }

  function isAttackFromMyPlayerToNation(game, record) {
    try {
      const myPlayer = game?.myPlayer?.();
      if (!myPlayer?.isPlayer?.()) {
        return false;
      }
      return (
        getPlayerSmallId(record.attacker) === getPlayerSmallId(myPlayer) &&
        isNationPlayer(record.target)
      );
    } catch (_error) {
      return false;
    }
  }

  function getAttackAmountColor(game, record) {
    if (isAttackTargetingMyPlayer(game, record)) {
      return "#ef4444";
    }
    if (isAttackFromMyPlayerToNation(game, record)) {
      return "#22c55e";
    }

    const team = getPlayerTeamName(record.attacker);
    return team ? getTeamColor(team, game) : "#facc15";
  }

  function syncAttackAmountMarkers() {
    if (!attackAmountsEnabled) {
      document.getElementById(ATTACK_AMOUNT_CONTAINER_ID)?.remove();
      attackAmountAnimationFrame = null;
      return;
    }

    const container = ensureAttackAmountContainer();
    const context = getOpenFrontGameContext();
    if (!context?.game || !context?.transform) {
      container.replaceChildren();
      attackAmountAnimationFrame = requestAnimationFrame(syncAttackAmountMarkers);
      return;
    }

    const players = Array.from(context.game.playerViews?.() || []);
    const records = collectAttackAmountRecords(players);
    const now = performance.now();
    if (now >= nextAttackAmountPositionRefreshAt) {
      nextAttackAmountPositionRefreshAt = now + 300;
      refreshAttackAmountPositions(players, records);
      refreshAttackAmountBorderTiles(records);
    }

    const activeIds = new Set();
    for (const [attackId, record] of records.entries()) {
      const attackColor = getAttackAmountColor(context.game, record);
      const positions = getAttackMarkerPositions(context.game, attackId, record);

      for (let positionIndex = 0; positionIndex < positions.length; positionIndex++) {
        const position = positions[positionIndex];
        let screenPos = null;
        try {
          screenPos = context.transform.worldToScreenCoordinates(position);
        } catch (_error) {
          screenPos = null;
        }

        if (
          !Number.isFinite(screenPos?.x) ||
          !Number.isFinite(screenPos?.y) ||
          screenPos.x < -40 ||
          screenPos.y < -40 ||
          screenPos.x > window.innerWidth + 40 ||
          screenPos.y > window.innerHeight + 40
        ) {
          continue;
        }

        const markerId = `${attackId}:${positionIndex}`;
        activeIds.add(markerId);
        let marker = container.querySelector(
          `.openfront-helper-attack-amount[data-attack-id="${escapeCssIdentifier(markerId)}"]`,
        );
        if (!marker) {
          marker = document.createElement("div");
          marker.className = "openfront-helper-attack-amount";
          marker.dataset.attackId = markerId;
          container.appendChild(marker);
        }

        marker.textContent = formatTroopAmount(record.attack.troops);
        marker.style.setProperty("--attack-x", `${screenPos.x}px`);
        marker.style.setProperty("--attack-y", `${screenPos.y}px`);
        marker.style.setProperty("--attack-color", attackColor);
      }
    }

    for (const marker of container.querySelectorAll(".openfront-helper-attack-amount")) {
      if (!activeIds.has(marker.dataset.attackId || "")) {
        marker.remove();
      }
    }

    attackAmountAnimationFrame = requestAnimationFrame(syncAttackAmountMarkers);
  }

  function syncBotMarkers() {
    if (!botMarkersEnabled) {
      document.getElementById(BOT_MARKER_CONTAINER_ID)?.remove();
      botMarkerAnimationFrame = null;
      return;
    }

    const context = getOpenFrontGameContext();
    const container = ensureBotMarkerContainer();
    if (!context) {
      container.replaceChildren();
      botMarkerAnimationFrame = requestAnimationFrame(syncBotMarkers);
      return;
    }

    const activeIds = new Set();
    const players = Array.from(context.game.playerViews?.() || []);

    for (let index = 0; index < players.length; index++) {
      const player = players[index];
      if (!isNationBotPlayer(player) || !player?.isAlive?.()) {
        continue;
      }

      const nameLocation = player.nameLocation?.();
      if (!nameLocation) {
        continue;
      }

      const screenPos = context.transform.worldToScreenCoordinates(nameLocation);
      if (
        !Number.isFinite(screenPos?.x) ||
        !Number.isFinite(screenPos?.y) ||
        screenPos.x < -30 ||
        screenPos.y < -30 ||
        screenPos.x > window.innerWidth + 30 ||
        screenPos.y > window.innerHeight + 30
      ) {
        continue;
      }

      const markerId = getPlayerMarkerId(player, index);
      activeIds.add(markerId);

      let marker = container.querySelector(
        `.openfront-helper-bot-dot[data-bot-id="${escapeCssIdentifier(markerId)}"]`,
      );
      if (!marker) {
        marker = document.createElement("div");
        marker.className = "openfront-helper-bot-dot";
        marker.dataset.botId = markerId;
        container.appendChild(marker);
      }

      marker.style.setProperty("--bot-x", `${screenPos.x}px`);
      marker.style.setProperty("--bot-y", `${screenPos.y}px`);
    }

    for (const marker of container.querySelectorAll(".openfront-helper-bot-dot")) {
      if (!activeIds.has(marker.dataset.botId || "")) {
        marker.remove();
      }
    }

    botMarkerAnimationFrame = requestAnimationFrame(syncBotMarkers);
  }

  function setBotMarkersEnabled(enabled) {
    botMarkersEnabled = Boolean(enabled);
    if (!botMarkersEnabled) {
      if (botMarkerAnimationFrame !== null) {
        cancelAnimationFrame(botMarkerAnimationFrame);
      }
      botMarkerAnimationFrame = null;
      document.getElementById(BOT_MARKER_CONTAINER_ID)?.remove();
      return;
    }

    if (botMarkerAnimationFrame === null) {
      syncBotMarkers();
    }
  }

  function setAllyMarkersEnabled(enabled) {
    allyMarkersEnabled = Boolean(enabled);
    if (!allyMarkersEnabled) {
      if (allyMarkerAnimationFrame !== null) {
        cancelAnimationFrame(allyMarkerAnimationFrame);
      }
      allyMarkerAnimationFrame = null;
      document.getElementById(ALLY_MARKER_CONTAINER_ID)?.remove();
      return;
    }

    if (allyMarkerAnimationFrame === null) {
      syncAllyMarkers();
    }
  }

  function setTradeBalancesEnabled(enabled) {
    tradeBalancesEnabled = Boolean(enabled);
    if (!tradeBalancesEnabled) {
      if (tradeBalanceAnimationFrame !== null) {
        cancelAnimationFrame(tradeBalanceAnimationFrame);
      }
      tradeBalanceAnimationFrame = null;
      lastProcessedTradeBalanceTick = null;
      if (!exportPartnerHeatmapEnabled) {
        tradeBalanceTrackers.clear();
        exportPartnerSourceTrackers.clear();
        factoryPortSpendTrackers.clear();
        factoryPortUnitTrackers.clear();
        trainTradeTrackers.clear();
      }
      const badge = document.getElementById(TRADE_BALANCE_BADGE_ID);
      if (badge) {
        badge.dataset.visible = "false";
      }
      syncHelperStatsContainerVisibility();
      return;
    }

    if (tradeBalanceAnimationFrame === null) {
      updateTradeBalanceBadge();
    }
  }

  function setGoldPerMinuteEnabled(enabled) {
    goldPerMinuteEnabled = Boolean(enabled);
    if (!goldPerMinuteEnabled) {
      if (goldPerMinuteInterval !== null) {
        clearInterval(goldPerMinuteInterval);
      }
      if (goldPerMinuteAnimationFrame !== null) {
        cancelAnimationFrame(goldPerMinuteAnimationFrame);
      }
      goldPerMinuteInterval = null;
      goldPerMinuteAnimationFrame = null;
      if (!teamGoldPerMinuteEnabled && !topGoldPerMinuteEnabled && !economyHeatmapEnabled) {
        goldTrackers.clear();
        incomingGoldTransfers.clear();
        lastProcessedIncomingGoldTransferTick = null;
      }
      const badge = document.getElementById(GOLD_PER_MINUTE_BADGE_ID);
      if (badge) {
        badge.dataset.visible = "false";
      }
      syncHelperStatsContainerVisibility();
      return;
    }

    sampleGoldPerMinute();
    if (goldPerMinuteInterval === null) {
      goldPerMinuteInterval = setInterval(
        sampleGoldPerMinute,
        GOLD_PER_MINUTE_SAMPLE_MS,
      );
    }
    if (goldPerMinuteAnimationFrame === null) {
      updateGoldPerMinuteBadge();
    }
  }

  function setTeamGoldPerMinuteEnabled(enabled) {
    teamGoldPerMinuteEnabled = Boolean(enabled);
    if (!teamGoldPerMinuteEnabled) {
      if (teamGoldPerMinuteAnimationFrame !== null) {
        cancelAnimationFrame(teamGoldPerMinuteAnimationFrame);
      }
      teamGoldPerMinuteAnimationFrame = null;
      const badge = document.getElementById(TEAM_GOLD_PER_MINUTE_BADGE_ID);
      if (badge) {
        badge.dataset.visible = "false";
      }
      if (!goldPerMinuteEnabled && !topGoldPerMinuteEnabled && !economyHeatmapEnabled) {
        goldTrackers.clear();
        incomingGoldTransfers.clear();
        lastProcessedIncomingGoldTransferTick = null;
      }
      syncHelperStatsContainerVisibility();
      return;
    }

    sampleGoldPerMinute();
    if (teamGoldPerMinuteAnimationFrame === null) {
      updateTeamGoldPerMinuteBadge();
    }
  }

  function setTopGoldPerMinuteEnabled(enabled) {
    topGoldPerMinuteEnabled = Boolean(enabled);
    if (!topGoldPerMinuteEnabled) {
      if (topGoldPerMinuteAnimationFrame !== null) {
        cancelAnimationFrame(topGoldPerMinuteAnimationFrame);
      }
      topGoldPerMinuteAnimationFrame = null;
      const badge = document.getElementById(TOP_GOLD_PER_MINUTE_BADGE_ID);
      if (badge) {
        badge.dataset.visible = "false";
      }
      if (!goldPerMinuteEnabled && !teamGoldPerMinuteEnabled && !economyHeatmapEnabled) {
        goldTrackers.clear();
        incomingGoldTransfers.clear();
        lastProcessedIncomingGoldTransferTick = null;
      }
      syncHelperStatsContainerVisibility();
      return;
    }

    sampleGoldPerMinute();
    if (topGoldPerMinuteAnimationFrame === null) {
      updateTopGoldPerMinuteBadge();
    }
  }

  function setFpsSaverEnabled(enabled) {
    fpsSaverEnabled = Boolean(enabled);
    installFpsSaverPatch();
    if (fpsSaverEnabled) {
      removeTrackedNukeFx();
    }
  }

  function setAttackAmountsEnabled(enabled) {
    attackAmountsEnabled = Boolean(enabled);
    if (!attackAmountsEnabled) {
      if (attackAmountAnimationFrame !== null) {
        cancelAnimationFrame(attackAmountAnimationFrame);
      }
      attackAmountAnimationFrame = null;
      nextAttackAmountPositionRefreshAt = 0;
      attackAmountPositionVersion = 0;
      attackAmountPositionRequestInFlight = false;
      attackAmountPositions.clear();
      document.getElementById(ATTACK_AMOUNT_CONTAINER_ID)?.remove();
      return;
    }

    if (attackAmountAnimationFrame === null) {
      syncAttackAmountMarkers();
    }
  }

  function setEconomyHeatmapEnabled(enabled) {
    economyHeatmapEnabled = Boolean(enabled);
    if (!economyHeatmapEnabled) {
      if (economyHeatmapAnimationFrame !== null) {
        cancelAnimationFrame(economyHeatmapAnimationFrame);
      }
      economyHeatmapAnimationFrame = null;
      lastEconomyHeatmapDrawAt = 0;
      lastEconomyHeatmapDataAt = 0;
      economyHeatmapDataGame = null;
      economyHeatmapSources = [];
      if (!goldPerMinuteEnabled && !teamGoldPerMinuteEnabled && !topGoldPerMinuteEnabled) {
        goldTrackers.clear();
        incomingGoldTransfers.clear();
        lastProcessedIncomingGoldTransferTick = null;
      }
      document.getElementById(ECONOMY_HEATMAP_CONTAINER_ID)?.remove();
      return;
    }

    setExportPartnerHeatmapEnabled(false);
    if (economyHeatmapAnimationFrame === null) {
      drawEconomyHeatmap();
    }
  }

  function setExportPartnerHeatmapEnabled(enabled) {
    exportPartnerHeatmapEnabled = Boolean(enabled);
    if (!exportPartnerHeatmapEnabled) {
      if (exportPartnerHeatmapAnimationFrame !== null) {
        cancelAnimationFrame(exportPartnerHeatmapAnimationFrame);
      }
      exportPartnerHeatmapAnimationFrame = null;
      lastExportPartnerHeatmapDrawAt = 0;
      document.getElementById(EXPORT_PARTNER_HEATMAP_CONTAINER_ID)?.remove();
      if (!tradeBalancesEnabled) {
        tradeBalanceTrackers.clear();
        exportPartnerSourceTrackers.clear();
        factoryPortSpendTrackers.clear();
        factoryPortUnitTrackers.clear();
        trainTradeTrackers.clear();
      }
      return;
    }

    setEconomyHeatmapEnabled(false);
    if (exportPartnerHeatmapAnimationFrame === null) {
      drawExportPartnerHeatmap();
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== EXTENSION_SOURCE) {
      return;
    }

    if (data.type === "JOIN_PUBLIC_LOBBY" && data.payload?.gameID) {
      document.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: data.payload.gameID,
            source: "public",
            publicLobbyInfo: data.payload.publicLobbyInfo,
          },
          bubbles: true,
          composed: true,
        }),
      );
    }

    if (data.type === "MARK_BOT_NATIONS_RED") {
      setBotMarkersEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_GOLD_PER_MINUTE") {
      setGoldPerMinuteEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_TEAM_GOLD_PER_MINUTE") {
      setTeamGoldPerMinuteEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_TOP_GOLD_PER_MINUTE") {
      setTopGoldPerMinuteEnabled(data.payload?.enabled);
    }

    if (data.type === "MARK_HOVERED_ALLIES_GREEN") {
      setAllyMarkersEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_TRADE_BALANCES") {
      setTradeBalancesEnabled(data.payload?.enabled);
    }

    if (data.type === "SET_FPS_SAVER") {
      setFpsSaverEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_ATTACK_AMOUNTS") {
      setAttackAmountsEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_ECONOMY_HEATMAP") {
      setEconomyHeatmapEnabled(data.payload?.enabled);
    }

    if (data.type === "SHOW_EXPORT_PARTNER_HEATMAP") {
      setExportPartnerHeatmapEnabled(data.payload?.enabled);
    }
  });

  window.__openfrontAutoJoinBridgeReady = true;
})();
