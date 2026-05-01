// Floating helpers panel ---------------------------------------------------
// Floating helpers panel UI that lives on the OpenFront page.

const CHEATS_SETTING_KEYS = new Set([
  "showNukeSuggestions",
  "autoNuke",
  "autoNukeIncludeAllies",
]);

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
      position: relative;
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

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-alliance-request-row {
      isolation: isolate;
      overflow: hidden;
      border-color: rgba(125, 211, 252, 0.24);
      background:
        radial-gradient(circle at 16% 18%, rgba(219, 234, 254, 0.08), transparent 26%),
        radial-gradient(circle at 88% 8%, rgba(56, 189, 248, 0.07), transparent 28%),
        linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(8, 38, 48, 0.84) 48%, rgba(15, 30, 52, 0.9));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.07),
        0 8px 18px rgba(15, 23, 42, 0.12);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-alliance-request-row::before {
      content: "";
      position: absolute;
      inset: -18px;
      z-index: -1;
      pointer-events: none;
      background:
        repeating-radial-gradient(
          ellipse at 18% 50%,
          transparent 0 12px,
          rgba(219, 234, 254, 0.1) 13px 14px,
          transparent 15px 24px
        ),
        repeating-radial-gradient(
          ellipse at 82% 50%,
          transparent 0 10px,
          rgba(125, 211, 252, 0.08) 11px 12px,
          transparent 13px 22px
        );
      opacity: 0.4;
      transform: rotate(-7deg) scale(1.08);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-alliance-request-row::after {
      content: "";
      position: absolute;
      inset: 1px;
      z-index: -1;
      border-radius: 7px;
      pointer-events: none;
      background:
        linear-gradient(120deg, rgba(255, 255, 255, 0.07), transparent 28%, rgba(125, 211, 252, 0.045) 54%, transparent 78%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.035), transparent 46%, rgba(14, 165, 233, 0.045));
      opacity: 0.62;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-alliance-request-row:hover {
      transform: translateY(-2px);
      border-color: rgba(125, 211, 252, 0.42);
      background:
        radial-gradient(circle at 16% 18%, rgba(219, 234, 254, 0.11), transparent 26%),
        radial-gradient(circle at 88% 8%, rgba(56, 189, 248, 0.11), transparent 28%),
        linear-gradient(135deg, rgba(17, 27, 54, 0.96), rgba(8, 45, 56, 0.88) 48%, rgba(15, 34, 58, 0.94));
      box-shadow:
        0 10px 22px rgba(15, 23, 42, 0.16),
        0 0 18px rgba(56, 189, 248, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-alliance-request-row:has(input:checked) {
      border-color: rgba(125, 211, 252, 0.58);
      background:
        radial-gradient(circle at 16% 18%, rgba(219, 234, 254, 0.13), transparent 26%),
        radial-gradient(circle at 88% 8%, rgba(56, 189, 248, 0.13), transparent 28%),
        linear-gradient(135deg, rgba(17, 27, 54, 0.96), rgba(8, 52, 66, 0.9) 48%, rgba(15, 34, 58, 0.94));
      box-shadow:
        0 0 0 3px rgba(125, 211, 252, 0.06),
        0 0 14px rgba(56, 189, 248, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #22c55e;
    }

    #${FLOATING_HELPERS_PANEL_ID} .openfront-helper-floating-alliance-request-row input[type="checkbox"] {
      accent-color: #7dd3fc;
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

function createFloatingHelperRow(key, title, description, extraClass = "") {
  const label = document.createElement("label");
  label.className = extraClass
    ? `openfront-helper-floating-row ${extraClass}`
    : "openfront-helper-floating-row";
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
      <p class="openfront-helper-floating-title">${t("Helpers")}</p>
      <button class="openfront-helper-floating-close" type="button" aria-label="${t("Close helpers panel")}">x</button>
    </div>
    <div class="openfront-helper-floating-body"></div>
    <div class="openfront-helper-floating-resize" role="separator" aria-orientation="horizontal" aria-label="${t("Resize helpers panel")}"></div>
  `;

  const body = panel.querySelector(".openfront-helper-floating-body");
  const gameCategory = document.createElement("section");
  gameCategory.className = "openfront-helper-floating-category";
  gameCategory.innerHTML = `<p class="openfront-helper-floating-category-title">${t("Game helpers")}</p>`;
  gameCategory.append(
    createFloatingHelperRow("markBotNationsRed", t("Mark bot nations red"), t("Adds a red marker to nation AI names.")),
    createFloatingHelperRow("markHoveredAlliesGreen", t("Alliances"), t("Highlights allies with remaining alliance time.")),
    createFloatingHelperRow("showAllianceRequestsPanel", t("Alliance requests panel"), t("Moves alliance requests and renewal prompts into a separate right-side window."), "openfront-helper-floating-alliance-request-row"),
    createFloatingHelperRow("showNukePrediction", t("Nuke prediction"), t("Shows predicted enemy nuke landing points and blast radius.")),
    createFloatingHelperRow("showBoatPrediction", t("Boat prediction"), t("Shows enemy boat landing points. Red = targeting you, yellow = targeting others.")),
    createFloatingHelperRow("showNukeSuggestions", t("Nuke suggestion"), t("Hover an enemy to show high-damage atom and hydrogen targets.")),
    createFloatingHelperRow("autoNuke", t("Auto nuke"), t("Adds auto economy and population nuke actions to the player wheel.")),
    createFloatingHelperRow("autoNukeIncludeAllies", `↳ ${t("Include allies")}`, t("Also show auto nuke options when right-clicking allied players.")),
    createFloatingHelperRow("send1PercentBoat", t("Send 1% Boat"), t("Right-click any tile to send a boat with 1% troops, then restores your ratio.")),
    createFloatingHelperActionButton(
      "toggleSelectiveTradePolicy",
      t("Block non-team trades"),
      t("Team games only: blocks trades with players who are not on your team."),
      t("Off"),
    ),
  );

  const economyCategory = document.createElement("section");
  economyCategory.className = "openfront-helper-floating-category";
  economyCategory.innerHTML = `<p class="openfront-helper-floating-category-title">${t("Economic helpers")}</p>`;
  economyCategory.append(
    createFloatingHelperRow("showGoldPerMinute", t("Gold per minute"), t("Adds GPM to the player hover panel.")),
    createFloatingHelperRow("showTeamGoldPerMinute", t("Team gold per minute"), t("Lists each team's total GPM.")),
    createFloatingHelperRow("showTopGoldPerMinute", t("Top 10 gold per minute"), t("Lists the highest tracked player GPM.")),
    createFloatingHelperRow("showTradeBalances", t("Trade balances"), t("Shows observed trade imports and exports.")),
  );

  const heatmapPanel = document.createElement("div");
  heatmapPanel.className = "openfront-helper-floating-subpanel";
  heatmapPanel.append(
    createFloatingHelperRow("showEconomyHeatmap", t("Economic heatmap"), t("Highlights structures with observed trade revenue.")),
  );
  const slider = document.createElement("label");
  slider.className = "openfront-helper-floating-slider";
  slider.innerHTML = `
    <strong>${t("Economic heatmap intensity")}</strong>
    <span class="openfront-helper-floating-slider-value"></span>
    <input type="range" min="0" max="2" step="1" data-helper-setting="economyHeatmapIntensity">
  `;
  heatmapPanel.append(
    slider,
    createFloatingHelperRow("showExportPartnerHeatmap", t("Export partner heatmap"), t("Hover a player to highlight export partners.")),
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

    if (CHEATS_SETTING_KEYS.has(key) && !settings.cheatsAvailable) {
      updateFloatingHelpersPanel(panel);
      return;
    }

    const nextSettings = {
      ...settings,
      [key]: target.type === "checkbox" ? target.checked : target.value,
    };
    if (key === "showEconomyHeatmap" && target.checked) {
      nextSettings.showExportPartnerHeatmap = false;
    }
    if (key === "showExportPartnerHeatmap" && target.checked) {
      nextSettings.showEconomyHeatmap = false;
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
        value.textContent = t(getEconomyHeatmapIntensityLabel(target.value));
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
  const cheatsEnabled = Boolean(settings.cheatsAvailable);

  for (const input of panel.querySelectorAll("[data-helper-setting]")) {
    if (!(input instanceof HTMLInputElement)) {
      continue;
    }

    const key = input.dataset.helperSetting;
    const isCheatSetting = CHEATS_SETTING_KEYS.has(key);
    const row = input.closest(".openfront-helper-floating-row");
    if (row instanceof HTMLElement) {
      row.hidden = isCheatSetting && !cheatsEnabled;
    }

    if (key === "economyHeatmapIntensity") {
      input.value = String(settings.economyHeatmapIntensity);
      const value = panel.querySelector(".openfront-helper-floating-slider-value");
      if (value) {
        value.textContent = t(getEconomyHeatmapIntensityLabel(settings.economyHeatmapIntensity));
      }
      continue;
    }

    input.disabled = isCheatSetting && !cheatsEnabled;
    input.checked = Boolean(settings[key]);
    input.title = "";
    if (row instanceof HTMLElement) {
      row.dataset.disabled = String(input.disabled);
      row.title = "";
    }

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
    actionButton.textContent = settings.selectiveTradePolicyEnabled ? t("On") : t("Off");
    actionButton.title = selectiveTradePolicyAvailable
      ? t("Blocks trades with players who are not on your team.")
      : t("Available only during an active team game.");
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
