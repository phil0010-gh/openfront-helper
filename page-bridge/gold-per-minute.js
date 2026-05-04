// Gold-per-minute overlays, helper stat badges, and team/top income tracking.

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
    const players = context.game.playerViews?.() || [];

    let index = 0;
    for (const player of players) {
      if (!player?.isAlive?.()) {
        index += 1;
        continue;
      }

      const gold = getPlayerGoldNumber(player);
      if (!Number.isFinite(gold)) {
        index += 1;
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
      index += 1;
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
    const players = game?.playerViews?.() || [];
    const teams = new Map();

    let index = 0;
    for (const player of players) {
      if (!player?.isAlive?.()) {
        index += 1;
        continue;
      }

      const team = getPlayerTeamName(player);
      if (!team || team === "Bot") {
        index += 1;
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
      index += 1;
    }

    return Array.from(teams.values()).sort((a, b) => b.total - a.total);
  }

  function getTopGoldPerMinuteRows(game) {
    const players = game?.playerViews?.() || [];
    const rows = [];

    let index = 0;
    for (const player of players) {
      if (!player?.isAlive?.()) {
        index += 1;
        continue;
      }

      const gpm = getGoldPerMinuteForPlayer(player, index);
      if (!Number.isFinite(gpm)) {
        index += 1;
        continue;
      }

      rows.push({
        player,
        gpm,
        team: getPlayerTeamName(player),
        name: getPlayerDisplayName(player),
      });
      index += 1;
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
      teamGoldPerMinuteRenderSignature = "";
      return;
    }

    const now = Date.now();
    if (now - lastTeamGoldPerMinuteRenderAt < GOLD_PER_MINUTE_RENDER_MS) {
      teamGoldPerMinuteAnimationFrame = requestAnimationFrame(
        updateTeamGoldPerMinuteBadge,
      );
      return;
    }
    lastTeamGoldPerMinuteRenderAt = now;

    const context = getOpenFrontGameContext();
    if (!context?.game) {
      badge.dataset.visible = "false";
      teamGoldPerMinuteRenderSignature = "";
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
      const rowData = rows.map((entry) => ({
        team: entry.team,
        color: getTeamColor(entry.team, context.game),
        value: entry.trackedPlayers > 0 ? formatGoldPerMinute(entry.total) : "tracking",
      }));
      if (rows.length < 2) {
        badge.dataset.visible = "false";
        teamGoldPerMinuteRenderSignature = "";
        syncHelperStatsContainerVisibility();
        teamGoldPerMinuteAnimationFrame = requestAnimationFrame(
          updateTeamGoldPerMinuteBadge,
        );
        return;
      }

      const nextSignature = rowData
        .map((entry) => `${entry.team}|${entry.color}|${entry.value}`)
        .join(";");

      if (teamGoldPerMinuteRenderSignature !== nextSignature) {
        rowsContainer.replaceChildren(
          ...rowData.map((entry) => {
            const row = document.createElement("span");
            row.className = "openfront-helper-team-gpm-row";
            row.style.setProperty("--team-accent-color", entry.color);
            const name = document.createElement("span");
            name.className = "openfront-helper-team-gpm-name";
            name.textContent = entry.team;
            const value = document.createElement("span");
            value.className = "openfront-helper-team-gpm-value";
            value.textContent = entry.value;
            row.append(name, value);
            return row;
          }),
        );
        teamGoldPerMinuteRenderSignature = nextSignature;
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
      topGoldPerMinuteRenderSignature = "";
      return;
    }

    const now = Date.now();
    if (now - lastTopGoldPerMinuteRenderAt < GOLD_PER_MINUTE_RENDER_MS) {
      topGoldPerMinuteAnimationFrame = requestAnimationFrame(
        updateTopGoldPerMinuteBadge,
      );
      return;
    }
    lastTopGoldPerMinuteRenderAt = now;

    const context = getOpenFrontGameContext();
    if (!context?.game) {
      badge.dataset.visible = "false";
      topGoldPerMinuteRenderSignature = "";
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
      const rowData = rows.map((entry, index) => ({
        rank: String(index + 1),
        name: entry.name,
        value: formatGoldPerMinute(entry.gpm),
        color: entry.team ? getTeamColor(entry.team, context.game) : "",
      }));
      const nextSignature =
        rows.length === 0
          ? "empty"
          : rowData
              .map((entry) => `${entry.rank}|${entry.name}|${entry.color}|${entry.value}`)
              .join(";");

      if (rows.length === 0) {
        if (topGoldPerMinuteRenderSignature !== nextSignature) {
          rowsContainer.innerHTML = `<span class="openfront-helper-top-gpm-empty">Tracking player income</span>`;
          topGoldPerMinuteRenderSignature = nextSignature;
        }
      } else if (topGoldPerMinuteRenderSignature !== nextSignature) {
        rowsContainer.replaceChildren(
          ...rowData.map((entry) => {
            const row = document.createElement("span");
            row.className = "openfront-helper-top-gpm-row";
            if (entry.color) {
              row.style.setProperty("--team-accent-color", entry.color);
            } else {
              row.style.removeProperty("--team-accent-color");
            }

            const rank = document.createElement("span");
            rank.className = "openfront-helper-top-gpm-rank";
            rank.textContent = entry.rank;
            const name = document.createElement("span");
            name.className = "openfront-helper-top-gpm-name";
            name.textContent = entry.name;
            const value = document.createElement("span");
            value.className = "openfront-helper-top-gpm-value";
            value.textContent = entry.value;
            row.append(rank, name, value);
            return row;
          }),
        );
        topGoldPerMinuteRenderSignature = nextSignature;
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
      goldPerMinuteRenderSignature = "";
      return;
    }

    const now = Date.now();
    if (now - lastGoldPerMinuteRenderAt < GOLD_PER_MINUTE_RENDER_MS) {
      goldPerMinuteAnimationFrame = requestAnimationFrame(
        updateGoldPerMinuteBadge,
      );
      return;
    }
    lastGoldPerMinuteRenderAt = now;

    const overlay = getHoveredPlayerInfoOverlay();
    if (!overlay) {
      badge.dataset.visible = "false";
      goldPerMinuteRenderSignature = "";
      syncHelperStatsContainerVisibility();
      goldPerMinuteAnimationFrame = requestAnimationFrame(
        updateGoldPerMinuteBadge,
      );
      return;
    }

    const gpm = getGoldPerMinuteForPlayer(
      overlay.player,
      getPlayerSmallId(overlay.player, 0),
    );
    const team = getPlayerTeamName(overlay.player);
    const valueText = formatGoldPerMinute(gpm);
    const teamColor = team ? getTeamColor(team, overlay.game) : "";
    const teamBackground = team ? getTeamColorBackground(team, overlay.game) : "";
    const nextSignature = `${teamColor}|${teamBackground}|${valueText}`;
    if (goldPerMinuteRenderSignature === nextSignature) {
      positionHelperStatsContainer();
      badge.dataset.visible = "true";
      syncHelperStatsContainerVisibility();
      goldPerMinuteAnimationFrame = requestAnimationFrame(
        updateGoldPerMinuteBadge,
      );
      return;
    }
    goldPerMinuteRenderSignature = nextSignature;

    if (team) {
      badge.style.setProperty("--team-accent-color", teamColor);
      badge.style.setProperty("--team-border-color", teamColor);
      badge.style.setProperty("--team-bg-color", teamBackground);
    } else {
      badge.style.removeProperty("--team-accent-color");
      badge.style.removeProperty("--team-border-color");
      badge.style.removeProperty("--team-bg-color");
    }
    const value = badge.querySelector(".openfront-helper-gpm-value");
    if (value) {
      value.textContent = valueText;
    }
    positionHelperStatsContainer();
    badge.dataset.visible = "true";
    syncHelperStatsContainerVisibility();
    goldPerMinuteAnimationFrame = requestAnimationFrame(
      updateGoldPerMinuteBadge,
    );
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
      lastGoldPerMinuteRenderAt = 0;
      goldPerMinuteRenderSignature = "";
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
      lastGoldPerMinuteRenderAt = 0;
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
      lastTeamGoldPerMinuteRenderAt = 0;
      teamGoldPerMinuteRenderSignature = "";
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
      lastTeamGoldPerMinuteRenderAt = 0;
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
      lastTopGoldPerMinuteRenderAt = 0;
      topGoldPerMinuteRenderSignature = "";
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
      lastTopGoldPerMinuteRenderAt = 0;
      updateTopGoldPerMinuteBadge();
    }
  }
