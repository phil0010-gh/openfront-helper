// Floating helpers panel ---------------------------------------------------
// Floating helpers panel UI that lives on the OpenFront page.

function ensureFloatingHelpersStyles() {
  if (document.getElementById(FLOATING_HELPERS_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = FLOATING_HELPERS_STYLE_ID;
  style.textContent = `
    #${FLOATING_HELPERS_PANEL_ID} {
      position: fixed;
      left: var(--openfront-helper-left, 18px);
      top: var(--openfront-helper-top, 92px);
      z-index: 2147483647;
      width: min(340px, calc(100vw - 24px));
      height: var(--openfront-helper-height, auto);
      min-height: 220px;
      max-height: calc(100vh - 24px);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      overflow: hidden;
      border: 1px solid rgba(134, 239, 172, 0.34);
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(34, 197, 94, 0.16), transparent 44%),
        rgba(7, 24, 22, 0.94);
      color: #f3f4f6;
      font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
      box-shadow:
        0 18px 46px rgba(0, 0, 0, 0.42),
        inset 0 1px 0 rgba(187, 247, 208, 0.1);
      user-select: none;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px;
      border-bottom: 1px solid rgba(134, 239, 172, 0.16);
      cursor: move;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-title {
      margin: 0;
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-close {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border: 1px solid rgba(248, 113, 113, 0.34);
      border-radius: 8px;
      background: rgba(69, 10, 10, 0.68);
      color: #fecaca;
      cursor: pointer;
      font-size: 14px;
      font-weight: 900;
      line-height: 1;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-body {
      display: grid;
      gap: 10px;
      min-height: 0;
      overflow: auto;
      padding: 10px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-resize {
      position: relative;
      height: 12px;
      border-top: 1px solid rgba(134, 239, 172, 0.14);
      background: rgba(7, 24, 22, 0.78);
      cursor: ns-resize;
      touch-action: none;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-resize::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 4px;
      width: 42px;
      height: 3px;
      border-radius: 999px;
      background: rgba(187, 247, 208, 0.48);
      transform: translateX(-50%);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-category {
      display: grid;
      gap: 7px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-category-title {
      margin: 0 2px;
      color: rgba(187, 247, 208, 0.74);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 9px;
      align-items: center;
      min-height: 40px;
      padding: 9px;
      border: 1px solid rgba(151, 181, 214, 0.16);
      border-radius: 8px;
      background: rgba(8, 31, 28, 0.76);
      cursor: pointer;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #22c55e;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-row[data-disabled="true"] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-copy {
      min-width: 0;
      display: grid;
      gap: 3px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-copy strong {
      color: #f3f4f6;
      font-size: 12px;
      line-height: 1.15;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-copy small {
      color: rgba(203, 213, 225, 0.78);
      font-size: 10px;
      line-height: 1.25;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-subpanel {
      display: grid;
      gap: 7px;
      padding: 8px;
      border: 1px solid rgba(248, 113, 113, 0.22);
      border-radius: 8px;
      background: rgba(23, 16, 24, 0.54);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 7px 10px;
      align-items: center;
      padding: 6px 2px 2px;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider strong {
      color: #e5e7eb;
      font-size: 11px;
      line-height: 1.1;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider-value {
      color: #fde68a;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-slider input {
      grid-column: 1 / -1;
      width: 100%;
      accent-color: #f59e0b;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      min-height: 40px;
      padding: 9px;
      border: 1px solid rgba(151, 181, 214, 0.16);
      border-radius: 8px;
      background: rgba(8, 31, 28, 0.76);
      transition:
        transform 120ms ease,
        border-color 120ms ease,
        background 120ms ease,
        box-shadow 120ms ease,
        opacity 120ms ease;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action button {
      min-width: 68px;
      border: 1px solid rgba(151, 181, 214, 0.24);
      border-radius: 999px;
      background: rgba(10, 22, 36, 0.74);
      color: #cbd5e1;
      padding: 8px 12px;
      font: inherit;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      transition:
        transform 120ms ease,
        border-color 120ms ease,
        background 120ms ease,
        box-shadow 120ms ease,
        opacity 120ms ease;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action button:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(74, 222, 128, 0.38);
      background: rgba(12, 43, 35, 0.88);
      color: #f3f4f6;
      box-shadow: 0 8px 18px rgba(34, 197, 94, 0.1);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action button[data-active="true"] {
      border-color: rgba(74, 222, 128, 0.58);
      background:
        radial-gradient(circle at 35% 28%, rgba(220, 252, 231, 0.3), transparent 34%),
        linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(22, 163, 74, 0.92));
      color: #052e16;
      box-shadow:
        0 0 0 3px rgba(74, 222, 128, 0.12),
        0 0 14px rgba(34, 197, 94, 0.22),
        inset 0 1px 0 rgba(255, 255, 255, 0.28);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action button:disabled:hover {
      transform: none;
      border-color: rgba(151, 181, 214, 0.24);
      background: rgba(10, 22, 36, 0.74);
      color: #cbd5e1;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action[data-disabled="true"] {
      opacity: 0.55;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-action:not([data-disabled="true"]):hover {
      transform: translateY(-1px);
      border-color: rgba(74, 222, 128, 0.44);
      background: rgba(12, 43, 35, 0.88);
      box-shadow: 0 8px 18px rgba(34, 197, 94, 0.1);
    }

  `;
  (document.head || document.documentElement).appendChild(style);
}

function createFloatingHelperRow(key, title, description) {
  const label = document.createElement("label");
  label.className = "openfront-helper-floating-row";
  label.innerHTML = `
    <input type="checkbox" data-helper-setting="${key}">
    <span class="openfront-helper-floating-copy">
      <strong></strong>
      <small></small>
    </span>
  `;
  label.querySelector("strong").textContent = title;
  label.querySelector("small").textContent = description;
  return label;
}

function createFloatingHelperActionButton(action, title, description, buttonLabel) {
  const wrapper = document.createElement("div");
  wrapper.className = "openfront-helper-floating-action";
  wrapper.innerHTML = `
    <span class="openfront-helper-floating-copy">
      <strong></strong>
      <small></small>
    </span>
    <button type="button" data-helper-action="${action}"></button>
  `;
  wrapper.querySelector("strong").textContent = title;
  wrapper.querySelector("small").textContent = description;
  wrapper.querySelector("button").textContent = buttonLabel;
  return wrapper;
}

function createFloatingHelpersPanel() {
  ensureFloatingHelpersStyles();

  const panel = document.createElement("div");
  panel.id = FLOATING_HELPERS_PANEL_ID;
  panel.innerHTML = `
    <div class="openfront-helper-floating-header">
      <p class="openfront-helper-floating-title">Helpers</p>
      <button class="openfront-helper-floating-close" type="button" aria-label="Close helpers panel">x</button>
    </div>
    <div class="openfront-helper-floating-body"></div>
    <div class="openfront-helper-floating-resize" role="separator" aria-orientation="horizontal" aria-label="Resize helpers panel"></div>
  `;

  const body = panel.querySelector(".openfront-helper-floating-body");
  const gameCategory = document.createElement("section");
  gameCategory.className = "openfront-helper-floating-category";
  gameCategory.innerHTML = `<p class="openfront-helper-floating-category-title">Game helpers</p>`;
  gameCategory.append(
    createFloatingHelperRow("markBotNationsRed", "Mark bot nations red", "Adds a red marker to nation AI names."),
    createFloatingHelperRow("markHoveredAlliesGreen", "Alliances", "Highlights allies with remaining alliance time."),
    createFloatingHelperRow("fpsSaver", "FPS Saver", "Disables nuke explosion animations."),
    createFloatingHelperRow("showAttackAmounts", "Attack amounts", "Shows how many troops a player attacks with."),
    createFloatingHelperRow("showNukeLandingZones", "Nuke landing zones", "Shows enemy nuke landing points and blast radius."),
    createFloatingHelperRow("showNukeTargetHeatmap", "Nuke target zones", "Hover an enemy player to show the best high-damage nuke zones."),
    createFloatingHelperActionButton(
      "toggleSelectiveTradePolicy",
      "Block non-team trades",
      "Team games only: blocks trades with players who are not on your team.",
      "Off",
    ),
  );

  const economyCategory = document.createElement("section");
  economyCategory.className = "openfront-helper-floating-category";
  economyCategory.innerHTML = `<p class="openfront-helper-floating-category-title">Economic helpers</p>`;
  economyCategory.append(
    createFloatingHelperRow("showGoldPerMinute", "Gold per minute", "Adds GPM to the player hover panel."),
    createFloatingHelperRow("showTeamGoldPerMinute", "Team gold per minute", "Lists each team's total GPM."),
    createFloatingHelperRow("showTopGoldPerMinute", "Top 10 gold per minute", "Lists the highest tracked player GPM."),
    createFloatingHelperRow("showTradeBalances", "Trade balances", "Shows observed trade imports and exports."),
  );

  const heatmapPanel = document.createElement("div");
  heatmapPanel.className = "openfront-helper-floating-subpanel";
  heatmapPanel.append(
    createFloatingHelperRow("showEconomyHeatmap", "Economic heatmap", "Highlights structures with observed trade revenue."),
  );
  const slider = document.createElement("label");
  slider.className = "openfront-helper-floating-slider";
  slider.innerHTML = `
    <strong>Economic heatmap intensity</strong>
    <span class="openfront-helper-floating-slider-value"></span>
    <input type="range" min="0" max="2" step="1" data-helper-setting="economyHeatmapIntensity">
  `;
  heatmapPanel.append(
    slider,
    createFloatingHelperRow("showExportPartnerHeatmap", "Export partner heatmap", "Hover a player to highlight export partners."),
  );
  economyCategory.append(heatmapPanel);
  body.append(gameCategory, economyCategory);

  panel.querySelector(".openfront-helper-floating-close")?.addEventListener("click", () => {
    saveSettings({
      ...settings,
      showFloatingHelpersPanel: false,
    }).catch((error) => {
      console.error("Failed to close floating helpers panel:", error);
    });
  });

  panel.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const key = target.dataset.helperSetting;
    if (!key) {
      return;
    }

    const nextSettings = {
      ...settings,
      [key]: target.type === "checkbox" ? target.checked : target.value,
    };
    if (key === "showEconomyHeatmap" && target.checked) {
      nextSettings.showExportPartnerHeatmap = false;
      nextSettings.showNukeTargetHeatmap = false;
    }
    if (key === "showExportPartnerHeatmap" && target.checked) {
      nextSettings.showEconomyHeatmap = false;
      nextSettings.showNukeTargetHeatmap = false;
    }
    if (key === "showNukeTargetHeatmap" && target.checked) {
      nextSettings.showEconomyHeatmap = false;
      nextSettings.showExportPartnerHeatmap = false;
    }
    if (key === "economyHeatmapIntensity") {
      nextSettings.economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(target.value);
    }

    saveSettings(nextSettings).catch((error) => {
      console.error("Failed to update floating helpers setting:", error);
    });
  });

  panel.addEventListener("input", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.dataset.helperSetting === "economyHeatmapIntensity"
    ) {
      const value = panel.querySelector(".openfront-helper-floating-slider-value");
      if (value) {
        value.textContent = getEconomyHeatmapIntensityLabel(target.value);
      }
    }
  });

  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionButton = target.closest("[data-helper-action]");
    if (!(actionButton instanceof HTMLButtonElement)) {
      return;
    }
    if (actionButton.disabled) {
      return;
    }
    if (actionButton.dataset.helperAction !== "toggleSelectiveTradePolicy") {
      return;
    }

    saveSettings({
      ...settings,
      selectiveTradePolicyEnabled: !settings.selectiveTradePolicyEnabled,
    }).catch((error) => {
      console.error("Failed to toggle non-team trade block:", error);
    });
  });

  installFloatingHelpersDrag(panel);
  installFloatingHelpersVerticalResize(panel);
  return panel;
}

