import React, { useCallback, useEffect, useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Collapse from "react-bootstrap/Collapse";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Navbar from "react-bootstrap/Navbar";
import Offcanvas from "react-bootstrap/Offcanvas";
import Spinner from "react-bootstrap/Spinner";

type Settings = Record<string, unknown> & {
  language: string;
  enabled: boolean;
  searchStartedAt: number | null;
  joinNotification: boolean;
  minLobbySize: number | null;
  cheatsAvailable: boolean;
  autoCancelDeniedTradesAvailable: boolean;
  collapsedHelperCategories: Record<string, boolean>;
  includeFilters: Record<string, boolean>;
  excludeFilters: Record<string, boolean>;
  mapFilters: Record<string, boolean>;
  mapExcludeFilters: Record<string, boolean>;
  lobbyForecast: {
    available: boolean;
    etaMinSeconds: number | null;
    etaMaxSeconds: number | null;
    hitChanceNext10: number | null;
    medianLobbiesToMatch: number | null;
  };
  showFloatingHelpersPanel: boolean;
  economyHeatmapIntensity: number;
};

// @ts-expect-error OpenFront globals from IIFE scripts in popup.html
type Shared = typeof globalThis.OpenFrontHelperSettings;
// @ts-expect-error OpenFront globals from IIFE scripts in popup.html
type I18n = typeof globalThis.OpenFrontHelperI18n;

const SOUND_KEY = "joinNotificationSoundData";
const SOUND_NAME_KEY = "joinNotificationSoundName";

function assetUrl(path: string): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return path;
}

