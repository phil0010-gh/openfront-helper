const STORAGE_KEY = "settings";
const INSTALL_NOTICE_KEY = "installReloadNoticePending";
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
const MAPS = Array.isArray(globalThis.OPENFRONT_MAPS)
  ? globalThis.OPENFRONT_MAPS
  : [];
const MAP_IDS = MAPS.map((map) => map.id);

function createDefaultMapFilters() {
  return Object.fromEntries(MAP_IDS.map((id) => [id, false]));
}

const DEFAULT_SETTINGS = {
  enabled: false,
  searchStartedAt: null,
  markBotNationsRed: false,
  showGoldPerMinute: false,
  showTeamGoldPerMinute: false,
  showTopGoldPerMinute: false,
  markHoveredAlliesGreen: false,
  showTradeBalances: false,
  fpsSaver: false,
  showAttackAmounts: false,
  showEconomyHeatmap: false,
  economyHeatmapIntensity: 1,
  showExportPartnerHeatmap: false,
  showFloatingHelpersPanel: false,
  collapsedHelperCategories: {
    game: false,
    economic: false,
  },
  includeFilters: {
    ffaLobby: false,
    duosLobby: false,
    triosLobby: false,
    quadsLobby: false,
    teamsLargerThanTriosLobby: false,
    startingGold0M: false,
    randomSpawn: false,
    alliancesDisabled: false,
    startingGold5M: false,
    startingGold25M: false,
    goldMultiplier2x: false,
  },
  excludeFilters: {
    ffaLobby: false,
    duosLobby: false,
    triosLobby: false,
    quadsLobby: false,
    teamsLargerThanTriosLobby: false,
    startingGold0M: false,
    randomSpawn: false,
    alliancesDisabled: false,
    startingGold5M: false,
    startingGold25M: false,
    goldMultiplier2x: false,
  },
  mapFilters: createDefaultMapFilters(),
  mapExcludeFilters: createDefaultMapFilters(),
};

const powerButton = document.getElementById("powerButton");
const statusText = document.getElementById("statusText");
const searchTimer = document.getElementById("searchTimer");
const searchTimerValue = document.getElementById("searchTimerValue");
const filtersForm = document.getElementById("filtersForm");
const helpersPopoutButton = document.getElementById("helpersPopoutButton");
const mapFiltersContainer = document.getElementById("mapFilters");
const mapSearchInput = document.getElementById("mapSearchInput");
const clearMapFiltersButton = document.getElementById("clearMapFiltersButton");
const installNotice = document.getElementById("installNotice");
const dismissInstallNoticeButton = document.getElementById(
  "dismissInstallNoticeButton",
);
const helperInfoPopup = document.getElementById("helperInfoPopup");
const helperInfoTitle = document.getElementById("helperInfoTitle");
const helperInfoImage = document.getElementById("helperInfoImage");
const helperInfoCloseButton = document.getElementById("helperInfoCloseButton");
const versionBadge = document.getElementById("versionBadge");
const economyHeatmapIntensityValue = document.getElementById(
  "economyHeatmapIntensityValue",
);

let settings = normalizeSettings();
let showInstallNotice = false;
let activeHelperInfoButton = null;
let timerInterval = null;

function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeSearchStartedAt(rawSettings) {
  if (!rawSettings.enabled) {
    return null;
  }

  const searchStartedAt = Number(rawSettings.searchStartedAt);
  if (Number.isFinite(searchStartedAt) && searchStartedAt > 0) {
    return searchStartedAt;
  }

  return Date.now();
}

