// Separate alliance request and renewal prompts from the main events display.

  const ALLIANCE_REQUEST_MESSAGE_TYPE = 15;
  const RENEW_ALLIANCE_MESSAGE_TYPE = 24;

  function ensureAllianceRequestPanelStyles() {
    if (document.getElementById(ALLIANCE_REQUEST_PANEL_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = ALLIANCE_REQUEST_PANEL_STYLE_ID;
    style.textContent = `
      #${ALLIANCE_REQUEST_PANEL_ID} {
        position: fixed;
        right: max(14px, env(safe-area-inset-right, 0px));
        top: 50%;
        z-index: 2147483647;
        display: none;
        width: min(360px, calc(100vw - 28px));
        max-height: min(44vh, 420px);
        overflow: hidden;
        border: 1px solid rgba(134, 239, 172, 0.36);
        border-radius: 10px;
        background:
          linear-gradient(135deg, rgba(34, 197, 94, 0.18), transparent 42%),
          rgba(7, 24, 22, 0.94);
        color: #f3f4f6;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        box-shadow:
          0 18px 42px rgba(0, 0, 0, 0.46),
          inset 0 1px 0 rgba(187, 247, 208, 0.1);
        pointer-events: auto;
        transform: translateY(-50%);
      }

      #${ALLIANCE_REQUEST_PANEL_ID}[data-visible="true"] {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(134, 239, 172, 0.16);
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-title {
        margin: 0;
        color: #bbf7d0;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-count {
        display: grid;
        place-items: center;
        min-width: 22px;
        height: 22px;
        padding: 0 7px;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.22);
        color: #dcfce7;
        font-size: 11px;
        font-weight: 900;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-list {
        display: grid;
        gap: 8px;
        min-height: 0;
        overflow: auto;
        padding: 10px;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-card {
        display: grid;
        gap: 8px;
        padding: 9px;
        border: 1px solid rgba(151, 181, 214, 0.18);
        border-radius: 9px;
        background: rgba(8, 31, 28, 0.82);
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-card[data-sender-type="nation"] {
        border-color: rgba(248, 113, 113, 0.34);
        background:
          linear-gradient(135deg, rgba(127, 29, 29, 0.2), transparent 54%),
          rgba(31, 24, 24, 0.84);
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-meta {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        min-width: 0;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-sender-type {
        display: inline-flex;
        align-items: center;
        min-height: 18px;
        padding: 3px 6px;
        border: 1px solid rgba(248, 113, 113, 0.42);
        border-radius: 6px;
        background: rgba(69, 10, 10, 0.48);
        color: #fecaca;
        font-size: 9px;
        font-weight: 900;
        line-height: 1;
        text-transform: uppercase;
        white-space: nowrap;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-time {
        display: inline-flex;
        align-items: center;
        min-height: 18px;
        padding: 3px 6px;
        border: 1px solid rgba(125, 211, 252, 0.3);
        border-radius: 6px;
        background: rgba(14, 116, 144, 0.2);
        color: #bae6fd;
        font-size: 9px;
        font-weight: 900;
        line-height: 1;
        text-transform: uppercase;
        white-space: nowrap;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-time[data-urgency="soon"] {
        border-color: rgba(251, 191, 36, 0.42);
        background: rgba(146, 64, 14, 0.28);
        color: #fde68a;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-time[data-urgency="critical"] {
        border-color: rgba(248, 113, 113, 0.48);
        background: rgba(127, 29, 29, 0.36);
        color: #fecaca;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-description {
        flex: 1 1 220px;
        min-width: 0;
        border: 0;
        background: transparent;
        color: #f3f4f6;
        padding: 0;
        font: inherit;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.25;
        text-align: left;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} button.openfront-helper-alliance-request-description {
        cursor: pointer;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-actions button {
        border: 0;
        border-radius: 6px;
        color: #ffffff;
        padding: 6px 10px;
        font: inherit;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
        transition:
          transform 120ms ease,
          filter 120ms ease;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-actions button:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-actions .btn {
        background: #16a34a;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-actions .btn-info {
        background: #3b82f6;
      }

      #${ALLIANCE_REQUEST_PANEL_ID} .openfront-helper-alliance-request-actions .btn-gray {
        background: #6b7280;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAllianceRequestPanel() {
    ensureAllianceRequestPanelStyles();

    let panel = document.getElementById(ALLIANCE_REQUEST_PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = ALLIANCE_REQUEST_PANEL_ID;
      panel.innerHTML = `
        <div class="openfront-helper-alliance-request-header">
          <p class="openfront-helper-alliance-request-title">Alliance requests</p>
          <span class="openfront-helper-alliance-request-count">0</span>
        </div>
        <div class="openfront-helper-alliance-request-list"></div>
      `;
      (document.body || document.documentElement).appendChild(panel);
    }
    return panel;
  }

  function ensureAllianceFocusFlashStyles() {
    if (document.getElementById(ALLIANCE_FOCUS_FLASH_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = ALLIANCE_FOCUS_FLASH_STYLE_ID;
    style.textContent = `
      #${ALLIANCE_FOCUS_FLASH_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
      }

      #${ALLIANCE_FOCUS_FLASH_CONTAINER_ID} .${ALLIANCE_FOCUS_FLASH_CANVAS_CLASS} {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAllianceFocusFlashCanvas() {
    ensureAllianceFocusFlashStyles();

    let container = document.getElementById(ALLIANCE_FOCUS_FLASH_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = ALLIANCE_FOCUS_FLASH_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }

    let canvas = container.querySelector(`.${ALLIANCE_FOCUS_FLASH_CANVAS_CLASS}`);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = ALLIANCE_FOCUS_FLASH_CANVAS_CLASS;
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

  function isAllianceRequestPanelEvent(event) {
    return (
      Number(event?.type) === ALLIANCE_REQUEST_MESSAGE_TYPE ||
      Number(event?.type) === RENEW_ALLIANCE_MESSAGE_TYPE
    );
  }

  function getEventsDisplayElement() {
    return document.querySelector("events-display");
  }

  function getAllianceFocusFlashContext(eventsDisplay) {
    const bridgeContext =
      typeof getOpenFrontGameContext === "function"
        ? getOpenFrontGameContext()
        : null;
    const game = bridgeContext?.game ?? eventsDisplay?.game ?? null;
    const transform = bridgeContext?.transform ?? null;
    if (!game || !transform?.worldToScreenCoordinates) {
      return null;
    }
    return { game, transform };
  }

  function findAllianceFocusPlayer(eventsDisplay, playerSmallId) {
    const { game } = getAllianceFocusFlashContext(eventsDisplay) ?? {};
    if (!game) {
      return null;
    }

    try {
      const player = game.playerBySmallID?.(Number(playerSmallId));
      return player?.isPlayer?.() ? player : null;
    } catch (_error) {
      return null;
    }
  }

  function getAllianceFocusTileOwnerId(game, tile) {
    try {
      const ownerId = Number(game.ownerID?.(tile));
      if (Number.isFinite(ownerId)) {
        return ownerId;
      }
    } catch (_error) {
      // Fall back to owner().smallID() below.
    }

    try {
      return Number(game.owner?.(tile)?.smallID?.());
    } catch (_error) {
      return NaN;
    }
  }

  function createAllianceFocusFlashMask(context, playerSmallId) {
    const { game } = context;
    const targetSmallId = Number(playerSmallId);
    if (!Number.isFinite(targetSmallId)) {
      return null;
    }

    const width = Math.floor(Number(game.width?.()));
    const height = Math.floor(Number(game.height?.()));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    const primaryMask = document.createElement("canvas");
    const secondaryMask = document.createElement("canvas");
    primaryMask.width = width;
    primaryMask.height = height;
    secondaryMask.width = width;
    secondaryMask.height = height;
    const primaryMaskContext = primaryMask.getContext("2d", { alpha: true });
    const secondaryMaskContext = secondaryMask.getContext("2d", { alpha: true });
    if (!primaryMaskContext || !secondaryMaskContext) {
      return null;
    }

    const primaryImageData = primaryMaskContext.createImageData(width, height);
    const secondaryImageData = secondaryMaskContext.createImageData(width, height);
    let hasTerritory = false;

    const paintTile = (tile) => {
      if (getAllianceFocusTileOwnerId(game, tile) !== targetSmallId) {
        return;
      }
      let x;
      let y;
      try {
        x = Number(game.x?.(tile));
        y = Number(game.y?.(tile));
      } catch (_error) {
        return;
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }
      const offset = (y * width + x) * 4;
      const patternBand = Math.floor((x + y) / 3) % 2;
      const imageData = patternBand === 0 ? primaryImageData : secondaryImageData;
      imageData.data[offset] = patternBand === 0 ? 34 : 45;
      imageData.data[offset + 1] = patternBand === 0 ? 197 : 212;
      imageData.data[offset + 2] = patternBand === 0 ? 94 : 191;
      imageData.data[offset + 3] = 255;
      hasTerritory = true;
    };

    if (typeof game.forEachTile === "function") {
      game.forEachTile(paintTile);
    } else {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          let tile;
          try {
            tile = game.ref?.(x, y);
          } catch (_error) {
            continue;
          }
          paintTile(tile);
        }
      }
    }

    if (!hasTerritory) {
      return null;
    }

    primaryMaskContext.putImageData(primaryImageData, 0, 0);
    secondaryMaskContext.putImageData(secondaryImageData, 0, 0);
    return { primaryMask, secondaryMask, transform: context.transform };
  }

  function drawAllianceFocusFlashMask(ctx, maskData, pixelRatio, progress) {
    const { primaryMask, secondaryMask, transform } = maskData;
    const easedProgress = 1 - Math.pow(1 - progress, 2.4);
    const pulse = Math.sin(easedProgress * Math.PI);
    const shimmer = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
    const fade = Math.pow(1 - progress, 0.5);
    const alpha = (0.12 + pulse * 0.38) * fade;
    const primaryAlpha = alpha * (0.72 + shimmer * 0.45);
    const secondaryAlpha = alpha * (0.72 + (1 - shimmer) * 0.45);

    let origin;
    let xAxis;
    let yAxis;
    try {
      origin = transform.worldToScreenCoordinates({ x: 0, y: 0 });
      xAxis = transform.worldToScreenCoordinates({ x: 1, y: 0 });
      yAxis = transform.worldToScreenCoordinates({ x: 0, y: 1 });
    } catch (_error) {
      return;
    }

    const scaleX = Number(xAxis?.x) - Number(origin?.x);
    const scaleY = Number(yAxis?.y) - Number(origin?.y);
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) {
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.setTransform(
      scaleX * pixelRatio,
      0,
      0,
      scaleY * pixelRatio,
      Number(origin.x) * pixelRatio,
      Number(origin.y) * pixelRatio,
    );
    ctx.globalAlpha = primaryAlpha;
    ctx.drawImage(primaryMask, 0, 0);
    ctx.globalAlpha = secondaryAlpha;
    ctx.drawImage(secondaryMask, 0, 0);

    if (progress < 0.82) {
      ctx.globalAlpha = (0.12 + pulse * 0.18) * fade;
      ctx.filter = `brightness(${1.45 + pulse * 0.55})`;
      ctx.drawImage(primaryMask, 0, 0);
      ctx.drawImage(secondaryMask, 0, 0);
    }

    ctx.restore();
  }

  function collectAllianceFocusFlashPoints(context, playerSmallId) {
    const points = [];
    const { game, transform } = context;
    const targetSmallId = Number(playerSmallId);
    if (!Number.isFinite(targetSmallId)) {
      return points;
    }

    let topLeft;
    let bottomRight;
    try {
      [topLeft, bottomRight] = transform.screenBoundingRect?.() ?? [];
    } catch (_error) {
      topLeft = null;
      bottomRight = null;
    }

    if (!topLeft || !bottomRight) {
      return points;
    }

    const minX = Math.max(0, Math.floor(Math.min(topLeft.x, bottomRight.x)) - 2);
    const maxX = Math.min(
      Math.max(0, game.width?.() ?? 0) - 1,
      Math.ceil(Math.max(topLeft.x, bottomRight.x)) + 2,
    );
    const minY = Math.max(0, Math.floor(Math.min(topLeft.y, bottomRight.y)) - 2);
    const maxY = Math.min(
      Math.max(0, game.height?.() ?? 0) - 1,
      Math.ceil(Math.max(topLeft.y, bottomRight.y)) + 2,
    );

    if (maxX < minX || maxY < minY) {
      return points;
    }

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        let tile;
        try {
          tile = game.ref?.(x, y);
        } catch (_error) {
          continue;
        }
        if (getAllianceFocusTileOwnerId(game, tile) !== targetSmallId) {
          continue;
        }

        try {
          const screenPoint = transform.worldToScreenCoordinates({ x, y });
          if (Number.isFinite(screenPoint?.x) && Number.isFinite(screenPoint?.y)) {
            points.push({
              ...screenPoint,
              patternBand: Math.floor((x + y) / 3) % 2,
            });
          }
        } catch (_error) {
          // Ignore coordinates that cannot be projected during camera updates.
        }
      }
    }

    return points;
  }

  function drawAllianceFocusFlashPoints(ctx, points, pixelRatio, progress, transform) {
    const easedProgress = 1 - Math.pow(1 - progress, 2.4);
    const pulse = Math.sin(easedProgress * Math.PI);
    const shimmer = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
    const fade = Math.pow(1 - progress, 0.5);
    const alpha = (0.16 + pulse * 0.42) * fade;
    const tileSize = Math.max(1, Number(transform?.scale) || 1) * pixelRatio;
    const size = tileSize + pulse * Math.max(1.5, tileSize * 0.38);
    const halfSize = size / 2;

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(187, 247, 208, ${(0.2 + pulse * 0.3) * fade})`;
    ctx.lineWidth = Math.max(1, 1.2 * pixelRatio);

    for (const point of points) {
      const x = point.x * pixelRatio;
      const y = point.y * pixelRatio;
      const patternBand = point.patternBand;
      const bandShimmer = patternBand === 0 ? shimmer : 1 - shimmer;
      const patternedAlpha = alpha * (0.62 + bandShimmer * 0.42);
      ctx.fillStyle =
        patternBand === 0
          ? `rgba(34, 197, 94, ${patternedAlpha})`
          : `rgba(45, 212, 191, ${patternedAlpha})`;
      ctx.fillRect(x - halfSize, y - halfSize, size, size);
      if (progress < 0.82) {
        ctx.strokeRect(x - halfSize, y - halfSize, size, size);
      }
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function flashAllianceFocusTerritory(eventsDisplay, playerSmallId) {
    if (!findAllianceFocusPlayer(eventsDisplay, playerSmallId)) {
      return;
    }

    if (allianceFocusFlashAnimationFrame !== null) {
      cancelAnimationFrame(allianceFocusFlashAnimationFrame);
      allianceFocusFlashAnimationFrame = null;
    }

    const startedAt = performance.now();
    const durationMs = 4200;
    const initialContext = getAllianceFocusFlashContext(eventsDisplay);
    const maskData = initialContext
      ? createAllianceFocusFlashMask(initialContext, playerSmallId)
      : null;
    let points = null;
    let pointsComputedAt = 0;

    function drawFrame(now) {
      const context = getAllianceFocusFlashContext(eventsDisplay);
      const { canvas, pixelRatio } = ensureAllianceFocusFlashCanvas();
      const ctx = canvas.getContext("2d");
      if (!ctx || !context) {
        allianceFocusFlashAnimationFrame = null;
        canvas.remove();
        return;
      }

      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (maskData) {
        drawAllianceFocusFlashMask(ctx, maskData, pixelRatio, progress);
      } else {
        if (!points || now - pointsComputedAt > 160) {
          points = collectAllianceFocusFlashPoints(context, playerSmallId);
          pointsComputedAt = now;
        }
        drawAllianceFocusFlashPoints(
          ctx,
          points,
          pixelRatio,
          progress,
          context.transform,
        );
      }

      if (progress < 1) {
        allianceFocusFlashAnimationFrame = requestAnimationFrame(drawFrame);
        return;
      }

      allianceFocusFlashAnimationFrame = null;
      canvas.parentElement?.remove();
    }

    allianceFocusFlashAnimationFrame = requestAnimationFrame(drawFrame);
  }

  function flashAllianceFocusTerritoryAfterCameraMove(eventsDisplay, playerSmallId) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flashAllianceFocusTerritory(eventsDisplay, playerSmallId);
      });
    });
  }

  function getGameTick(eventsDisplay) {
    const ticks = Number(eventsDisplay?.game?.ticks?.());
    return Number.isFinite(ticks) ? ticks : 0;
  }

  function getAllianceRequestRemainingSeconds(eventsDisplay, event) {
    const currentTick = Number(eventsDisplay?.game?.ticks?.());
    const createdAt = Number(event?.createdAt);
    const duration = Number(event?.duration ?? 600);
    if (
      !Number.isFinite(currentTick) ||
      !Number.isFinite(createdAt) ||
      !Number.isFinite(duration)
    ) {
      return null;
    }
    return Math.max(0, Math.ceil((duration - (currentTick - createdAt)) / 10));
  }

  function formatAllianceRequestRemainingTime(seconds) {
    if (!Number.isFinite(seconds)) {
      return "Expires soon";
    }
    if (seconds <= 0) {
      return "Expired";
    }
    if (seconds < 60) {
      return `Expires in ${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `Expires in ${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function getAllianceRequestTimeUrgency(seconds) {
    if (!Number.isFinite(seconds)) {
      return "normal";
    }
    if (seconds < 30) {
      return "critical";
    }
    if (seconds <= 60) {
      return "soon";
    }
    return "normal";
  }

  function pruneAllianceRequestPanelEvents(eventsDisplay) {
    const currentTick = getGameTick(eventsDisplay);
    let changed = false;
    for (let index = allianceRequestsPanelEvents.length - 1; index >= 0; index -= 1) {
      const event = allianceRequestsPanelEvents[index];
      const duration = Number(event?.duration ?? 600);
      const expired =
        Number.isFinite(currentTick) &&
        Number.isFinite(Number(event?.createdAt)) &&
        currentTick - Number(event.createdAt) >= duration;
      const deleted = Boolean(event?.shouldDelete?.(eventsDisplay?.game));
      if (expired || deleted) {
        event?.onDelete?.();
        allianceRequestsPanelEvents.splice(index, 1);
        changed = true;
      }
    }
    return changed;
  }

  function captureAllianceRequestPanelEvents(eventsDisplay) {
    const events = Array.isArray(eventsDisplay?.events) ? eventsDisplay.events : [];
    let changed = false;

    for (const event of events) {
      if (
        isAllianceRequestPanelEvent(event) &&
        !capturedAllianceRequestEvents.has(event)
      ) {
        capturedAllianceRequestEvents.add(event);
        allianceRequestsPanelEvents.push(event);
        changed = true;
      }
    }

    const remainingEvents = events.filter((event) => !isAllianceRequestPanelEvent(event));
    if (remainingEvents.length !== events.length) {
      eventsDisplay.events = remainingEvents;
      eventsDisplay.requestUpdate?.();
      changed = true;
    }
    return changed;
  }

  function removeAllianceRequestPanelEvent(event) {
    const index = allianceRequestsPanelEvents.indexOf(event);
    if (index >= 0) {
      allianceRequestsPanelEvents.splice(index, 1);
    }
  }

  function getAllianceRequestPanelButtonClass(className) {
    if (String(className).includes("btn-info")) {
      return "btn-info";
    }
    if (String(className).includes("btn-gray")) {
      return "btn-gray";
    }
    return "btn";
  }

  function getAllianceRequestSenderInfo(eventsDisplay, event) {
    const focusId = Number(event?.focusID);
    if (!Number.isFinite(focusId)) {
      return {
        type: "unknown",
        label: "",
      };
    }

    try {
      const player = eventsDisplay?.game?.playerBySmallID?.(focusId);
      if (player?.isPlayer?.() && isNationBotPlayer(player)) {
        return {
          type: "nation",
          label: "Nation",
        };
      }
    } catch (_error) {
      // Keep the request visible even if the sender cannot be resolved.
    }

    return {
      type: "player",
      label: "",
    };
  }

  function getAllianceRequestPanelRenderSignature(eventsDisplay) {
    return allianceRequestsPanelEvents
      .map((event) => {
        const remainingSeconds = getAllianceRequestRemainingSeconds(eventsDisplay, event);
        return [
          event.createdAt,
          event.type,
          event.focusID ?? "",
          event.description ?? "",
          Number.isFinite(remainingSeconds) ? remainingSeconds : "",
          Array.isArray(event.buttons) ? event.buttons.length : 0,
        ].join(":");
      })
      .join("|");
  }

  function renderAllianceRequestPanel(eventsDisplay) {
    const panel = ensureAllianceRequestPanel();
    panel.dataset.visible = String(allianceRequestsPanelEvents.length > 0);
    const signature = getAllianceRequestPanelRenderSignature(eventsDisplay);
    if (signature === allianceRequestsPanelRenderSignature) {
      return;
    }
    allianceRequestsPanelRenderSignature = signature;

    const count = panel.querySelector(".openfront-helper-alliance-request-count");
    if (count) {
      count.textContent = String(allianceRequestsPanelEvents.length);
    }

    const list = panel.querySelector(".openfront-helper-alliance-request-list");
    if (!list) {
      return;
    }
    list.replaceChildren();

    for (const event of allianceRequestsPanelEvents) {
      const senderInfo = getAllianceRequestSenderInfo(eventsDisplay, event);
      const remainingSeconds = getAllianceRequestRemainingSeconds(eventsDisplay, event);
      const card = document.createElement("div");
      card.className = "openfront-helper-alliance-request-card";
      card.dataset.senderType = senderInfo.type;

      const description = document.createElement(event.focusID ? "button" : "div");
      description.className = "openfront-helper-alliance-request-description";
      description.textContent = String(event.description ?? "");
      if (event.focusID) {
        description.type = "button";
        description.addEventListener("click", () => {
          eventsDisplay?.emitGoToPlayerEvent?.(event.focusID);
          flashAllianceFocusTerritoryAfterCameraMove(eventsDisplay, event.focusID);
        });
      }

      const meta = document.createElement("div");
      meta.className = "openfront-helper-alliance-request-meta";
      meta.appendChild(description);
      if (senderInfo.label) {
        const senderType = document.createElement("span");
        senderType.className = "openfront-helper-alliance-request-sender-type";
        senderType.textContent = senderInfo.label;
        meta.appendChild(senderType);
      }
      const timeLeft = document.createElement("span");
      timeLeft.className = "openfront-helper-alliance-request-time";
      timeLeft.dataset.urgency = getAllianceRequestTimeUrgency(remainingSeconds);
      timeLeft.textContent = formatAllianceRequestRemainingTime(remainingSeconds);
      meta.appendChild(timeLeft);
      card.appendChild(meta);

      if (Array.isArray(event.buttons) && event.buttons.length > 0) {
        const actions = document.createElement("div");
        actions.className = "openfront-helper-alliance-request-actions";
        for (const buttonConfig of event.buttons) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = getAllianceRequestPanelButtonClass(buttonConfig.className);
          button.textContent = String(buttonConfig.text ?? "");
          button.addEventListener("click", () => {
            buttonConfig.action?.();
            if (buttonConfig.preventClose && event.focusID) {
              flashAllianceFocusTerritoryAfterCameraMove(eventsDisplay, event.focusID);
            }
            if (!buttonConfig.preventClose) {
              removeAllianceRequestPanelEvent(event);
              renderAllianceRequestPanel(eventsDisplay);
            }
          });
          actions.appendChild(button);
        }
        card.appendChild(actions);
      }

      list.appendChild(card);
    }
  }

  function syncAllianceRequestPanel() {
    if (!allianceRequestsPanelEnabled) {
      return;
    }

    const eventsDisplay = getEventsDisplayElement();
    let changed = false;
    if (eventsDisplay) {
      changed = captureAllianceRequestPanelEvents(eventsDisplay);
      changed = pruneAllianceRequestPanelEvents(eventsDisplay) || changed;
    }

    if (changed || getAllianceRequestPanelRenderSignature(eventsDisplay) !== allianceRequestsPanelRenderSignature) {
      renderAllianceRequestPanel(eventsDisplay);
    }
    allianceRequestsPanelAnimationFrame =
      requestAnimationFrame(syncAllianceRequestPanel);
  }

  function setAllianceRequestsPanelEnabled(enabled) {
    allianceRequestsPanelEnabled = Boolean(enabled);
    if (!allianceRequestsPanelEnabled) {
      if (allianceRequestsPanelAnimationFrame !== null) {
        cancelAnimationFrame(allianceRequestsPanelAnimationFrame);
        allianceRequestsPanelAnimationFrame = null;
      }
      allianceRequestsPanelEvents.splice(0, allianceRequestsPanelEvents.length);
      allianceRequestsPanelRenderSignature = "";
      document.getElementById(ALLIANCE_REQUEST_PANEL_ID)?.remove();
      return;
    }

    if (allianceRequestsPanelAnimationFrame === null) {
      syncAllianceRequestPanel();
    }
  }