function normalizeSearchText(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function formatElapsedTime(startedAt: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDurationShort(totalSeconds: number, t: (k: string) => string): string {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function PopupApp() {
  const shared = (globalThis as unknown as { OpenFrontHelperSettings: Shared }).OpenFrontHelperSettings;
  const i18n = (globalThis as unknown as { OpenFrontHelperI18n: I18n }).OpenFrontHelperI18n;

  const [settings, setSettings] = useState<Settings>(() =>
    shared.normalizeSettings({}, { ensureActiveSearchTimestamp: true }),
  );
  const [translations, setTranslations] = useState(i18n.DEFAULT_TRANSLATIONS);
  const [languageOptions, setLanguageOptions] = useState(() =>
    i18n.createLanguageOptions("en"),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [languageSearch, setLanguageSearch] = useState("");
  const [helperInfo, setHelperInfo] = useState<{
    title: string;
    images: string[];
    index: number;
  } | null>(null);
  const [reloadTabId, setReloadTabId] = useState<number | null>(null);
  const [soundName, setSoundName] = useState<string | null>(null);
  const [, setRenderTick] = useState(0);

  const t = useCallback(
    (key: string) => i18n.getMessage(translations, key) || key,
    [i18n, translations],
  );

  const persist = useCallback(
    async (next: Settings) => {
      const normalized = shared.normalizeSettings(next, {
        ensureActiveSearchTimestamp: true,
      });
      setSettings(normalized);
      await chrome.storage.local.set({
        [shared.STORAGE_KEY]: normalized,
      });
    },
    [shared],
  );

  const loadSettings = useCallback(async () => {
    const stored = await chrome.storage.local.get(
      shared.STORAGE_KEY as string,
    );
    const raw =
      (stored as Record<string, unknown>)[shared.STORAGE_KEY as string] ?? {};
    setSettings(
      shared.normalizeSettings(raw as object, { ensureActiveSearchTimestamp: true }),
    );
  }, [shared]);

  const loadTranslations = useCallback(async () => {
    const bundle = await i18n.loadBundle(settings.language);
    setTranslations(bundle);
    setLanguageOptions(i18n.createLanguageOptions(settings.language));
    document.documentElement.lang = settings.language;
    document.title = t("Auto-Join & Helpers for OpenFront");
  }, [i18n, settings.language, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadTranslations();
  }, [loadTranslations]);

  useEffect(() => {
    async function pingOpenFrontTab() {
      if (!chrome.tabs?.query) {
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !String(tab.url || "").startsWith("https://openfront.io/")) {
        return;
      }
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "OPENFRONT_HELPER_PING" });
      } catch (_err) {
        setReloadTabId(tab.id);
      }
    }
    void pingOpenFrontTab();
  }, []);

  useEffect(() => {
    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      const key = shared.STORAGE_KEY as string;
      if (area !== "local" || !changes[key]?.newValue) {
        return;
      }
      setSettings(
        shared.normalizeSettings(changes[key].newValue as object, {
          ensureActiveSearchTimestamp: true,
        }),
      );
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [shared]);

  useEffect(() => {
    void chrome.storage.local.get([SOUND_KEY, SOUND_NAME_KEY]).then((stored) => {
      if (stored[SOUND_KEY]) {
        setSoundName(stored[SOUND_NAME_KEY] || t("customSound"));
      } else {
        setSoundName(null);
      }
    });
  }, [t]);

  useEffect(() => {
    if (!settings.enabled || !settings.searchStartedAt) {
      return;
    }
    const id = window.setInterval(() => setRenderTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [settings.enabled, settings.searchStartedAt]);

  const hasSelectedMapFilters = useCallback(() => {
    return shared.MAP_IDS.some((id: string) => settings.mapFilters[id]);
  }, [settings.mapFilters, shared.MAP_IDS]);

  const hasExcludedMapFilters = useCallback(() => {
    return shared.MAP_IDS.some((id: string) => settings.mapExcludeFilters[id]);
  }, [settings.mapExcludeFilters, shared.MAP_IDS]);

  const hasSelectedOptions = useCallback(() => {
    return (
      settings.minLobbySize != null ||
      shared.FILTER_KEYS.some(
        (key: string) =>
          settings.includeFilters[key as keyof typeof settings.includeFilters] ||
          settings.excludeFilters[key as keyof typeof settings.excludeFilters],
      ) ||
      hasSelectedMapFilters() ||
      hasExcludedMapFilters()
    );
  }, [hasExcludedMapFilters, hasSelectedMapFilters, settings, shared.FILTER_KEYS]);

  const resetAutoJoinIfEmpty = useCallback(
    (s: Settings) => {
      if (
        !(
          s.minLobbySize != null ||
          shared.FILTER_KEYS.some(
            (key: string) => s.includeFilters[key] || s.excludeFilters[key],
          ) ||
          shared.MAP_IDS.some((id: string) => s.mapFilters[id]) ||
          shared.MAP_IDS.some((id: string) => s.mapExcludeFilters[id])
        )
      ) {
        return { ...s, enabled: false, searchStartedAt: null };
      }
      return s;
    },
    [shared.FILTER_KEYS, shared.MAP_IDS],
  );

  const toggleIncludeFilter = async (key: string, checked: boolean) => {
    let next: Settings = {
      ...settings,
      includeFilters: { ...settings.includeFilters, [key]: checked },
    };
    if (checked) {
      next.excludeFilters = { ...next.excludeFilters, [key]: false };
    }
    next = shared.normalizeSettings(resetAutoJoinIfEmpty(next), {
      ensureActiveSearchTimestamp: true,
    });
    await persist(next);
  };

  const toggleExcludeFilter = async (key: string) => {
    const nextValue = !settings.excludeFilters[key];
    let next: Settings = {
      ...settings,
      excludeFilters: { ...settings.excludeFilters, [key]: nextValue },
    };
    if (nextValue) {
      next.includeFilters = { ...next.includeFilters, [key]: false };
    }
    next = shared.normalizeSettings(resetAutoJoinIfEmpty(next), {
      ensureActiveSearchTimestamp: true,
    });
    await persist(next);
  };

  const toggleMapInclude = async (mapId: string) => {
    const on = !settings.mapFilters[mapId];
    let next: Settings = {
      ...settings,
      mapFilters: { ...settings.mapFilters, [mapId]: on },
    };
    if (on) {
      next.mapExcludeFilters = { ...next.mapExcludeFilters, [mapId]: false };
    }
    next = shared.normalizeSettings(resetAutoJoinIfEmpty(next), {
      ensureActiveSearchTimestamp: true,
    });
    await persist(next);
  };

  const toggleMapExclude = async (mapId: string) => {
    const on = !settings.mapExcludeFilters[mapId];
    let next: Settings = {
      ...settings,
      mapExcludeFilters: { ...settings.mapExcludeFilters, [mapId]: on },
    };
    if (on) {
      next.mapFilters = { ...next.mapFilters, [mapId]: false };
    }
    next = shared.normalizeSettings(resetAutoJoinIfEmpty(next), {
      ensureActiveSearchTimestamp: true,
    });
    await persist(next);
  };

  const clearMapFilters = async () => {
    const next = shared.normalizeSettings(
      {
        ...settings,
        mapFilters: shared.createDefaultMapFilters(),
        mapExcludeFilters: shared.createDefaultMapFilters(),
      },
      { ensureActiveSearchTimestamp: true },
    );
    await persist(resetAutoJoinIfEmpty(next));
  };

  const toggleHelperCategory = async (category: string) => {
    const collapsed = Boolean(settings.collapsedHelperCategories?.[category]);
    await persist({
      ...settings,
      collapsedHelperCategories: {
        ...shared.DEFAULT_SETTINGS.collapsedHelperCategories,
        ...settings.collapsedHelperCategories,
        [category]: !collapsed,
      },
    });
  };

  const openHelperInfo = (title: string, images: string[]) => {
    setHelperInfo({ title, images, index: 0 });
  };

  const manifestVersion =
    typeof chrome.runtime.getManifest === "function"
      ? chrome.runtime.getManifest()?.version
      : "";

  const forecast = settings.lobbyForecast || { available: false };

  const filteredMaps = useMemo(() => {
    const q = normalizeSearchText(mapSearch);
    return shared.MAPS.filter((map: { id: string; name: string }) => {
      if (!q) {
        return true;
      }
      return normalizeSearchText(`${map.name} ${map.id}`).includes(q);
    });
  }, [mapSearch, shared.MAPS]);

  const filteredLanguages = useMemo(() => {
    const q = normalizeSearchText(languageSearch);
    return languageOptions.filter((language: { code: string; searchText: string }) => {
      if (!q) {
        return true;
      }
      return normalizeSearchText(language.searchText).includes(q);
    });
  }, [languageOptions, languageSearch]);

  const cheatsEnabled = Boolean(settings.cheatsAvailable);
  const cheatsHint = t("Only available in solo or custom games.");

  const lobbyRows = [
    { key: "ffaLobby", label: "FFA" },
    { key: "duosLobby", label: "Duos" },
    { key: "triosLobby", label: "Trios" },
    { key: "quadsLobby", label: "Quads" },
    {
      key: "teamsLargerThanTriosLobby",
      label: t("Teams larger than Quads"),
      help: t("Matches team lobbies with more than 4 players per team."),
    },
  ];

  const modifierRows = [
    { key: "randomSpawn", label: t("Random spawn") },
    { key: "alliancesDisabled", label: t("Alliances disabled") },
    { key: "portsDisabled", label: t("Ports disabled") },
    { key: "nukesDisabled", label: t("Nukes disabled") },
    { key: "samsDisabled", label: t("SAMs disabled") },
    { key: "waterNukes", label: t("Water nukes") },
    { key: "peaceTime4m", label: t("4min peace time") },
    { key: "goldMultiplier2x", label: t("2x gold") },
  ];

  const startGoldRows = [
    {
      key: "startingGold0M",
      label: t("0M starting gold"),
      help: t("Default case with no explicit starting gold."),
    },
    { key: "startingGold1M", label: t("1M starting gold") },
    { key: "startingGold5M", label: t("5M starting gold") },
    { key: "startingGold25M", label: t("25M starting gold") },
  ];

  type HelperRow = {
    name: string;
    title: React.ReactNode;
    small: string;
    info?: { title: string; images: string[] };
    disabled?: boolean;
  };

  const gameHelpers: HelperRow[] = [
    {
      name: "markBotNationsRed",
      title: t("Mark bot nations red"),
      small: t("Adds a red marker to nation AI names on the map."),
      info: {
        title: t("Mark bot nations red"),
        images: ["assets/info-images/mark_bot_nations_red_info.png"],
      },
    },
    {
      name: "markHoveredAlliesGreen",
      title: t("Alliances"),
      small: t("Highlights allies with remaining alliance time."),
      info: {
        title: t("Alliances"),
        images: ["assets/info-images/show_alliances_info.png"],
      },
    },
    {
      name: "showAllianceRequestsPanel",
      title: t("Alliance requests panel"),
      small: t("Moves alliance requests and renewal prompts into a separate right-side window."),
      info: {
        title: t("Alliance requests panel"),
        images: ["assets/info-images/alliance_requests_info.png"],
      },
    },
    {
      name: "showNukePrediction",
      title: t("Nuke prediction"),
      small: t("Shows predicted enemy nuke landing points and explosion radius."),
      info: {
        title: t("Nuke prediction"),
        images: ["assets/info-images/nuke_landing_zones.png"],
      },
    },
    {
      name: "showBoatPrediction",
      title: t("Boat prediction"),
      small: t("Shows enemy boat landing points. Red = targeting you, yellow = targeting others."),
      info: {
        title: t("Boat prediction"),
        images: ["assets/info-images/boat_prediction_info.png"],
      },
    },
  ];

  const economicHelpers: HelperRow[] = [
    {
      name: "showGoldPerMinute",
      title: t("Gold per minute"),
      small: t("Adds GPM to the player hover panel."),
      info: {
        title: t("Show gold per minute"),
        images: ["assets/info-images/show_gold_per_minute_info.png"],
      },
    },
    {
      name: "showTeamGoldPerMinute",
      title: t("Team gold per minute"),
      small: t("Lists each team's total GPM in team games."),
      info: {
        title: t("Show team gold per minute"),
        images: ["assets/info-images/show_team_gold_per_minute_info.png"],
      },
    },
    {
      name: "showTopGoldPerMinute",
      title: t("Top 10 gold per minute"),
      small: t("Lists the highest tracked player GPM."),
    },
    {
      name: "showTradeBalances",
      title: t("Trade balances"),
      small: t("Shows observed ship and train trade imports and exports."),
      info: {
        title: t("Show trade balances"),
        images: ["assets/info-images/trade_balance_info.png"],
      },
    },
  ];

  const renderHelperRow = (row: HelperRow) => {
    const checked = Boolean(settings[row.name as keyof Settings]);
    return (
      <div
        key={row.name}
        className="filter-card toggle-card d-flex align-items-start gap-2 py-2 px-2 mb-2 rounded border border-secondary"
        data-disabled={row.disabled ? "true" : "false"}
        title={row.disabled ? cheatsHint : ""}
      >
        <Form.Check
          type="checkbox"
          id={`helper-${row.name}`}
          name={row.name}
          checked={checked}
          disabled={row.disabled}
          onChange={async (e) => {
            if (
              (row.name === "showNukeSuggestions" || row.name === "autoNuke") &&
              !settings.cheatsAvailable
            ) {
              return;
            }
            const on = e.target.checked;
            let next: Settings = { ...settings, [row.name]: on };
            if (row.name === "showEconomyHeatmap" && on) {
              next = { ...next, showExportPartnerHeatmap: false };
            }
            if (row.name === "showExportPartnerHeatmap" && on) {
              next = { ...next, showEconomyHeatmap: false };
            }
            await persist(next);
          }}
          className="flex-shrink-0 mt-1"
        />
        <Form.Label htmlFor={`helper-${row.name}`} className="flex-grow-1 mb-0 small">
          <strong className="d-block">{row.title}</strong>
          <span className="text-secondary">{row.small}</span>
        </Form.Label>
        {row.info ? (
          <Button
            type="button"
            variant="outline-info"
            size="sm"
            className="helper-info-button flex-shrink-0"
            aria-label={row.info.title}
            onClick={() => openHelperInfo(row.info!.title, row.info!.images)}
          >
            i
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <main className="panel text-body">
      <Navbar className="hero border-bottom border-secondary flex-column align-items-stretch py-2 px-2">
        <div className="d-flex justify-content-end mb-2">
          <Button
            variant="outline-light"
            size="sm"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            {t("settings")}
          </Button>
        </div>

        <Offcanvas show={settingsOpen} onHide={() => setSettingsOpen(false)} placement="end">
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>{t("settings")}</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Card className="mb-3 bg-body-secondary">
              <Card.Body>
                <Card.Title className="h6">{t("customNotificationSound")}</Card.Title>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline-light"
                    size="sm"
                    onClick={async () => {
                      const stored = await chrome.storage.local.get(SOUND_KEY);
                      if (stored[SOUND_KEY]) {
                        new Audio(stored[SOUND_KEY]).play().catch(() => {});
                      }
                    }}
                  >
                    {t("test")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => document.getElementById("settingsSoundInput")?.click()}
                  >
                    {t("upload")}
                  </Button>
                  {soundName ? (
                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      onClick={async () => {
                        await chrome.storage.local.remove([SOUND_KEY, SOUND_NAME_KEY]);
                        setSoundName(null);
                      }}
                    >
                      {t("remove")}
                    </Button>
                  ) : null}
                </div>
                <div className="small text-secondary mb-2">
                  {soundName || t("defaultSound")}
                </div>
                <input
                  id="settingsSoundInput"
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={() => {
                    const input = document.getElementById(
                      "settingsSoundInput",
                    ) as HTMLInputElement | null;
                    const file = input?.files?.[0];
                    if (!file || !input) {
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      await chrome.storage.local.set({
                        [SOUND_KEY]: ev.target?.result,
                        [SOUND_NAME_KEY]: file.name,
                      });
                      setSoundName(file.name);
                    };
                    reader.readAsDataURL(file);
                    input.value = "";
                  }}
                />
              </Card.Body>
            </Card>

            <Card className="mb-3 bg-body-secondary">
              <Card.Body>
                <Card.Title className="h6">Macros</Card.Title>
                <Form.Check
                  type="checkbox"
                  id="send1PercentBoat"
                  label={
                    <>
                      <strong>{t("⚓ Send 1% Boat")}</strong>
                      <div className="small text-secondary">
                        {t("Send a transport with 1% troops, then restore the attack ratio.")}
                      </div>
                    </>
                  }
                  checked={Boolean(settings.send1PercentBoat)}
                  onChange={async (e) =>
                    await persist({ ...settings, send1PercentBoat: e.target.checked })
                  }
                />
                <Collapse in={Boolean(settings.send1PercentBoat)}>
                  <div className="mt-2 ps-2 border-start border-secondary">
                    <div className="small mb-1">
                      <span className="text-secondary">{t("Hotkey")}</span>{" "}
                      <kbd className="px-2 py-1 bg-dark border rounded">N</kbd>
                    </div>
                    <Form.Check
                      type="checkbox"
                      id="send1PercentBoatContextMenu"
                      label={t("Show button in selection wheel")}
                      checked={settings.send1PercentBoatContextMenu !== false}
                      onChange={async (e) =>
                        await persist({
                          ...settings,
                          send1PercentBoatContextMenu: e.target.checked,
                        })
                      }
                    />
                  </div>
                </Collapse>
              </Card.Body>
            </Card>

            <div>
              <Form.Label htmlFor="languageSearch">{t("language")}</Form.Label>
              <Form.Control
                id="languageSearch"
                type="search"
                className="mb-2"
                placeholder={t("searchLanguages")}
                value={languageSearch}
                onChange={(e) => setLanguageSearch(e.target.value)}
              />
              <div className="language-list border rounded overflow-auto" style={{ maxHeight: 220 }}>
                {filteredLanguages.length === 0 ? (
                  <div className="p-2 small text-secondary">{t("noLanguagesFound")}</div>
                ) : (
                  filteredLanguages.map(
                    (language: {
                      code: string;
                      name: string;
                      nativeName: string;
                      searchText: string;
                    }) => (
                    <button
                      key={language.code}
                      type="button"
                      className={`language-option w-100 text-start btn btn-sm ${
                        language.code === settings.language ? "btn-primary" : "btn-link text-light"
                      }`}
                      onClick={async () => {
                        if (language.code === settings.language) {
                          return;
                        }
                        const next = { ...settings, language: shared.normalizeLanguage(language.code) };
                        await persist(next);
                        setLanguageSearch("");
                        const bundle = await i18n.loadBundle(next.language);
                        setTranslations(bundle);
                        setLanguageOptions(i18n.createLanguageOptions(next.language));
                        document.documentElement.lang = next.language;
                        document.title = i18n.getMessage(bundle, "Auto-Join & Helpers for OpenFront");
                      }}
                    >
                      <span className="language-option-name">
                        {language.name === language.nativeName
                          ? language.name
                          : `${language.name} (${language.nativeName})`}
                      </span>{" "}
                      <span className="text-secondary small">{language.code}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </Offcanvas.Body>
        </Offcanvas>

        <Modal show={reloadTabId != null} onHide={() => setReloadTabId(null)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t("openFrontReloadTitle")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{t("openFrontReloadText")}</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setReloadTabId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const id = reloadTabId;
                setReloadTabId(null);
                if (typeof id === "number") {
                  await chrome.tabs.reload(id);
                }
              }}
            >
              {t("openFrontReloadButton")}
            </Button>
          </Modal.Footer>
        </Modal>

        <div className="d-flex flex-wrap gap-3 align-items-center discord-callout">
          <a
            className="discord-link github-link text-light"
            href="https://github.com/phil0010-gh/openfront-helper"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("openGitHubRepository")}
          >
            GitHub
          </a>
          <a
            className="discord-link text-light"
            href="https://discord.gg/6WFy4NQ9jy"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Join our Discord")}
          </a>
        </div>
      </Navbar>

      <Form
        className="popup-layout p-2"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <section className="filter-group filter-group-helpers mb-3">
          <div className="helpers-panel-header d-flex justify-content-between align-items-center mb-2">
            <p className="section-title mb-0">{t("Helpers")}</p>
            <Button
              type="button"
              size="sm"
              variant={settings.showFloatingHelpersPanel ? "success" : "outline-success"}
              aria-pressed={settings.showFloatingHelpersPanel}
              onClick={async () => {
                await persist({
                  ...settings,
                  showFloatingHelpersPanel: !settings.showFloatingHelpersPanel,
                });
              }}
            >
              ⛶ Float
            </Button>
          </div>

          <div className="mb-2">
            <Button
              variant="link"
              className="p-0 text-decoration-none text-warning text-uppercase fw-bold small"
              onClick={() => void toggleHelperCategory("game")}
              aria-expanded={!settings.collapsedHelperCategories?.game}
            >
              {t("Game helpers")}
            </Button>
            <Collapse in={!settings.collapsedHelperCategories?.game}>
              <div>{gameHelpers.map(renderHelperRow)}</div>
            </Collapse>
          </div>

          <div className="mb-2">
            <Button
              variant="link"
              className="p-0 text-decoration-none text-warning text-uppercase fw-bold small"
              onClick={() => void toggleHelperCategory("economic")}
              aria-expanded={!settings.collapsedHelperCategories?.economic}
            >
              {t("Economic helpers")}
            </Button>
            <Collapse in={!settings.collapsedHelperCategories?.economic}>
              <div>
                {economicHelpers.map(renderHelperRow)}
                <Card className="helper-subpanel helper-subpanel-heatmaps bg-dark border-warning mb-2">
                  <Card.Body className="py-2">
                    <Card.Title className="h6 small text-warning">{t("Heatmaps")}</Card.Title>
                    {renderHelperRow({
                      name: "showEconomyHeatmap",
                      title: t("Economic heatmap"),
                      small: t("Highlights structures with observed trade revenue."),
                      info: {
                        title: t("Economic heatmap"),
                        images: ["assets/info-images/economic_heatmap_info.png"],
                      },
                    })}
                    <Form.Label className="small d-block">
                      <strong>{t("Intensity")}</strong>{" "}
                      <span className="text-warning">
                        {t(shared.getEconomyHeatmapIntensityLabel(settings.economyHeatmapIntensity))}
                      </span>
                    </Form.Label>
                    <Form.Range
                      min={0}
                      max={2}
                      step={1}
                      value={settings.economyHeatmapIntensity}
                      onChange={async (e) => {
                        await persist({
                          ...settings,
                          economyHeatmapIntensity: shared.normalizeEconomyHeatmapIntensity(
                            e.target.value,
                          ),
                        });
                      }}
                    />
                    {renderHelperRow({
                      name: "showExportPartnerHeatmap",
                      title: t("Export partner heatmap"),
                      small: t("Hover a player to highlight the partner industry that fuels their exports."),
                    })}
                  </Card.Body>
                </Card>
              </div>
            </Collapse>
          </div>

          <div>
            <Button
              variant="link"
              className="p-0 text-decoration-none text-danger text-uppercase fw-bold small"
              onClick={() => void toggleHelperCategory("cheats")}
              aria-expanded={!settings.collapsedHelperCategories?.cheats}
            >
              {t("Cheats")}
            </Button>
            <Collapse in={!settings.collapsedHelperCategories?.cheats}>
              <div>
                <p className="helper-category-warning small text-warning">
                  ⚠ {t("Only available in solo or custom games.")}
                </p>
                {renderHelperRow({
                  name: "showNukeSuggestions",
                  title: (
                    <>
                      {t("Nuke suggestion")}{" "}
                      <span className="helper-beta-badge">Beta</span>{" "}
                      <span className="helper-warning-badge">{t("May lag")}</span>
                    </>
                  ),
                  small: t("Hover an enemy to show high-damage atom and hydrogen targets."),
                  disabled: !cheatsEnabled,
                })}
                {renderHelperRow({
                  name: "autoNuke",
                  title: (
                    <>
                      {t("Auto nuke")} <span className="helper-beta-badge">Beta</span>{" "}
                      <span className="helper-option-icon helper-option-icon-nuke helper-option-icon-auto-nuke" aria-hidden>
                        !
                      </span>
                    </>
                  ),
                  small: t("Adds auto economy and population nuke actions to the player wheel."),
                  info: {
                    title: t("Auto nuke"),
                    images: [
                      "assets/info-images/auto_nuke_1_info.png",
                      "assets/info-images/auto_nuke_2_info.png",
                    ],
                  },
                  disabled: !cheatsEnabled,
                })}
              </div>
            </Collapse>
          </div>
        </section>

        <div className="options-panel border-top border-secondary pt-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <p className="section-title mb-0">{t("Auto-Join")}</p>
          </div>

          <Button
            type="button"
            className={`power-button w-100 mb-2 ${settings.enabled ? "btn-success" : "btn-outline-secondary"}`}
            disabled={!hasSelectedOptions()}
            aria-pressed={settings.enabled}
            onClick={async () => {
              const enabled = !settings.enabled;
              await persist({
                ...settings,
                enabled,
                searchStartedAt: enabled ? Date.now() : null,
              });
            }}
          >
            {settings.enabled ? t("autoJoinOn") : t("autoJoinOff")}
          </Button>

          <Form.Check
            type="checkbox"
            id="joinNotification"
            className="mb-2"
            label={t("Game found notification popup")}
            checked={Boolean(settings.joinNotification)}
            onChange={async (e) =>
              await persist({ ...settings, joinNotification: e.target.checked })
            }
          />

          {settings.enabled && settings.searchStartedAt ? (
            <div className="search-timer small text-secondary mb-2" aria-live="polite">
              {t("Searching for")}{" "}
              <strong>{formatElapsedTime(settings.searchStartedAt)}</strong>
            </div>
          ) : null}

          {forecast.available ? (
            <Card className="lobby-forecast mb-3 bg-body-secondary">
              <Card.Body className="py-2">
                <Card.Title className="h6">
                  {t("Lobby forecast")} <span className="badge bg-warning text-dark">Beta</span>
                </Card.Title>
                <div className="d-flex justify-content-between small">
                  <span>{t("ETA (estimate)")}</span>
                  <strong>
                    {Number.isFinite(forecast.etaMinSeconds) &&
                    Number.isFinite(forecast.etaMaxSeconds) &&
                    forecast.etaMinSeconds &&
                    forecast.etaMaxSeconds ? (
                      `${formatDurationShort(forecast.etaMinSeconds, t)} - ${formatDurationShort(forecast.etaMaxSeconds, t)}`
                    ) : (
                      <Spinner animation="border" size="sm" />
                    )}
                  </strong>
                </div>
                <div className="d-flex justify-content-between small">
                  <span>{t("Hit chance next 10 lobbies")}</span>
                  <strong>
                    {forecast.hitChanceNext10 != null &&
                    Number.isFinite(forecast.hitChanceNext10) ? (
                      `${Math.round(forecast.hitChanceNext10 * 100)}%`
                    ) : (
                      <Spinner animation="border" size="sm" />
                    )}
                  </strong>
                </div>
                <div className="d-flex justify-content-between small">
                  <span>{t("Median to match")}</span>
                  <strong>
                    {forecast.medianLobbiesToMatch != null &&
                    Number.isFinite(forecast.medianLobbiesToMatch) ? (
                      `${Math.round(forecast.medianLobbiesToMatch)} ${t("lobbies")}`
                    ) : (
                      <Spinner animation="border" size="sm" />
                    )}
                  </strong>
                </div>
              </Card.Body>
            </Card>
          ) : null}

          <section className="mb-3">
            <p className="section-title">{t("Lobby Type")}</p>
            {lobbyRows.map((row) => (
              <LobbyFilterRow
                key={row.key}
                label={row.label}
                help={row.help}
                includeChecked={Boolean(settings.includeFilters[row.key as keyof typeof settings.includeFilters])}
                excludeActive={Boolean(settings.excludeFilters[row.key as keyof typeof settings.excludeFilters])}
                onInclude={async (c) => void toggleIncludeFilter(row.key, c)}
                onExclude={async () => void toggleExcludeFilter(row.key)}
                t={t}
              />
            ))}
          </section>

          <section className="mb-3">
            <p className="section-title">{t("Modifier")}</p>
            {modifierRows.map((row) => (
              <LobbyFilterRow
                key={row.key}
                label={row.label}
                includeChecked={Boolean(settings.includeFilters[row.key as keyof typeof settings.includeFilters])}
                excludeActive={Boolean(settings.excludeFilters[row.key as keyof typeof settings.excludeFilters])}
                onInclude={async (c) => void toggleIncludeFilter(row.key, c)}
                onExclude={async () => void toggleExcludeFilter(row.key)}
                t={t}
              />
            ))}
          </section>

          <section className="mb-3">
            <p className="section-title">{t("Start Gold")}</p>
            <p className="small text-secondary">
              {t(
                "You can turn on all four at the same time. Only one of them has to match.",
              )}
            </p>
            {startGoldRows.map((row) => (
              <LobbyFilterRow
                key={row.key}
                label={row.label}
                help={row.help}
                includeChecked={Boolean(settings.includeFilters[row.key as keyof typeof settings.includeFilters])}
                excludeActive={Boolean(settings.excludeFilters[row.key as keyof typeof settings.excludeFilters])}
                onInclude={async (c) => void toggleIncludeFilter(row.key, c)}
                onExclude={async () => void toggleExcludeFilter(row.key)}
                t={t}
              />
            ))}
          </section>

          <Form.Group className="mb-3">
            <Form.Label>
              <strong>{t("Min lobby size")}</strong>
              <div className="small text-secondary fw-normal">
                {t("Only join lobbies whose max player count is greater than this number.")}
              </div>
            </Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
              placeholder="0"
              value={settings.minLobbySize ?? ""}
              onChange={async (e) => {
                const next: Settings = {
                  ...settings,
                  minLobbySize: shared.normalizeMinLobbySize(e.target.value),
                };
                await persist(shared.normalizeSettings(resetAutoJoinIfEmpty(next), {
                  ensureActiveSearchTimestamp: true,
                }));
              }}
            />
          </Form.Group>

          <aside className="map-filter-panel mb-3" aria-labelledby="mapFilterTitle">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <p id="mapFilterTitle" className="section-title mb-0">
                {t("Maps")}
              </p>
              <Button
                type="button"
                variant="outline-light"
                size="sm"
                disabled={!hasSelectedMapFilters() && !hasExcludedMapFilters()}
                onClick={() => void clearMapFilters()}
              >
                {t("Clear")}
              </Button>
            </div>
            <Form.Label htmlFor="mapSearch">{t("Search maps")}</Form.Label>
            <Form.Control
              id="mapSearch"
              type="search"
              className="mb-2"
              placeholder={t("Search maps")}
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
            />
            <div className="map-filters d-flex flex-wrap gap-2" style={{ maxHeight: 280, overflow: "auto" }}>
              {filteredMaps.map((map: { id: string; name: string; thumbnail: string }) => (
                <Card
                  key={map.id}
                  className="map-filter-tile"
                  style={{ width: 120 }}
                  hidden={false}
                >
                  <Card.Img variant="top" src={assetUrl(map.thumbnail)} alt="" loading="lazy" />
                  <Card.Body className="p-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={settings.mapFilters[map.id] ? "success" : "outline-secondary"}
                      className="w-100 mb-1"
                      onClick={() => void toggleMapInclude(map.id)}
                    >
                      <span className="map-name small">{map.name}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={settings.mapExcludeFilters[map.id] ? "danger" : "outline-danger"}
                      className="w-100"
                      onClick={() => void toggleMapExclude(map.id)}
                    >
                      {t("Exclude")}
                    </Button>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </aside>

          <footer className="footer-note small text-secondary border-top border-secondary pt-2">
            {t(
              "Include requires a match. Exclude blocks an option. For starting gold, any included value is enough, while excluded values are always rejected.",
            )}
          </footer>
        </div>
      </Form>

      <Modal show={helperInfo != null} onHide={() => setHelperInfo(null)} size="lg" centered>
        {helperInfo ? (
          <>
            <Modal.Header closeButton>
              <Modal.Title>{helperInfo.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
              <img
                src={assetUrl(helperInfo.images[helperInfo.index] || "")}
                alt=""
                className="img-fluid rounded"
              />
              {helperInfo.images.length > 1 ? (
                <div className="d-flex justify-content-center align-items-center gap-3 mt-3">
                  <Button
                    size="sm"
                    disabled={helperInfo.index === 0}
                    onClick={() =>
                      setHelperInfo((h) =>
                        h ? { ...h, index: Math.max(0, h.index - 1) } : h,
                      )
                    }
                  >
                    ←
                  </Button>
                  <span className="small">
                    {helperInfo.index + 1} / {helperInfo.images.length}
                  </span>
                  <Button
                    size="sm"
                    disabled={helperInfo.index >= helperInfo.images.length - 1}
                    onClick={() =>
                      setHelperInfo((h) =>
                        h
                          ? {
                              ...h,
                              index: Math.min(h.images.length - 1, h.index + 1),
                            }
                          : h,
                      )
                    }
                  >
                    →
                  </Button>
                </div>
              ) : null}
            </Modal.Body>
          </>
        ) : null}
      </Modal>

      <div className="location-footer small text-secondary px-2 py-2 border-top border-secondary d-flex flex-wrap gap-2 align-items-center">
        <span>{manifestVersion ? `v${manifestVersion}` : ""}</span>
        <span>Cologne</span>
      </div>
    </main>
  );
}

function LobbyFilterRow(props: {
  label: string;
  help?: string;
  includeChecked: boolean;
  excludeActive: boolean;
  onInclude: (checked: boolean) => Promise<void>;
  onExclude: () => Promise<void>;
  t: (k: string) => string;
}) {
  const { label, help, includeChecked, excludeActive, onInclude, onExclude, t } = props;
  return (
    <div className="filter-card d-flex align-items-start gap-2 py-2 px-2 mb-2 rounded border border-secondary">
      <Form.Check
        type="checkbox"
        checked={includeChecked}
        onChange={(e) => void onInclude(e.target.checked)}
        className="flex-shrink-0 mt-1"
      />
      <div className="flex-grow-1">
        <strong>{label}</strong>
        {help ? <div className="small text-secondary">{help}</div> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={excludeActive ? "warning" : "outline-secondary"}
        onClick={() => void onExclude()}
      >
        {t("Exclude")}
      </Button>
    </div>
  );
}