function normalizeSettings(rawSettings = {}) {
  rawSettings = rawSettings || {};
  const includeFilters = rawSettings.includeFilters || rawSettings.filters || {};
  const excludeFilters = rawSettings.excludeFilters || rawSettings.excludes || {};
  const mapFilters = rawSettings.mapFilters || rawSettings.maps || {};
  const mapExcludeFilters =
    rawSettings.mapExcludeFilters || rawSettings.mapExcludes || {};
  const collapsedHelperCategories = rawSettings.collapsedHelperCategories || {};

  const normalized = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    collapsedHelperCategories: {
      ...DEFAULT_SETTINGS.collapsedHelperCategories,
      ...collapsedHelperCategories,
    },
    searchStartedAt: normalizeSearchStartedAt(rawSettings),
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

  if (normalized.showEconomyHeatmap && normalized.showExportPartnerHeatmap) {
    normalized.showExportPartnerHeatmap = false;
  }
  normalized.economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(
    normalized.economyHeatmapIntensity,
  );

  return normalized;
}

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

function formatElapsedTime(startedAt) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderSearchTimer() {
  if (!settings.enabled || !settings.searchStartedAt) {
    searchTimer.hidden = true;
    searchTimerValue.textContent = "00:00";
    return;
  }

  searchTimer.hidden = false;
  searchTimerValue.textContent = formatElapsedTime(settings.searchStartedAt);
}

function renderHelperCategoryCollapse() {
  for (const toggle of filtersForm.querySelectorAll(".helper-category-toggle")) {
    const category = toggle.dataset.helperCategory;
    if (!category) {
      continue;
    }

    const collapsed = Boolean(settings.collapsedHelperCategories?.[category]);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    const content = filtersForm.querySelector(
      `[data-helper-category-content="${category}"]`,
    );
    if (content instanceof HTMLElement) {
      content.hidden = collapsed;
    }
  }
}

