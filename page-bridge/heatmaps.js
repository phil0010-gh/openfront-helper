// Economic and export-partner heatmap rendering.

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

    const pixelRatio = 1;
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

  function resetExportPartnerHeatmapSourceCache() {
    exportPartnerHeatmapSourceCacheGame = null;
    exportPartnerHeatmapSourceCachePlayerId = null;
    exportPartnerHeatmapSourceCacheAt = 0;
    exportPartnerHeatmapSourceCache = [];
  }

  function getExportPartnerHeatmapSources(game, player) {
    const now = performance.now();
    const playerId = getPlayerSmallId(player);

    if (
      exportPartnerHeatmapSourceCacheGame !== game ||
      exportPartnerHeatmapSourceCachePlayerId !== playerId ||
      now - exportPartnerHeatmapSourceCacheAt >= EXPORT_PARTNER_HEATMAP_SOURCE_CACHE_MS
    ) {
      exportPartnerHeatmapSourceCache = collectExportPartnerHeatmapSources(game, player);
      exportPartnerHeatmapSourceCacheGame = game;
      exportPartnerHeatmapSourceCachePlayerId = playerId;
      exportPartnerHeatmapSourceCacheAt = now;
    }

    return exportPartnerHeatmapSourceCache;
  }

  function toFiniteNumber(value, fallback = 0) {
    const numberValue = typeof value === "bigint" ? Number(value) : Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
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

  function getRevenueUnitKey(unit) {
    const unitId = toFiniteNumber(unit?.id?.(), NaN);
    if (Number.isFinite(unitId)) {
      return `unit:${unitId}`;
    }

    const tile = unit?.tile?.();
    const type = String(unit?.type?.() ?? "Industry");
    return tile == null ? null : `tile:${type}:${tile}`;
  }

  function isEconomyRevenueType(type) {
    return type === "City" || type === "Port" || type === "Factory";
  }

  function addEconomyRevenueSource(unit, goldAmount) {
    const amount = toFiniteNumber(goldAmount);
    if (!unit || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const type = String(unit?.type?.() ?? "Industry");
    if (!isEconomyRevenueType(type)) {
      return;
    }

    const tile = unit?.tile?.();
    if (tile == null) {
      return;
    }

    const key = getRevenueUnitKey(unit);
    if (!key) {
      return;
    }

    const unitId = toFiniteNumber(unit?.id?.(), NaN);
    const owner = unit?.owner?.();
    const entry = economyRevenueSourceTrackers.get(key) ?? {
      unitId: Number.isFinite(unitId) ? unitId : null,
      ownerId: owner ? getPlayerSmallId(owner) : null,
      tile,
      type,
      total: 0,
      events: [],
    };
    entry.unitId = Number.isFinite(unitId) ? unitId : entry.unitId;
    entry.ownerId = owner ? getPlayerSmallId(owner) : entry.ownerId;
    entry.tile = tile;
    entry.type = type;
    entry.events.push({
      amount,
      at: Date.now(),
    });
    entry.total += amount;
    economyRevenueSourceTrackers.set(key, entry);
  }

  function getActiveRevenueUnit(game, entry) {
    const unitId = Number(entry?.unitId);
    if (Number.isFinite(unitId)) {
      try {
        const unit = game?.unit?.(unitId);
        if (
          unit?.isActive?.() &&
          String(unit?.type?.() ?? "") === String(entry.type ?? "")
        ) {
          return unit;
        }
      } catch (_error) {
        // Fall back to a tile lookup below.
      }
    }

    try {
      return (
        Array.from(game?.units?.(entry.type) || []).find(
          (unit) => unit?.isActive?.() && unit?.tile?.() === entry.tile,
        ) ?? null
      );
    } catch (_error) {
      return null;
    }
  }

  function pruneEconomyRevenueSources(game) {
    const cutoff = Date.now() - ECONOMY_HEATMAP_REVENUE_WINDOW_MS;
    for (const [key, entry] of economyRevenueSourceTrackers.entries()) {
      const unit = getActiveRevenueUnit(game, entry);
      if (!unit) {
        economyRevenueSourceTrackers.delete(key);
        continue;
      }

      entry.tile = unit.tile?.() ?? entry.tile;
      entry.type = String(unit?.type?.() ?? entry.type);
      entry.events = entry.events.filter(
        (event) =>
          Number.isFinite(event?.amount) &&
          event.amount > 0 &&
          Number.isFinite(event?.at) &&
          event.at >= cutoff,
      );
      entry.total = entry.events.reduce((total, event) => total + event.amount, 0);

      if (entry.total <= 0) {
        economyRevenueSourceTrackers.delete(key);
      }
    }
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
    pruneEconomyRevenueSources(game);

    for (const entry of economyRevenueSourceTrackers.values()) {
      if (
        entry.tile == null ||
        !Number.isFinite(entry.total) ||
        entry.total <= 0 ||
        !isEconomyRevenueType(String(entry.type ?? ""))
      ) {
        continue;
      }

      addEconomicSource(sources, entry.tile, entry.total, entry.type);
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

  function normalizeEconomyHeatmapIntensity(value) {
    const intensity = Number(value);
    if (!Number.isFinite(intensity)) {
      return 1;
    }
    return Math.max(0, Math.min(2, Math.round(intensity)));
  }

  function getEconomyHeatmapIntensitySettings() {
    return [
      { alpha: 0.7, radius: 0.88 },
      { alpha: 1, radius: 1 },
      { alpha: 1.35, radius: 1.18 },
    ][normalizeEconomyHeatmapIntensity(economyHeatmapIntensity)];
  }

  function drawEconomyHeatmapPoint(ctx, point, maxWeight, pixelRatio) {
    const baseIntensity = Math.max(0.28, Math.min(1, point.weight / maxWeight));
    const intensitySettings = getEconomyHeatmapIntensitySettings();
    const intensity = Math.max(
      0.14,
      Math.min(1, baseIntensity * intensitySettings.alpha),
    );
    const radiusIntensity = Math.max(
      0.22,
      Math.min(1, baseIntensity * intensitySettings.radius),
    );
    const x = point.x * pixelRatio;
    const y = point.y * pixelRatio;
    const typeScale =
      point.type === "Factory" ? 1.25 : point.type === "Port" ? 1.05 : 0.9;
    const zoomRadiusScale =
      point.zoomScale < 1
        ? Math.min(1.35, Math.max(0.68, point.zoomScale * 1.8))
        : point.zoomScale;
    const radius =
      (18 + radiusIntensity * 52) * typeScale * zoomRadiusScale * pixelRatio;
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
    processTradeBalanceUpdates(context.game);
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
      canvas.parentElement?.setAttribute("data-status", "Economic heatmap: waiting for observed trade revenue");
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
    const zoomRadiusScale =
      point.zoomScale < 1
        ? Math.min(1.15, Math.max(0.58, point.zoomScale * 1.55))
        : point.zoomScale;
    const radius =
      (20 + intensity * 64) * typeScale * zoomRadiusScale * pixelRatio;
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
    if (now - lastExportPartnerHeatmapDrawAt < EXPORT_PARTNER_HEATMAP_DRAW_MS) {
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
    const sources = getExportPartnerHeatmapSources(overlay.game, overlay.player);
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

  function setEconomyHeatmapIntensity(value) {
    economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(value);
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
      economyRevenueSourceTrackers.clear();
      if (!tradeBalancesEnabled && !exportPartnerHeatmapEnabled) {
        trainTradeTrackers.clear();
        tradeShipSourceTrackers.clear();
        lastProcessedTradeBalanceTick = null;
      }
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
      resetExportPartnerHeatmapSourceCache();
      document.getElementById(EXPORT_PARTNER_HEATMAP_CONTAINER_ID)?.remove();
      if (!tradeBalancesEnabled && !economyHeatmapEnabled) {
        tradeBalanceTrackers.clear();
        exportPartnerSourceTrackers.clear();
        factoryPortSpendTrackers.clear();
        factoryPortUnitTrackers.clear();
        trainTradeTrackers.clear();
        tradeShipSourceTrackers.clear();
      }
      return;
    }

    setEconomyHeatmapEnabled(false);
    if (exportPartnerHeatmapAnimationFrame === null) {
      drawExportPartnerHeatmap();
    }
  }

