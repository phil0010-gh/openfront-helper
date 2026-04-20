// Enemy boat prediction: landing markers for transport ships and warships.

  const BOAT_UNIT_TYPES = ["Transport", "Warship"];

  function ensureBoatLandingStyles() {
    if (document.getElementById(BOAT_LANDING_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = BOAT_LANDING_STYLE_ID;
    style.textContent = `
      #${BOAT_LANDING_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
      }

      #${BOAT_LANDING_CONTAINER_ID} .openfront-helper-boat-marker {
        position: fixed;
        left: var(--boat-x);
        top: var(--boat-y);
        width: 20px;
        height: 20px;
        border: 2px solid var(--boat-color);
        border-radius: 50%;
        background: var(--boat-bg);
        box-shadow: 0 0 10px var(--boat-color);
        transform: translate(-50%, -50%);
      }

      #${BOAT_LANDING_CONTAINER_ID} .openfront-helper-boat-marker::before,
      #${BOAT_LANDING_CONTAINER_ID} .openfront-helper-boat-marker::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        background: var(--boat-color);
        transform: translate(-50%, -50%);
      }

      #${BOAT_LANDING_CONTAINER_ID} .openfront-helper-boat-marker::before {
        width: 14px;
        height: 2px;
      }

      #${BOAT_LANDING_CONTAINER_ID} .openfront-helper-boat-marker::after {
        width: 2px;
        height: 14px;
      }

      #${BOAT_LANDING_CONTAINER_ID} .openfront-helper-boat-label {
        position: fixed;
        left: var(--boat-x);
        top: calc(var(--boat-y) - 16px);
        padding: 3px 7px;
        border: 1px solid var(--boat-color);
        border-radius: 8px;
        background: rgba(7, 12, 18, 0.86);
        color: var(--boat-color);
        font: 900 11px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.92);
        transform: translate(-50%, -100%);
        white-space: nowrap;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureBoatLandingContainer() {
    ensureBoatLandingStyles();

    let container = document.getElementById(BOAT_LANDING_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = BOAT_LANDING_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function isEnemyBoatUnit(game, unit) {
    const owner = unit?.owner?.();
    const myPlayer = game?.myPlayer?.();
    if (!owner?.isPlayer?.() || !myPlayer?.isPlayer?.()) {
      return false;
    }
    if (owner.smallID?.() === myPlayer.smallID?.()) {
      return false;
    }
    try {
      return !owner.isFriendly?.(myPlayer) && !myPlayer.isFriendly?.(owner);
    } catch (_error) {
      return true;
    }
  }

  function isBoatTargetingMyPlayer(game, targetTile) {
    try {
      const myPlayer = game?.myPlayer?.();
      if (!myPlayer?.isPlayer?.()) {
        return false;
      }
      const ownerId = game.ownerID?.(targetTile);
      return Number(ownerId) === Number(myPlayer.smallID?.());
    } catch (_error) {
      return false;
    }
  }

  function syncBoatPrediction() {
    if (!boatPredictionEnabled) {
      document.getElementById(BOAT_LANDING_CONTAINER_ID)?.remove();
      boatLandingAnimationFrame = null;
      return;
    }

    const container = ensureBoatLandingContainer();
    const context = getOpenFrontGameContext();
    if (!context?.game || !context?.transform) {
      container.replaceChildren();
      boatLandingAnimationFrame = requestAnimationFrame(syncBoatPrediction);
      return;
    }

    const activeIds = new Set();
    for (const unit of context.game.units(...BOAT_UNIT_TYPES)) {
      if (!unit?.isActive?.() || !isEnemyBoatUnit(context.game, unit)) {
        continue;
      }

      // Skip retreating transport ships
      try {
        if (unit.retreating?.()) {
          continue;
        }
      } catch (_error) {
        // ignore
      }

      const targetTile = unit.targetTile?.();
      if (targetTile === undefined) {
        continue;
      }

      const worldX = context.game.x(targetTile);
      const worldY = context.game.y(targetTile);
      let screenPos = null;
      try {
        screenPos = context.transform.worldToScreenCoordinates({ x: worldX, y: worldY });
      } catch (_error) {
        screenPos = null;
      }

      if (
        !Number.isFinite(screenPos?.x) ||
        !Number.isFinite(screenPos?.y) ||
        screenPos.x < -200 ||
        screenPos.y < -200 ||
        screenPos.x > window.innerWidth + 200 ||
        screenPos.y > window.innerHeight + 200
      ) {
        continue;
      }

      const targeting = isBoatTargetingMyPlayer(context.game, targetTile);
      // Red when targeting me, yellow when targeting someone else
      const color = targeting ? "rgba(248, 113, 113, 0.95)" : "rgba(250, 204, 21, 0.95)";
      const bg = targeting ? "rgba(127, 29, 29, 0.22)" : "rgba(113, 90, 0, 0.18)";
      const labelText = unit.type?.() === "Transport"
        ? (targeting ? "⚓ Landing!" : "⚓ Landing")
        : (targeting ? "🚢 Warship!" : "🚢 Warship");

      const unitId = String(unit.id?.() ?? `${worldX}:${worldY}`);
      activeIds.add(unitId);

      let marker = container.querySelector(
        `.openfront-helper-boat-marker[data-boat-id="${escapeCssIdentifier(unitId)}"]`,
      );
      if (!marker) {
        marker = document.createElement("div");
        marker.className = "openfront-helper-boat-marker";
        marker.dataset.boatId = unitId;
        container.appendChild(marker);
      }

      let label = container.querySelector(
        `.openfront-helper-boat-label[data-boat-id="${escapeCssIdentifier(unitId)}"]`,
      );
      if (!label) {
        label = document.createElement("div");
        label.className = "openfront-helper-boat-label";
        label.dataset.boatId = unitId;
        container.appendChild(label);
      }

      marker.style.setProperty("--boat-x", `${screenPos.x}px`);
      marker.style.setProperty("--boat-y", `${screenPos.y}px`);
      marker.style.setProperty("--boat-color", color);
      marker.style.setProperty("--boat-bg", bg);
      label.style.setProperty("--boat-x", `${screenPos.x}px`);
      label.style.setProperty("--boat-y", `${screenPos.y}px`);
      label.style.setProperty("--boat-color", color);
      label.textContent = labelText;
    }

    for (const el of container.querySelectorAll("[data-boat-id]")) {
      if (!activeIds.has(el.dataset.boatId || "")) {
        el.remove();
      }
    }

    boatLandingAnimationFrame = requestAnimationFrame(syncBoatPrediction);
  }

  function setBoatPredictionEnabled(enabled) {
    boatPredictionEnabled = Boolean(enabled);
    if (!boatPredictionEnabled) {
      if (boatLandingAnimationFrame !== null) {
        cancelAnimationFrame(boatLandingAnimationFrame);
      }
      boatLandingAnimationFrame = null;
      document.getElementById(BOAT_LANDING_CONTAINER_ID)?.remove();
      return;
    }

    if (boatLandingAnimationFrame === null) {
      syncBoatPrediction();
    }
  }