function syncTimerInterval() {
  if (settings.enabled && settings.searchStartedAt) {
    if (timerInterval === null) {
      timerInterval = window.setInterval(renderSearchTimer, 1000);
    }
    return;
  }

  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function normalizeMapFilters(rawMapFilters = {}) {
  const normalizedMapFilters = createDefaultMapFilters();
  for (const id of MAP_IDS) {
    normalizedMapFilters[id] = Boolean(rawMapFilters[id]);
  }
  return normalizedMapFilters;
}

async function loadSettings() {
  const stored = await chrome.storage.local.get([STORAGE_KEY, INSTALL_NOTICE_KEY]);
  const rawSettings = stored[STORAGE_KEY] || {};
  settings = normalizeSettings(rawSettings);
  if (settings.enabled && !rawSettings.searchStartedAt) {
    await saveSettings();
  }
  showInstallNotice = stored[INSTALL_NOTICE_KEY] === true;
}

async function saveSettings() {
  await chrome.storage.local.set({
    [STORAGE_KEY]: settings,
  });
}

function hasSelectedOptions() {
  return FILTER_KEYS.some(
    (key) => settings.includeFilters[key] || settings.excludeFilters[key],
  ) || hasSelectedMapFilters() || hasExcludedMapFilters();
}

function hasSelectedMapFilters() {
  return MAP_IDS.some((id) => settings.mapFilters[id]);
}

function hasExcludedMapFilters() {
  return MAP_IDS.some((id) => settings.mapExcludeFilters[id]);
}

function renderMapFilterButtons() {
  const fragment = document.createDocumentFragment();

  for (const map of MAPS) {
    const tile = document.createElement("div");
    tile.className = "map-filter-tile";

    const button = document.createElement("button");
    button.className = "map-filter-button";
    button.type = "button";
    button.dataset.mapId = map.id;
    tile.dataset.searchText = `${normalizeSearchText(map.name)} ${normalizeSearchText(map.id)}`;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Filter map ${map.name}`);

    const image = document.createElement("img");
    image.src = map.thumbnail;
    image.alt = "";
    image.loading = "lazy";

    const name = document.createElement("span");
    name.className = "map-name";
    name.textContent = map.name;

    button.append(image, name);

    const excludeButton = document.createElement("button");
    excludeButton.className = "map-exclude-button";
    excludeButton.type = "button";
    excludeButton.dataset.mapId = map.id;
    excludeButton.setAttribute("aria-label", `Exclude map ${map.name}`);
    excludeButton.textContent = "Exclude";

    tile.append(button, excludeButton);
    fragment.append(tile);
  }

  mapFiltersContainer.replaceChildren(fragment);
}

function renderMapSearch() {
  const query = normalizeSearchText(mapSearchInput.value);

  for (const tile of mapFiltersContainer.querySelectorAll(".map-filter-tile")) {
    const searchText = tile.dataset.searchText || "";
    tile.hidden = Boolean(query) && !searchText.includes(query);
  }
}

function handleStorageChange(changes, areaName) {
  if (areaName !== "local" || !changes[STORAGE_KEY]) {
    return;
  }

  settings = normalizeSettings(changes[STORAGE_KEY].newValue);
  render();
}

function render() {
  const enabled = settings.enabled;
  const hasOptionsSelected = hasSelectedOptions();

  installNotice.hidden = !showInstallNotice;
  powerButton.dataset.enabled = String(enabled);
  powerButton.disabled = !hasOptionsSelected;
  powerButton.setAttribute("aria-pressed", String(enabled));
  powerButton.querySelector(".power-label").textContent = enabled
    ? "Auto-Join ON"
    : "Auto-Join OFF";
  if (helpersPopoutButton instanceof HTMLButtonElement) {
    helpersPopoutButton.dataset.active = String(settings.showFloatingHelpersPanel);
    helpersPopoutButton.setAttribute(
      "aria-pressed",
      String(settings.showFloatingHelpersPanel),
    );
    helpersPopoutButton.title = settings.showFloatingHelpersPanel
      ? "Hide floating helpers panel on OpenFront"
      : "Show floating helpers panel on OpenFront";
  }

  if (enabled) {
    statusText.hidden = false;
    statusText.textContent =
      "The extension is watching public lobbies and will join the first match based on your include/exclude rules.";
  } else if (!hasOptionsSelected) {
    statusText.hidden = false;
    statusText.textContent =
      "Select at least one map, include option, or exclude option to enable auto-join.";
  } else {
    statusText.hidden = true;
    statusText.textContent = "";
  }

  renderSearchTimer();
  syncTimerInterval();
  renderHelperCategoryCollapse();

  clearMapFiltersButton.disabled =
    !hasSelectedMapFilters() && !hasExcludedMapFilters();
  for (const button of mapFiltersContainer.querySelectorAll(".map-filter-button")) {
    const mapId = button.dataset.mapId;
    const isActive = Boolean(mapId && settings.mapFilters[mapId]);
    button.dataset.active = String(isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  for (const button of mapFiltersContainer.querySelectorAll(".map-exclude-button")) {
    const mapId = button.dataset.mapId;
    const isActive = Boolean(mapId && settings.mapExcludeFilters[mapId]);
    button.dataset.active = String(isActive);
  }

  for (const key of FILTER_KEYS) {
    const input = filtersForm.elements.namedItem(key);
    if (input instanceof HTMLInputElement) {
      input.checked = Boolean(settings.includeFilters[key]);
    }

    const excludeButton = filtersForm.querySelector(
      `.exclude-button[data-filter="${key}"]`,
    );
    if (excludeButton instanceof HTMLButtonElement) {
      excludeButton.dataset.active = String(Boolean(settings.excludeFilters[key]));
    }
  }

  const markBotNationsRedInput = filtersForm.elements.namedItem(
    "markBotNationsRed",
  );
  if (markBotNationsRedInput instanceof HTMLInputElement) {
    markBotNationsRedInput.checked = Boolean(settings.markBotNationsRed);
  }

  const showGoldPerMinuteInput = filtersForm.elements.namedItem(
    "showGoldPerMinute",
  );
  if (showGoldPerMinuteInput instanceof HTMLInputElement) {
    showGoldPerMinuteInput.checked = Boolean(settings.showGoldPerMinute);
  }

  const showTeamGoldPerMinuteInput = filtersForm.elements.namedItem(
    "showTeamGoldPerMinute",
  );
  if (showTeamGoldPerMinuteInput instanceof HTMLInputElement) {
    showTeamGoldPerMinuteInput.checked = Boolean(settings.showTeamGoldPerMinute);
  }

  const showTopGoldPerMinuteInput = filtersForm.elements.namedItem(
    "showTopGoldPerMinute",
  );
  if (showTopGoldPerMinuteInput instanceof HTMLInputElement) {
    showTopGoldPerMinuteInput.checked = Boolean(settings.showTopGoldPerMinute);
  }

  const markHoveredAlliesGreenInput = filtersForm.elements.namedItem(
    "markHoveredAlliesGreen",
  );
  if (markHoveredAlliesGreenInput instanceof HTMLInputElement) {
    markHoveredAlliesGreenInput.checked = Boolean(
      settings.markHoveredAlliesGreen,
    );
  }

  const showTradeBalancesInput = filtersForm.elements.namedItem(
    "showTradeBalances",
  );
  if (showTradeBalancesInput instanceof HTMLInputElement) {
    showTradeBalancesInput.checked = Boolean(settings.showTradeBalances);
  }

  const fpsSaverInput = filtersForm.elements.namedItem("fpsSaver");
  if (fpsSaverInput instanceof HTMLInputElement) {
    fpsSaverInput.checked = Boolean(settings.fpsSaver);
  }

  const showAttackAmountsInput = filtersForm.elements.namedItem(
    "showAttackAmounts",
  );
  if (showAttackAmountsInput instanceof HTMLInputElement) {
    showAttackAmountsInput.checked = Boolean(settings.showAttackAmounts);
  }

  const showEconomyHeatmapInput = filtersForm.elements.namedItem(
    "showEconomyHeatmap",
  );
  if (showEconomyHeatmapInput instanceof HTMLInputElement) {
    showEconomyHeatmapInput.checked = Boolean(settings.showEconomyHeatmap);
  }

  const economyHeatmapIntensityInput = filtersForm.elements.namedItem(
    "economyHeatmapIntensity",
  );
  if (economyHeatmapIntensityInput instanceof HTMLInputElement) {
    economyHeatmapIntensityInput.value = String(settings.economyHeatmapIntensity);
  }
  if (economyHeatmapIntensityValue instanceof HTMLElement) {
    economyHeatmapIntensityValue.textContent = getEconomyHeatmapIntensityLabel(
      settings.economyHeatmapIntensity,
    );
  }

  const showExportPartnerHeatmapInput = filtersForm.elements.namedItem(
    "showExportPartnerHeatmap",
  );
  if (showExportPartnerHeatmapInput instanceof HTMLInputElement) {
    showExportPartnerHeatmapInput.checked = Boolean(settings.showExportPartnerHeatmap);
  }

  renderMapSearch();
}

function openHelperInfo(button) {
  const title = button.dataset.infoTitle || "Helper preview";
  const image = button.dataset.infoImage;
  if (!image) {
    return;
  }

  activeHelperInfoButton = button;
  helperInfoTitle.textContent = title;
  helperInfoImage.src = image;
  helperInfoImage.alt = `${title} preview`;
  helperInfoPopup.dataset.open = "true";
  helperInfoPopup.setAttribute("aria-hidden", "false");
  positionHelperInfo();
}

function closeHelperInfo() {
  activeHelperInfoButton = null;
  helperInfoPopup.dataset.open = "false";
  helperInfoPopup.setAttribute("aria-hidden", "true");
}

function positionHelperInfo() {
  if (!activeHelperInfoButton || helperInfoPopup.dataset.open !== "true") {
    return;
  }

  const buttonRect = activeHelperInfoButton.getBoundingClientRect();
  const popupRect = helperInfoPopup.getBoundingClientRect();
  const margin = 10;
  const gap = 10;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const spaceRight = viewportWidth - buttonRect.right;
  const placeLeft = spaceRight < popupRect.width + gap + margin;
  const left = placeLeft
    ? Math.max(margin, buttonRect.left - popupRect.width - gap)
    : Math.min(viewportWidth - popupRect.width - margin, buttonRect.right + gap);
  const top = Math.min(
    Math.max(margin, buttonRect.top + buttonRect.height / 2 - popupRect.height / 2),
    viewportHeight - popupRect.height - margin,
  );
  const arrowTop = Math.min(
    Math.max(18, buttonRect.top + buttonRect.height / 2 - top),
    popupRect.height - 18,
  );

  helperInfoPopup.style.setProperty("--helper-info-left", `${left}px`);
  helperInfoPopup.style.setProperty("--helper-info-top", `${top}px`);
  helperInfoPopup.style.setProperty("--helper-info-arrow-top", `${arrowTop}px`);
  helperInfoPopup.dataset.placement = placeLeft ? "left" : "right";
}

function playVersionDropEffect() {
  if (!(versionBadge instanceof HTMLElement)) {
    return;
  }

  const rect = versionBadge.getBoundingClientRect();
  const colors = ["#bbf7d0", "#7dd3fc", "#4ade80", "#fde68a"];

  for (let index = 0; index < 14; index += 1) {
    const particle = document.createElement("span");
    const x = rect.left + rect.width * (0.16 + Math.random() * 0.68);
    const y = rect.bottom - 2;
    const drift = (Math.random() - 0.5) * 54;
    const fall = 42 + Math.random() * 48;
    const delay = Math.random() * 120;
    const duration = 680 + Math.random() * 420;
    const size = 3 + Math.random() * 4;

    particle.className = "version-drop-particle";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = colors[index % colors.length];
    particle.style.setProperty("--drop-x", `${drift}px`);
    particle.style.setProperty("--drop-y", `${fall}px`);
    particle.style.animationDelay = `${delay}ms`;
    particle.style.animationDuration = `${duration}ms`;
    document.body.append(particle);

    window.setTimeout(() => {
      particle.remove();
    }, delay + duration + 80);
  }
}

dismissInstallNoticeButton.addEventListener("click", async () => {
  showInstallNotice = false;
  await chrome.storage.local.set({
    [INSTALL_NOTICE_KEY]: false,
  });
  render();
});

powerButton.addEventListener("click", async () => {
  if (powerButton.disabled) {
    return;
  }

  settings.enabled = !settings.enabled;
  settings.searchStartedAt = settings.enabled ? Date.now() : null;
  await saveSettings();
  render();
});

helpersPopoutButton?.addEventListener("click", async () => {
  settings.showFloatingHelpersPanel = !settings.showFloatingHelpersPanel;
  await saveSettings();
  render();
});

filtersForm.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.name === "markBotNationsRed") {
    settings.markBotNationsRed = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showGoldPerMinute") {
    settings.showGoldPerMinute = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showTeamGoldPerMinute") {
    settings.showTeamGoldPerMinute = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showTopGoldPerMinute") {
    settings.showTopGoldPerMinute = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "markHoveredAlliesGreen") {
    settings.markHoveredAlliesGreen = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showTradeBalances") {
    settings.showTradeBalances = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "fpsSaver") {
    settings.fpsSaver = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showAttackAmounts") {
    settings.showAttackAmounts = target.checked;
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showEconomyHeatmap") {
    settings.showEconomyHeatmap = target.checked;
    if (target.checked) {
      settings.showExportPartnerHeatmap = false;
    }
    await saveSettings();
    render();
    return;
  }

  if (target.name === "economyHeatmapIntensity") {
    settings.economyHeatmapIntensity = normalizeEconomyHeatmapIntensity(
      target.value,
    );
    await saveSettings();
    render();
    return;
  }

  if (target.name === "showExportPartnerHeatmap") {
    settings.showExportPartnerHeatmap = target.checked;
    if (target.checked) {
      settings.showEconomyHeatmap = false;
    }
    await saveSettings();
    render();
    return;
  }

  settings.includeFilters[target.name] = target.checked;
  if (target.checked) {
    settings.excludeFilters[target.name] = false;
  }

  settings = normalizeSettings(settings);
  if (!hasSelectedOptions()) {
    settings.enabled = false;
    settings.searchStartedAt = null;
  }
  await saveSettings();
  render();
});

filtersForm.addEventListener("input", (event) => {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) ||
    target.name !== "economyHeatmapIntensity" ||
    !(economyHeatmapIntensityValue instanceof HTMLElement)
  ) {
    return;
  }

  economyHeatmapIntensityValue.textContent = getEconomyHeatmapIntensityLabel(
    target.value,
  );
});

filtersForm.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const toggle = target.closest(".helper-category-toggle");
  if (!(toggle instanceof HTMLButtonElement)) {
    return;
  }

  const category = toggle.dataset.helperCategory;
  if (!category) {
    return;
  }

  settings.collapsedHelperCategories = {
    ...DEFAULT_SETTINGS.collapsedHelperCategories,
    ...settings.collapsedHelperCategories,
    [category]: !Boolean(settings.collapsedHelperCategories?.[category]),
  };
  await saveSettings();
  renderHelperCategoryCollapse();
});

filtersForm.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const infoButton = target.closest(".helper-info-button");
  if (infoButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    if (
      activeHelperInfoButton === infoButton &&
      helperInfoPopup.dataset.open === "true"
    ) {
      closeHelperInfo();
      return;
    }

    openHelperInfo(infoButton);
    return;
  }

  const button = target.closest(".exclude-button");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const filterKey = button.dataset.filter;
  if (!filterKey) {
    return;
  }

  const nextValue = !settings.excludeFilters[filterKey];
  settings.excludeFilters[filterKey] = nextValue;
  if (nextValue) {
    settings.includeFilters[filterKey] = false;
  }

  settings = normalizeSettings(settings);
  if (!hasSelectedOptions()) {
    settings.enabled = false;
    settings.searchStartedAt = null;
  }
  await saveSettings();
  render();
});

mapFiltersContainer.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest(".map-filter-button");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const mapId = button.dataset.mapId;
  if (!mapId) {
    return;
  }

  settings.mapFilters[mapId] = !settings.mapFilters[mapId];
  if (settings.mapFilters[mapId]) {
    settings.mapExcludeFilters[mapId] = false;
  }
  settings = normalizeSettings(settings);
  if (!hasSelectedOptions()) {
    settings.enabled = false;
    settings.searchStartedAt = null;
  }
  await saveSettings();
  render();
});

mapFiltersContainer.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest(".map-exclude-button");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const mapId = button.dataset.mapId;
  if (!mapId) {
    return;
  }

  settings.mapExcludeFilters[mapId] = !settings.mapExcludeFilters[mapId];
  if (settings.mapExcludeFilters[mapId]) {
    settings.mapFilters[mapId] = false;
  }
  settings = normalizeSettings(settings);
  if (!hasSelectedOptions()) {
    settings.enabled = false;
    settings.searchStartedAt = null;
  }
  await saveSettings();
  render();
});

clearMapFiltersButton.addEventListener("click", async () => {
  settings.mapFilters = createDefaultMapFilters();
  settings.mapExcludeFilters = createDefaultMapFilters();
  settings = normalizeSettings(settings);
  if (!hasSelectedOptions()) {
    settings.enabled = false;
    settings.searchStartedAt = null;
  }
  await saveSettings();
  render();
});

filtersForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

mapSearchInput.addEventListener("input", () => {
  renderMapSearch();
});

if (versionBadge instanceof HTMLElement) {
  versionBadge.addEventListener("click", () => {
    playVersionDropEffect();
  });
}

helperInfoCloseButton.addEventListener("click", () => {
  closeHelperInfo();
});

helperInfoPopup.addEventListener("click", (event) => {
  event.stopPropagation();
});

helperInfoImage.addEventListener("load", () => {
  positionHelperInfo();
});

window.addEventListener("resize", () => {
  positionHelperInfo();
});

window.addEventListener("scroll", () => {
  positionHelperInfo();
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.closest(".helper-info-popup") || target.closest(".helper-info-button")) {
    return;
  }

  closeHelperInfo();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHelperInfo();
  }
});

async function init() {
  renderMapFilterButtons();
  await loadSettings();
  chrome.storage.onChanged.addListener(handleStorageChange);
  render();
}

init().catch((error) => {
  console.error("Failed to initialize popup:", error);
});