function installFloatingHelpersDrag(panel) {
  const header = panel.querySelector(".openfront-helper-floating-header");
  if (!(header instanceof HTMLElement)) {
    return;
  }

  let dragState = null;
  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target instanceof HTMLButtonElement) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    header.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  header.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
    const left = Math.max(8, Math.min(maxLeft, event.clientX - dragState.offsetX));
    const top = Math.max(8, Math.min(maxTop, event.clientY - dragState.offsetY));
    setFloatingHelpersPosition(panel, left, top);
  });

  function finishDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragState = null;
    const rect = panel.getBoundingClientRect();
    saveSettings({
      ...settings,
      floatingHelpersPanelPosition: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      },
    }).catch((error) => {
      console.error("Failed to save floating helpers position:", error);
    });
  }

  header.addEventListener("pointerup", finishDrag);
  header.addEventListener("pointercancel", finishDrag);
}

function installFloatingHelpersVerticalResize(panel) {
  const handle = panel.querySelector(".openfront-helper-floating-resize");
  if (!(handle instanceof HTMLElement)) {
    return;
  }

  let resizeState = null;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    resizeState = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: panel.getBoundingClientRect().height,
    };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    const nextHeight = resizeState.startHeight + event.clientY - resizeState.startY;
    setFloatingHelpersHeight(panel, nextHeight);
  });

  function finishResize(event) {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }

    resizeState = null;
    const rect = panel.getBoundingClientRect();
    saveSettings({
      ...settings,
      floatingHelpersPanelHeight: Math.round(rect.height),
    }).catch((error) => {
      console.error("Failed to save floating helpers height:", error);
    });
  }

  handle.addEventListener("pointerup", finishResize);
  handle.addEventListener("pointercancel", finishResize);
}

