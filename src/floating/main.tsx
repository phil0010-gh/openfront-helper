import React from "react";
import { createRoot, type Root } from "react-dom/client";

const CHEATS_SETTING_KEYS = new Set([
  "showNukeSuggestions",
  "autoNuke",
  "autoNukeIncludeAllies",
]);

type Api = {
  getSettings: () => Record<string, unknown>;
  saveSettings: (next: Record<string, unknown>) => Promise<void>;
  t: (key: string) => string;
  normalizeEconomyHeatmapIntensity: (value: unknown) => number;
  getEconomyHeatmapIntensityLabel: (value: unknown) => string;
  FLOATING_HELPERS_PANEL_ID: string;
  FLOATING_HELPERS_STYLE_ID: string;
};

function getApi(): Api {
  const api = (globalThis as unknown as { OpenFrontHelperContentApi?: Api }).OpenFrontHelperContentApi;
  if (!api) {
    throw new Error("OpenFrontHelperContentApi missing (core.js must load first)");
  }
  return api;
}

let panelRoot: Root | null = null;
let panelElement: HTMLDivElement | null = null;

function injectPanelStyles() {
  const api = getApi();
  if (document.getElementById(api.FLOATING_HELPERS_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = api.FLOATING_HELPERS_STYLE_ID;
  style.textContent = `
    #${api.FLOATING_HELPERS_PANEL_ID} {
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
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 11px 12px;
      border-bottom: 1px solid rgba(134, 239, 172, 0.16);
      cursor: move;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-title {
      margin: 0;
      color: #bbf7d0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-close {
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
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-body {
      min-height: 0;
      overflow: auto;
      padding: 10px;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-resize {
      height: 12px;
      border-top: 1px solid rgba(134, 239, 172, 0.14);
      background: rgba(7, 24, 22, 0.78);
      cursor: ns-resize;
      touch-action: none;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-cat-title {
      margin: 0 2px 7px;
      color: rgba(187, 247, 208, 0.74);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-econ .ofh-fh-cat-title { color: #fef3c7; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-row {
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 9px;
      align-items: center;
      min-height: 40px;
      padding: 9px;
      margin-bottom: 7px;
      border: 1px solid rgba(151, 181, 214, 0.16);
      border-radius: 8px;
      background: rgba(8, 31, 28, 0.76);
      cursor: pointer;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-econ .ofh-fh-row {
      border-color: rgba(250, 204, 21, 0.2);
      background: rgba(22, 26, 20, 0.76);
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-row input { accent-color: #22c55e; width: 16px; height: 16px; margin: 0; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-econ .ofh-fh-row input { accent-color: #eab308; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-row[data-disabled="true"] { opacity: 0.55; cursor: not-allowed; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-row small { color: rgba(203, 213, 225, 0.78); font-size: 10px; display: block; margin-top: 3px; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-row strong { font-size: 12px; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-sub {
      display: grid;
      gap: 7px;
      padding: 8px;
      border: 1px solid rgba(248, 113, 113, 0.22);
      border-radius: 8px;
      background: rgba(23, 16, 24, 0.54);
      margin-top: 6px;
    }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-slider { display: grid; gap: 6px; padding: 6px 2px; }
    #${api.FLOATING_HELPERS_PANEL_ID} .ofh-fh-slider input { width: 100%; accent-color: #f59e0b; }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function FloatingPanelView(props: {
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onClose: () => void;
}) {
  const api = getApi();
  const { settings, onChange, onClose } = props;
  const t = api.t;
  const cheatsOn = Boolean(settings.cheatsAvailable);

  function row(key: string, title: string, desc: string) {
    const disabled = CHEATS_SETTING_KEYS.has(key) && !cheatsOn;
    return (
      <label key={key} className="ofh-fh-row" data-disabled={String(disabled)}>
        <input
          type="checkbox"
          checked={Boolean(settings[key])}
          disabled={disabled}
          onChange={(e) => onChange(key, e.target.checked)}
        />
        <span>
          <strong>{title}</strong>
          <small>{desc}</small>
        </span>
      </label>
    );
  }

  const intensityLabel = t(api.getEconomyHeatmapIntensityLabel(settings.economyHeatmapIntensity));

  return (
    <>
      <div className="ofh-fh-header" data-drag-header="true">
        <p className="ofh-fh-title">{t("Helpers")}</p>
        <button className="ofh-fh-close" type="button" aria-label={t("Close helpers panel")} onClick={onClose}>
          ×
        </button>
      </div>
      <div className="ofh-fh-body">
        <section>
          <p className="ofh-fh-cat-title">{t("Game helpers")}</p>
          {row("markBotNationsRed", t("Mark bot nations red"), t("Adds a red marker to nation AI names."))}
          {row("markHoveredAlliesGreen", t("Alliances"), t("Highlights allies with remaining alliance time."))}
          {row(
            "showAllianceRequestsPanel",
            t("Alliance requests panel"),
            t("Moves alliance requests and renewal prompts into a separate right-side window."),
          )}
          {row(
            "showNukePrediction",
            t("Nuke prediction"),
            t("Shows predicted enemy nuke landing points and blast radius."),
          )}
          {row(
            "showBoatPrediction",
            t("Boat prediction"),
            t("Shows enemy boat landing points. Red = targeting you, yellow = targeting others."),
          )}
          {row(
            "showNukeSuggestions",
            t("Nuke suggestion"),
            t("Hover an enemy to show high-damage atom and hydrogen targets."),
          )}
          {row("autoNuke", t("Auto nuke"), t("Adds auto economy and population nuke actions to the player wheel."))}
          {row(
            "autoNukeIncludeAllies",
            `↳ ${t("Include allies")}`,
            t("Also show auto nuke options when right-clicking allied players."),
          )}
          {row(
            "send1PercentBoat",
            t("Send 1% Boat"),
            t("Right-click any tile to send a boat with 1% troops, then restores your ratio."),
          )}
        </section>
        <section style={{ marginTop: 12 }}>
          <p className="ofh-fh-cat-title">{t("Economic helpers")}</p>
          {row("showGoldPerMinute", t("Gold per minute"), t("Adds GPM to the player hover panel."))}
          {row("showTeamGoldPerMinute", t("Team gold per minute"), t("Lists each team's total GPM."))}
          {row("showTopGoldPerMinute", t("Top 10 gold per minute"), t("Lists the highest tracked player GPM."))}
          {row("showTradeBalances", t("Trade balances"), t("Shows observed trade imports and exports."))}
          <div className="ofh-fh-sub">
            <p className="ofh-fh-cat-title" style={{ marginBottom: 0 }}>{t("Heatmaps")}</p>
            {row(
              "showEconomyHeatmap",
              t("Economic heatmap"),
              t("Highlights structures with observed trade revenue."),
            )}
            <label className="ofh-fh-slider">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 11 }}>{t("Economic heatmap intensity")}</strong>
                <span style={{ color: "#fde68a", fontSize: 10, fontWeight: 900 }}>{intensityLabel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={Number(settings.economyHeatmapIntensity ?? 1)}
                onChange={(e) => onChange("economyHeatmapIntensity", e.target.value)}
              />
            </label>
            {row(
              "showExportPartnerHeatmap",
              t("Export partner heatmap"),
              t("Hover a player to highlight export partners."),
            )}
          </div>
        </section>
      </div>
      <div className="ofh-fh-resize" data-resize-handle="true" role="separator" aria-orientation="horizontal" />
    </>
  );
}

function installDrag(panel: HTMLDivElement) {
  const header = panel.querySelector("[data-drag-header]");
  if (!(header instanceof HTMLElement)) {
    return;
  }
  let dragState: { pointerId: number; offsetX: number; offsetY: number } | null = null;
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
    panel.style.setProperty("--openfront-helper-left", `${Math.round(left)}px`);
    panel.style.setProperty("--openfront-helper-top", `${Math.round(top)}px`);
  });
  function finishDrag(event: PointerEvent) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    dragState = null;
    const rect = panel.getBoundingClientRect();
    const api = getApi();
    void api.saveSettings({
      ...api.getSettings(),
      floatingHelpersPanelPosition: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
      },
    });
  }
  header.addEventListener("pointerup", finishDrag);
  header.addEventListener("pointercancel", finishDrag);
}

function installResize(panel: HTMLDivElement) {
  const handle = panel.querySelector("[data-resize-handle]");
  if (!(handle instanceof HTMLElement)) {
    return;
  }
  let resizeState: { pointerId: number; startY: number; startHeight: number } | null = null;
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
    const maxHeight = Math.max(220, window.innerHeight - panel.getBoundingClientRect().top - 8);
    const nextHeight = resizeState.startHeight + event.clientY - resizeState.startY;
    const clamped = Math.max(220, Math.min(maxHeight, nextHeight));
    panel.style.setProperty("--openfront-helper-height", `${Math.round(clamped)}px`);
  });
  function finishResize(event: PointerEvent) {
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return;
    }
    resizeState = null;
    const api = getApi();
    void api.saveSettings({
      ...api.getSettings(),
      floatingHelpersPanelHeight: Math.round(panel.getBoundingClientRect().height),
    });
  }
  handle.addEventListener("pointerup", finishResize);
  handle.addEventListener("pointercancel", finishResize);
}

function positionPanel(panel: HTMLDivElement) {
  const api = getApi();
  const s = api.getSettings() as {
    floatingHelpersPanelPosition?: { left: number | null; top: number | null };
    floatingHelpersPanelHeight?: number | null;
  };
  const left = s.floatingHelpersPanelPosition?.left ?? window.innerWidth - 360;
  const top = s.floatingHelpersPanelPosition?.top ?? 92;
  const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
  const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
  panel.style.setProperty(
    "--openfront-helper-left",
    `${Math.max(8, Math.min(maxLeft, left))}px`,
  );
  panel.style.setProperty(
    "--openfront-helper-top",
    `${Math.max(8, Math.min(maxTop, top))}px`,
  );
  if (s.floatingHelpersPanelHeight != null) {
    const maxHeight = Math.max(220, window.innerHeight - panel.getBoundingClientRect().top - 8);
    const h = Math.max(220, Math.min(maxHeight, s.floatingHelpersPanelHeight));
    panel.style.setProperty("--openfront-helper-height", `${Math.round(h)}px`);
  }
}

function renderIntoPanel() {
  const api = getApi();
  if (!panelElement || !panelRoot) {
    return;
  }
  positionPanel(panelElement);
  panelRoot.render(
    <FloatingPanelView
      settings={api.getSettings()}
      onClose={() => {
        void api.saveSettings({
          ...api.getSettings(),
          showFloatingHelpersPanel: false,
        });
      }}
      onChange={(key, value) => {
        const cur = { ...api.getSettings() } as Record<string, unknown>;
        let next = { ...cur, [key]: value };
        if (key === "showEconomyHeatmap" && value) {
          next = { ...next, showExportPartnerHeatmap: false };
        }
        if (key === "showExportPartnerHeatmap" && value) {
          next = { ...next, showEconomyHeatmap: false };
        }
        if (key === "economyHeatmapIntensity") {
          next.economyHeatmapIntensity = api.normalizeEconomyHeatmapIntensity(value);
        }
        void api.saveSettings(next);
      }}
    />,
  );
}

function unmountPanel() {
  const api = getApi();
  panelRoot?.unmount();
  panelRoot = null;
  panelElement = null;
  document.getElementById(api.FLOATING_HELPERS_PANEL_ID)?.remove();
}

function syncFloatingHelpersPanelImpl() {
  const api = getApi();
  const settings = api.getSettings() as { showFloatingHelpersPanel?: boolean };
  if (!settings.showFloatingHelpersPanel) {
    unmountPanel();
    return;
  }

  injectPanelStyles();

  if (!panelElement || !document.body?.contains(panelElement)) {
    unmountPanel();
    panelElement = document.createElement("div");
    panelElement.id = api.FLOATING_HELPERS_PANEL_ID;
    document.body.appendChild(panelElement);
    panelRoot = createRoot(panelElement);
    installDrag(panelElement);
    installResize(panelElement);
  }

  renderIntoPanel();
}

(globalThis as unknown as { __openfrontSyncFloatingHelpersPanel?: () => void }).__openfrontSyncFloatingHelpersPanel =
  syncFloatingHelpersPanelImpl;