function setFloatingHelpersPosition(panel, left, top) {
  panel.style.setProperty("--openfront-helper-left", `${Math.round(left)}px`);
  panel.style.setProperty("--openfront-helper-top", `${Math.round(top)}px`);
}

function getFloatingHelpersMaxHeight(panel) {
  const rect = panel.getBoundingClientRect();
  return Math.max(220, window.innerHeight - rect.top - 8);
}

function setFloatingHelpersHeight(panel, height) {
  const maxHeight = getFloatingHelpersMaxHeight(panel);
  const clampedHeight = Math.max(220, Math.min(maxHeight, height));
  panel.style.setProperty("--openfront-helper-height", `${Math.round(clampedHeight)}px`);
}

function positionFloatingHelpersPanel(panel) {
  const left = settings.floatingHelpersPanelPosition.left ?? window.innerWidth - 360;
  const top = settings.floatingHelpersPanelPosition.top ?? 92;
  const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
  const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
  setFloatingHelpersPosition(
    panel,
    Math.max(8, Math.min(maxLeft, left)),
    Math.max(8, Math.min(maxTop, top)),
  );

  if (settings.floatingHelpersPanelHeight !== null) {
    setFloatingHelpersHeight(panel, settings.floatingHelpersPanelHeight);
  }
}

function updateFloatingHelpersPanel(panel) {
  for (const input of panel.querySelectorAll("[data-helper-setting]")) {
    if (!(input instanceof HTMLInputElement)) {
      continue;
    }

    const key = input.dataset.helperSetting;
    if (key === "economyHeatmapIntensity") {
      input.value = String(settings.economyHeatmapIntensity);
      const value = panel.querySelector(".openfront-helper-floating-slider-value");
      if (value) {
        value.textContent = getEconomyHeatmapIntensityLabel(settings.economyHeatmapIntensity);
      }
      continue;
    }

    input.checked = Boolean(settings[key]);

  }

  const actionButton = panel.querySelector(
    'button[data-helper-action="toggleSelectiveTradePolicy"]',
  );
  if (actionButton instanceof HTMLButtonElement) {
    actionButton.disabled = !selectiveTradePolicyAvailable;
    actionButton.dataset.active = String(Boolean(settings.selectiveTradePolicyEnabled));
    actionButton.setAttribute(
      "aria-pressed",
      String(Boolean(settings.selectiveTradePolicyEnabled)),
    );
    actionButton.textContent = settings.selectiveTradePolicyEnabled ? "On" : "Off";
    actionButton.title = selectiveTradePolicyAvailable
      ? "Blocks trades with players who are not on your team."
      : "Available only during an active team game.";
    const actionCard = actionButton.closest(".openfront-helper-floating-action");
    if (actionCard instanceof HTMLElement) {
      actionCard.dataset.disabled = String(!selectiveTradePolicyAvailable);
      actionCard.title = actionButton.title;
    }
  }
}

function syncFloatingHelpersPanel() {
  let panel = document.getElementById(FLOATING_HELPERS_PANEL_ID);
  if (!settings.showFloatingHelpersPanel) {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = createFloatingHelpersPanel();
    (document.body || document.documentElement).appendChild(panel);
    positionFloatingHelpersPanel(panel);
  }

  updateFloatingHelpersPanel(panel);
}
