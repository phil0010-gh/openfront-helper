// Hover-target nuke strike suggestions for atom and hydrogen bombs.

  const NUKE_SUGGESTION_TYPES = [
    {
      id: "atom",
      type: "Atom Bomb",
      label: "Atom",
      color: "rgba(250, 204, 21, 0.95)",
      fill: "rgba(250, 204, 21, 0.16)",
      glow: "rgba(250, 204, 21, 0.36)",
      maxRawSeeds: 72,
      maxRefineSeeds: 10,
    },
    {
      id: "hydrogen",
      type: "Hydrogen Bomb",
      label: "Hydrogen",
      color: "rgba(34, 211, 238, 0.95)",
      fill: "rgba(34, 211, 238, 0.13)",
      glow: "rgba(34, 211, 238, 0.36)",
      maxRawSeeds: 58,
      maxRefineSeeds: 8,
    },
  ];
  const NUKE_ECONOMIC_SUGGESTION = {
    id: "economic",
    label: "Economy",
    color: "rgba(74, 222, 128, 0.95)",
    fill: "rgba(74, 222, 128, 0.14)",
    glow: "rgba(74, 222, 128, 0.36)",
    maxRawSeeds: 64,
    maxRefineSeeds: 8,
  };
  const NUKE_ECONOMIC_HYDROGEN_MIN_GAIN = 500000;
  const NUKE_ECONOMIC_HYDROGEN_GAIN_RATIO = 1.2;
  const NUKE_SUGGESTION_FALLBACK_COSTS = {
    "Atom Bomb": 750000,
    "Hydrogen Bomb": 5000000,
  };
  const AUTO_NUKE_ACTION_COOLDOWN_MS = 600;
  const AUTO_NUKE_PATCH_RETRY_MS = 700;
  const AUTO_NUKE_MENU_ITEM_PREFIX = "openfront-helper-auto-nuke";
  const AUTO_NUKE_CONTEXT_MENU_ID = "openfront-helper-auto-nuke-menu";
  const AUTO_NUKE_CONTEXT_MENU_STYLE_ID = "openfront-helper-auto-nuke-menu-styles";
  const AUTO_NUKE_FOLLOWUP_PROMPT_ID = "openfront-helper-auto-nuke-followup";
  const AUTO_NUKE_FOLLOWUP_PROMPT_STYLE_ID = "openfront-helper-auto-nuke-followup-styles";
  const AUTO_NUKE_PROCESS_PANEL_ID = "openfront-helper-auto-nuke-process";
  const AUTO_NUKE_PROCESS_PANEL_STYLE_ID = "openfront-helper-auto-nuke-process-styles";
  const AUTO_NUKE_SEQUENCE_DELAY_MS = 60;
  const AUTO_NUKE_FOLLOWUP_AFTER_IMPACT_MS = 10000;
  const AUTO_NUKE_FOLLOWUP_FALLBACK_LANDING_MS = 60000;
  const AUTO_NUKE_FOLLOWUP_REMAINING_BUILDING_RATIO = 0.1;
  const AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS = 3500;
  const AUTO_NUKE_GAME_TICK_MS = 100;
  const AUTO_NUKE_MAX_SAM_BURN_SHOTS_PER_STACK = 96;
  const AUTO_NUKE_SECOND_PASS_POLL_MS = 1000;
  const AUTO_NUKE_SECOND_PASS_MAX_WAIT_MS = 8 * 60 * 1000;
  const AUTO_NUKE_SECOND_PASS_READY_SLOT_FRACTION = 0.6;
  const AUTO_NUKE_SECOND_PASS_SPREAD_MULTIPLIER = 1.65;
  const AUTO_NUKE_THIRD_PASS_READY_SLOT_FRACTION = 0.7;
  const AUTO_NUKE_THIRD_PASS_SPREAD_MULTIPLIER = 2.25;
  const AUTO_NUKE_SECOND_PASS_LAUNCH_SLOT_FRACTION = 0.58;
  const AUTO_NUKE_MAX_SAM_CLEAR_WAVES = 6;
  const AUTO_NUKE_MAX_CANDIDATES_PER_SPEC = 28;
  const AUTO_NUKE_MIN_MARGINAL_SCORE = 1;
  const AUTO_NUKE_DESTRUCTION_BUILDING_BONUS = 2500000;
  const AUTO_NUKE_DESTRUCTION_CONFIRMATION_SHOTS = 2;
  const AUTO_NUKE_DESTRUCTION_SAM_BONUS = 3500000;
  const AUTO_NUKE_DESTRUCTION_SAM_OVERSHOOT_SHOTS = 2;
  const AUTO_NUKE_INTENSITY_TIERS = [
    {
      id: "low",
      label: "Low",
      minShots: 1,
      shotFraction: 0.25,
    },
    {
      id: "medium",
      label: "Medium",
      minShots: 2,
      shotFraction: 0.55,
    },
    {
      id: "high",
      label: "High",
      minShots: 3,
      shotFraction: 1,
    },
  ];
  const AUTO_NUKE_TIER_ORDER = new Map(
    AUTO_NUKE_INTENSITY_TIERS.map((tier, index) => [tier.id, index]),
  );

  const NUKE_SUGGESTION_STRUCTURE_TYPES = [
    "City",
    "Defense Post",
    "SAM Launcher",
    "Missile Silo",
    "Port",
    "Factory",
  ];
  const AUTO_NUKE_DESTRUCTION_FOLLOWUP_STRUCTURE_TYPES = [
    "City",
    "Factory",
    "Port",
    "SAM Launcher",
    "Missile Silo",
  ];
  const NUKE_SUGGESTION_BUCKET_SIZE = 16;
  const NUKE_SUGGESTION_SAMPLE_LIMIT = 80;
  const NUKE_SUGGESTION_MAX_FINAL_CANDIDATES = 40;
  const NUKE_SUGGESTION_TILE_INFO_CACHE_MS = 2500;
  let nukeSuggestionTileInfoCache = null;
  let lastAutoNukeActionAt = 0;
  let autoNukeContextMenuInstalled = false;
  let autoNukeContextMenuParams = null;
  let autoNukeContextMenuComputeId = 0;
  let autoNukeFollowupPromptTimeout = null;
  let autoNukeProcessHideTimeout = null;
  let nextNukeSuggestionUnitObjectId = 1;
  const nukeSuggestionUnitObjectIds = new WeakMap();

  function ensureNukeSuggestionStyles() {
    if (document.getElementById(NUKE_SUGGESTION_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = NUKE_SUGGESTION_STYLE_ID;
    style.textContent = `
      #${NUKE_SUGGESTION_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-zone {
        position: fixed;
        left: var(--suggestion-x);
        top: var(--suggestion-y);
        width: var(--suggestion-diameter);
        height: var(--suggestion-diameter);
        border: 2px dashed var(--suggestion-color);
        border-radius: 50%;
        background: var(--suggestion-fill);
        box-shadow:
          0 0 18px var(--suggestion-glow),
          inset 0 0 24px var(--suggestion-fill);
        transform: translate(-50%, -50%);
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-zone[data-suggestion-status="blocked"] {
        opacity: 0.62;
        border-style: dotted;
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-zone::before,
      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-zone::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        background: var(--suggestion-color);
        box-shadow: 0 0 10px var(--suggestion-glow);
        transform: translate(-50%, -50%);
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-zone::before {
        width: 28px;
        height: 2px;
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-zone::after {
        width: 2px;
        height: 28px;
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-label {
        position: fixed;
        left: var(--suggestion-x);
        top: calc(var(--suggestion-y) - var(--suggestion-radius) - var(--suggestion-label-gap));
        padding: 4px 8px;
        border: 1px solid var(--suggestion-color);
        border-radius: 8px;
        background: rgba(7, 12, 18, 0.86);
        color: var(--suggestion-color);
        font: 900 11px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.92);
        transform: translate(-50%, -100%);
        white-space: nowrap;
      }

      #${NUKE_SUGGESTION_CONTAINER_ID} .openfront-helper-nuke-suggestion-label[data-suggestion-status="blocked"] {
        opacity: 0.72;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureNukeSuggestionContainer() {
    ensureNukeSuggestionStyles();

    let container = document.getElementById(NUKE_SUGGESTION_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = NUKE_SUGGESTION_CONTAINER_ID;
      container.setAttribute("aria-hidden", "true");
      (document.body || document.documentElement).appendChild(container);
    }
    return container;
  }

  function getNukeSuggestionMagnitude(game, unitType) {
    try {
      const magnitude = game?.config?.().nukeMagnitudes?.(unitType);
      const inner = Number(magnitude?.inner);
      const outer = Number(magnitude?.outer);
      if (Number.isFinite(inner) && Number.isFinite(outer) && outer > 0) {
        return {
          inner: Math.max(0, inner),
          outer,
        };
      }
    } catch (_error) {
      // Fall back to OpenFront defaults.
    }

    return unitType === "Hydrogen Bomb"
      ? { inner: 80, outer: 100 }
      : { inner: 12, outer: 30 };
  }

  function isNukeSuggestionTypeEnabled(game, unitType) {
    try {
      return !game?.config?.().isUnitDisabled?.(unitType);
    } catch (_error) {
      return true;
    }
  }

  function getNukeSuggestionUnitCost(game, player, unitType) {
    try {
      const cost = game?.unitInfo?.(unitType)?.cost?.(game, player);
      const numericCost = typeof cost === "bigint" ? Number(cost) : Number(cost);
      if (Number.isFinite(numericCost) && numericCost >= 0) {
        return numericCost;
      }
    } catch (_error) {
      // PlayerView does not expose every server-side cost helper dependency.
    }

    try {
      const cost = game?.config?.().unitInfo?.(unitType)?.cost?.(game, player);
      const numericCost = typeof cost === "bigint" ? Number(cost) : Number(cost);
      if (Number.isFinite(numericCost) && numericCost >= 0) {
        return numericCost;
      }
    } catch (_error) {
      // Fall back to OpenFront defaults.
    }

    return NUKE_SUGGESTION_FALLBACK_COSTS[unitType] ?? Infinity;
  }

  function isHydrogenCheaperThanFiveAtomNukes(game, player) {
    const atomCost = getNukeSuggestionUnitCost(game, player, "Atom Bomb");
    const hydrogenCost = getNukeSuggestionUnitCost(game, player, "Hydrogen Bomb");
    return hydrogenCost < atomCost * 5;
  }

  function shouldComputeNukeSuggestionSpec(game, player, spec) {
    if (!spec || !isNukeSuggestionTypeEnabled(game, spec.type)) {
      return false;
    }
    if (spec.type !== "Hydrogen Bomb") {
      return true;
    }
    return isHydrogenCheaperThanFiveAtomNukes(game, player);
  }

  function getNukeSuggestionScreenRadius(transform, screenPos, worldRadius) {
    const scale = Number(transform?.scale);
    if (Number.isFinite(scale) && scale > 0) {
      return worldRadius * scale;
    }

    try {
      const reference = transform.worldToScreenCoordinates({
        x: screenPos.worldX + worldRadius,
        y: screenPos.worldY,
      });
      return Math.hypot(reference.x - screenPos.x, reference.y - screenPos.y);
    } catch (_error) {
      return worldRadius;
    }
  }

  function getUnitTile(unit) {
    try {
      const tile = Number(unit?.tile?.());
      return Number.isFinite(tile) ? tile : null;
    } catch (_error) {
      return null;
    }
  }

  function getUnitType(unit) {
    try {
      return String(unit?.type?.() ?? unit?.data?.unitType ?? "");
    } catch (_error) {
      return "";
    }
  }

  function getUnitKey(unit) {
    try {
      const id = unit?.id?.();
      if (id !== undefined && id !== null) {
        return String(id);
      }
    } catch (_error) {
      // Fall back to the tile below.
    }

    if (unit && (typeof unit === "object" || typeof unit === "function")) {
      let objectId = nukeSuggestionUnitObjectIds.get(unit);
      if (!objectId) {
        objectId = nextNukeSuggestionUnitObjectId++;
        nukeSuggestionUnitObjectIds.set(unit, objectId);
      }
      return `object:${objectId}`;
    }

    const tile = getUnitTile(unit);
    return tile === null ? "" : `tile:${tile}`;
  }

  function getMissileTimerQueue(unit) {
    try {
      const queue = unit?.missileTimerQueue?.();
      if (Array.isArray(queue)) {
        return queue;
      }
    } catch (_error) {
      // Fall back to the UnitView data shape.
    }

    return Array.isArray(unit?.data?.missileTimerQueue)
      ? unit.data.missileTimerQueue
      : [];
  }

  function isActiveFinishedUnit(unit) {
    try {
      return Boolean(unit?.isActive?.()) && !unit?.isUnderConstruction?.();
    } catch (_error) {
      return false;
    }
  }

  function isMissileUnitReady(unit) {
    if (!isActiveFinishedUnit(unit)) {
      return false;
    }

    const level = getUnitLevel(unit);
    return getMissileTimerQueue(unit).length < level;
  }

  function getPlayerUnits(player, ...types) {
    try {
      return Array.from(player?.units?.(...types) || []);
    } catch (_error) {
      return [];
    }
  }

  function collectReadyNukeSilos(player) {
    return getPlayerUnits(player, "Missile Silo").filter(isMissileUnitReady);
  }

  function collectActiveNukeSilos(player) {
    return getPlayerUnits(player, "Missile Silo").filter(isActiveFinishedUnit);
  }

  function collectTargetSams(player) {
    return getPlayerUnits(player, "SAM Launcher").filter(isActiveFinishedUnit);
  }

  function isNukeSuggestionSamOwnerHostileToLauncher(myPlayer, player) {
    if (!myPlayer?.isPlayer?.() || !player?.isPlayer?.()) {
      return false;
    }
    if (getPlayerSmallId(myPlayer) === getPlayerSmallId(player)) {
      return false;
    }

    try {
      return !myPlayer.isFriendly?.(player) && !player.isFriendly?.(myPlayer);
    } catch (_error) {
      return true;
    }
  }

  function getPlayerBySmallIdSafe(game, smallId) {
    const numericId = Number(smallId);
    if (!Number.isFinite(numericId) || numericId <= 0) {
      return null;
    }

    try {
      const player = game?.playerBySmallID?.(numericId);
      return player?.isPlayer?.() ? player : null;
    } catch (_error) {
      return null;
    }
  }

  function collectAdjacentHostileSams(game, myPlayer, targetPlayer, tileInfo) {
    const targetId = getPlayerSmallId(targetPlayer);
    const adjacentPlayerIds = new Set();

    for (const point of tileInfo.tiles) {
      let neighbors = [];
      try {
        neighbors = game.neighbors?.(point.tile) || [];
      } catch (_error) {
        neighbors = [];
      }

      for (const neighborTile of neighbors) {
        let ownerId = 0;
        try {
          ownerId = game.ownerID(neighborTile);
        } catch (_error) {
          continue;
        }
        if (ownerId > 0 && ownerId !== targetId) {
          adjacentPlayerIds.add(ownerId);
        }
      }
    }

    const sams = [];
    const seenSamIds = new Set();
    for (const playerId of adjacentPlayerIds) {
      const player = getPlayerBySmallIdSafe(game, playerId);
      if (!isNukeSuggestionSamOwnerHostileToLauncher(myPlayer, player)) {
        continue;
      }

      for (const sam of collectTargetSams(player)) {
        const samId = getUnitKey(sam);
        if (seenSamIds.has(samId)) {
          continue;
        }
        seenSamIds.add(samId);
        sams.push(sam);
      }
    }

    return sams;
  }

  function collectRelevantSams(game, myPlayer, targetPlayer, tileInfo) {
    const sams = [];
    const seenSamIds = new Set();

    for (const sam of [
      ...collectTargetSams(targetPlayer),
      ...collectAdjacentHostileSams(game, myPlayer, targetPlayer, tileInfo),
    ]) {
      const samId = getUnitKey(sam);
      if (seenSamIds.has(samId)) {
        continue;
      }
      seenSamIds.add(samId);
      sams.push(sam);
    }

    return sams;
  }

  function collectAllHostileSams(game, myPlayer) {
    const sams = [];
    const seenSamIds = new Set();

    function addSam(sam) {
      if (!isActiveFinishedUnit(sam)) {
        return;
      }

      let owner = null;
      try {
        owner = sam?.owner?.();
      } catch (_error) {
        owner = null;
      }
      if (!isNukeSuggestionSamOwnerHostileToLauncher(myPlayer, owner)) {
        return;
      }

      const samId = getUnitKey(sam);
      if (!samId || seenSamIds.has(samId)) {
        return;
      }
      seenSamIds.add(samId);
      sams.push(sam);
    }

    try {
      for (const sam of game?.units?.("SAM Launcher") || []) {
        addSam(sam);
      }
    } catch (_error) {
      // Fall back to player views below.
    }

    if (sams.length > 0) {
      return sams;
    }

    try {
      for (const player of game?.playerViews?.() || []) {
        if (!isNukeSuggestionSamOwnerHostileToLauncher(myPlayer, player)) {
          continue;
        }
        for (const sam of collectTargetSams(player)) {
          addSam(sam);
        }
      }
    } catch (_error) {
      // No usable global player list.
    }

    return sams;
  }

  function getUnitOwner(unit) {
    try {
      return unit?.owner?.() || null;
    } catch (_error) {
      return null;
    }
  }

  function isSamOwnedByNukeTarget(baseContext, sam) {
    const owner = getUnitOwner(sam);
    return (
      owner?.isPlayer?.() &&
      getPlayerSmallId(owner) === getPlayerSmallId(baseContext.targetPlayer)
    );
  }

  function getSamStackKey(sam) {
    const tile = getUnitTile(sam);
    if (tile === null) {
      return "";
    }

    const owner = getUnitOwner(sam);
    const ownerId = getPlayerSmallId(owner);
    return `${Number.isFinite(ownerId) ? ownerId : "unknown"}:${tile}`;
  }

  function getStackedSamLevel(sams, sam) {
    const stackKey = getSamStackKey(sam);
    if (!stackKey) {
      return getUnitLevel(sam);
    }

    let stackedLevel = 0;
    for (const otherSam of sams || []) {
      if (getSamStackKey(otherSam) === stackKey) {
        stackedLevel += getUnitLevel(otherSam);
      }
    }

    return Math.max(getUnitLevel(sam), stackedLevel);
  }

  function getSamStackUnitKeys(sams, stackKey) {
    return (sams || [])
      .filter((sam) => getSamStackKey(sam) === stackKey)
      .map(getUnitKey)
      .filter(Boolean);
  }

  function collectTargetStructures(player) {
    return getPlayerUnits(player, ...NUKE_SUGGESTION_STRUCTURE_TYPES)
      .filter((unit) => {
        try {
          return Boolean(unit?.isActive?.());
        } catch (_error) {
          return false;
        }
      })
      .map((unit) => ({
        unit,
        tile: getUnitTile(unit),
        type: getUnitType(unit),
      }))
      .filter((entry) => entry.tile !== null);
  }

  function isTeamGame(game) {
    try {
      return game?.config?.().gameConfig?.().gameMode === "Team";
    } catch (_error) {
      return false;
    }
  }

  function collectTeamStructures(game, myPlayer) {
    if (!isTeamGame(game)) {
      return [];
    }

    try {
      return Array.from(game.units?.(...NUKE_SUGGESTION_STRUCTURE_TYPES) || [])
        .filter((unit) => {
          if (!isActiveFinishedUnit(unit)) {
            return false;
          }
          const owner = unit.owner?.();
          return owner?.isPlayer?.() && myPlayer?.isOnSameTeam?.(owner);
        })
        .map((unit) => ({
          tile: getUnitTile(unit),
        }))
        .filter((entry) => entry.tile !== null);
    } catch (_error) {
      return [];
    }
  }

  function collectAlliedPlayerSmallIds(game, myPlayer) {
    const allyIds = new Set();

    try {
      for (const ally of myPlayer?.allies?.() || []) {
        const allyId = getPlayerSmallId(ally);
        if (Number.isFinite(allyId)) {
          allyIds.add(allyId);
        }
      }
    } catch (_error) {
      // Fall back to scanning player views below.
    }

    try {
      for (const player of game?.playerViews?.() || []) {
        if (
          player?.isPlayer?.() &&
          getPlayerSmallId(player) !== getPlayerSmallId(myPlayer) &&
          (
            myPlayer?.isAlliedWith?.(player) ||
            player?.isAlliedWith?.(myPlayer)
          )
        ) {
          const allyId = getPlayerSmallId(player);
          if (Number.isFinite(allyId)) {
            allyIds.add(allyId);
          }
        }
      }
    } catch (_error) {
      // The direct allies list is enough when available.
    }

    return allyIds;
  }

  function collectAlliedStructures(game, allySmallIds) {
    if (!allySmallIds?.size) {
      return [];
    }

    try {
      return Array.from(game.units?.(...NUKE_SUGGESTION_STRUCTURE_TYPES) || [])
        .filter((unit) => {
          if (!isActiveFinishedUnit(unit)) {
            return false;
          }
          const owner = unit.owner?.();
          return owner?.isPlayer?.() && allySmallIds.has(getPlayerSmallId(owner));
        })
        .map((unit) => ({
          tile: getUnitTile(unit),
        }))
        .filter((entry) => entry.tile !== null);
    } catch (_error) {
      return [];
    }
  }

  function getNukeAllianceBreakThreshold(game) {
    try {
      const threshold = Number(game?.config?.().nukeAllianceBreakThreshold?.());
      return Number.isFinite(threshold) && threshold >= 0 ? threshold : 100;
    } catch (_error) {
      return 100;
    }
  }

  function isEnemyNukeSuggestionTarget(game, targetPlayer) {
    const myPlayer = game?.myPlayer?.();
    if (!myPlayer?.isPlayer?.() || !targetPlayer?.isPlayer?.()) {
      return false;
    }
    if (!targetPlayer?.isAlive?.()) {
      return false;
    }
    if (getPlayerSmallId(myPlayer) === getPlayerSmallId(targetPlayer)) {
      return false;
    }

    try {
      return !myPlayer.isFriendly?.(targetPlayer) && !targetPlayer.isFriendly?.(myPlayer);
    } catch (_error) {
      return true;
    }
  }

  function makeNukeSuggestionBucketKey(x, y, bucketSize = NUKE_SUGGESTION_BUCKET_SIZE) {
    return `${Math.floor(x / bucketSize)}:${Math.floor(y / bucketSize)}`;
  }

  function addNukeSuggestionPointToBucket(buckets, point) {
    const key = makeNukeSuggestionBucketKey(point.x, point.y);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(point);
  }

  function getNukeSuggestionPlayerTileCount(player) {
    return Math.max(0, toFiniteNumber(player?.numTilesOwned?.(), 0));
  }

  function getNukeSuggestionTileInfoCacheKey(game, targetPlayer, myPlayer, allySmallIds) {
    const allyKey = Array.from(allySmallIds || [])
      .sort((a, b) => a - b)
      .map((allyId) => {
        const ally = getPlayerBySmallIdSafe(game, allyId);
        return `${allyId}:${getNukeSuggestionPlayerTileCount(ally)}`;
      })
      .join("|");

    return [
      Number(game?.width?.()) || 0,
      Number(game?.height?.()) || 0,
      getPlayerSmallId(targetPlayer),
      getNukeSuggestionPlayerTileCount(targetPlayer),
      getPlayerSmallId(myPlayer),
      getNukeSuggestionPlayerTileCount(myPlayer),
      allyKey,
    ].join(":");
  }

  function collectTargetTileInfo(game, targetPlayer, myPlayer, allySmallIds) {
    const targetId = getPlayerSmallId(targetPlayer);
    const myPlayerId = getPlayerSmallId(myPlayer);
    const width = Number(game?.width?.());
    const height = Number(game?.height?.());
    if (
      !Number.isFinite(targetId) ||
      !Number.isFinite(myPlayerId) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return null;
    }

    const cacheKey = getNukeSuggestionTileInfoCacheKey(
      game,
      targetPlayer,
      myPlayer,
      allySmallIds,
    );
    const now = performance.now();
    if (
      nukeSuggestionTileInfoCache?.key === cacheKey &&
      now - nukeSuggestionTileInfoCache.updatedAt <=
        NUKE_SUGGESTION_TILE_INFO_CACHE_MS
    ) {
      return nukeSuggestionTileInfoCache.value;
    }

    const tiles = [];
    const buckets = new Map();
    const selfBuckets = new Map();
    const allyBuckets = new Map();
    const otherPlayerBuckets = new Map();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;

    const totalTiles = width * height;
    for (let tile = 0; tile < totalTiles; tile++) {
      let ownerId = null;
      try {
        ownerId = game.ownerID(tile);
      } catch (_error) {
        continue;
      }
      const x = game.x(tile);
      const y = game.y(tile);
      const point = { tile, x, y, ownerId };

      if (ownerId === myPlayerId) {
        addNukeSuggestionPointToBucket(selfBuckets, point);
        continue;
      }
      if (allySmallIds?.has(ownerId)) {
        addNukeSuggestionPointToBucket(allyBuckets, point);
        continue;
      }
      if (ownerId !== targetId) {
        if (ownerId > 0) {
          addNukeSuggestionPointToBucket(otherPlayerBuckets, point);
        }
        continue;
      }

      tiles.push(point);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumX += x;
      sumY += y;

      addNukeSuggestionPointToBucket(buckets, point);
    }

    if (tiles.length === 0) {
      return null;
    }

    const tileInfo = {
      tiles,
      buckets,
      selfBuckets,
      allyBuckets,
      otherPlayerBuckets,
      bbox: { minX, minY, maxX, maxY },
      centroid: {
        x: sumX / tiles.length,
        y: sumY / tiles.length,
      },
    };
    nukeSuggestionTileInfoCache = {
      key: cacheKey,
      updatedAt: now,
      value: tileInfo,
    };

    return tileInfo;
  }

  function getTileFromXY(game, x, y) {
    const tileX = Math.round(x);
    const tileY = Math.round(y);
    try {
      if (!game?.isValidCoord?.(tileX, tileY)) {
        return null;
      }
      return game.ref(tileX, tileY);
    } catch (_error) {
      return null;
    }
  }

  function addNukeSuggestionSeed(seeds, game, tile) {
    if (tile == null) {
      return;
    }

    try {
      if (!game?.isValidRef?.(tile)) {
        return;
      }
    } catch (_error) {
      return;
    }

    seeds.set(String(tile), tile);
  }

  function addNukeSuggestionSeedXY(seeds, game, x, y) {
    addNukeSuggestionSeed(seeds, game, getTileFromXY(game, x, y));
  }

  function addDensitySeeds(seeds, game, tileInfo, radius, maxSeeds) {
    const densityBucketSize = Math.max(8, Math.round(radius / 2));
    const densityBuckets = new Map();
    for (const point of tileInfo.tiles) {
      const key = makeNukeSuggestionBucketKey(point.x, point.y, densityBucketSize);
      let bucket = densityBuckets.get(key);
      if (!bucket) {
        bucket = {
          count: 0,
          sumX: 0,
          sumY: 0,
        };
        densityBuckets.set(key, bucket);
      }
      bucket.count++;
      bucket.sumX += point.x;
      bucket.sumY += point.y;
    }

    const sortedBuckets = Array.from(densityBuckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, maxSeeds);

    for (const bucket of sortedBuckets) {
      addNukeSuggestionSeedXY(
        seeds,
        game,
        bucket.sumX / bucket.count,
        bucket.sumY / bucket.count,
      );
    }
  }

  function buildNukeSuggestionSeeds(game, targetPlayer, tileInfo, structures, magnitude, spec) {
    const seeds = new Map();
    const nameLocation = targetPlayer?.nameLocation?.();
    if (nameLocation) {
      addNukeSuggestionSeedXY(seeds, game, nameLocation.x, nameLocation.y);
    }
    addNukeSuggestionSeedXY(seeds, game, tileInfo.centroid.x, tileInfo.centroid.y);
    addNukeSuggestionSeedXY(
      seeds,
      game,
      (tileInfo.bbox.minX + tileInfo.bbox.maxX) / 2,
      (tileInfo.bbox.minY + tileInfo.bbox.maxY) / 2,
    );

    const seedStructures = spec.scoreMode === "destruction"
      ? structures.filter(isPopulationOrEconomicNukeObjective)
      : structures;

    for (const structure of seedStructures) {
      addNukeSuggestionSeed(seeds, game, structure.tile);
    }

    addDensitySeeds(
      seeds,
      game,
      tileInfo,
      magnitude.outer,
      Math.max(24, Math.floor(spec.maxRawSeeds / 3)),
    );

    const sampleLimit = Math.min(NUKE_SUGGESTION_SAMPLE_LIMIT, spec.maxRawSeeds);
    const stride = Math.max(1, Math.floor(tileInfo.tiles.length / sampleLimit));
    for (let index = 0; index < tileInfo.tiles.length; index += stride) {
      addNukeSuggestionSeed(seeds, game, tileInfo.tiles[index].tile);
      if (seeds.size >= spec.maxRawSeeds + seedStructures.length + 8) {
        break;
      }
    }

    return Array.from(seeds.values());
  }

  function getCityTroopIncrease(game) {
    try {
      const increase = Number(game?.config?.().cityTroopIncrease?.());
      return Number.isFinite(increase) && increase > 0 ? increase : 250000;
    } catch (_error) {
      return 250000;
    }
  }

  function getPlayerTroopsNumber(player) {
    try {
      const troops = Number(player?.troops?.());
      return Number.isFinite(troops) && troops > 0 ? troops : 0;
    } catch (_error) {
      return 0;
    }
  }

  function getPlayerMaxTroopsNumber(game, player) {
    try {
      const maxTroops = Number(game?.config?.().maxTroops?.(player));
      if (Number.isFinite(maxTroops) && maxTroops > 0) {
        return maxTroops;
      }
    } catch (_error) {
      // Fall back to the default max-troops shape.
    }

    const tilesOwned = Math.max(0, toFiniteNumber(player?.numTilesOwned?.(), 0));
    const cityLevels = getPlayerUnits(player, "City")
      .filter((unit) => !unit?.isUnderConstruction?.())
      .map(getUnitLevel)
      .reduce((sum, level) => sum + level, 0);
    return 2 * (Math.pow(tilesOwned, 0.6) * 1000 + 50000) +
      cityLevels * getCityTroopIncrease(game);
  }

  function estimateNukePopulationLoss(game, nukeType, player, expectedTiles) {
    const troops = getPlayerTroopsNumber(player);
    if (troops <= 0 || expectedTiles <= 0) {
      return 0;
    }

    const tilesBeforeNuke = Math.max(1, toFiniteNumber(player?.numTilesOwned?.(), 1));
    if (nukeType === "MIRV Warhead") {
      try {
        return Number(
          game?.config?.().nukeDeathFactor?.(
            nukeType,
            troops,
            tilesBeforeNuke,
            getPlayerMaxTroopsNumber(game, player),
          ),
        ) || 0;
      } catch (_error) {
        return 0;
      }
    }

    const cappedTiles = Math.min(expectedTiles, tilesBeforeNuke);
    const wholeTiles = Math.floor(cappedTiles);
    const partialTile = cappedTiles - wholeTiles;
    let remainingRatio = 1;
    if (wholeTiles > 0) {
      if (tilesBeforeNuke <= 5 || tilesBeforeNuke - wholeTiles <= 4) {
        remainingRatio = 0;
      } else {
        const end = tilesBeforeNuke - wholeTiles;
        for (let offset = 0; offset < 5; offset++) {
          remainingRatio *= (end - offset) / (tilesBeforeNuke - offset);
        }
      }
    }

    if (partialTile > 0) {
      const numTilesLeft = Math.max(1, tilesBeforeNuke - wholeTiles);
      const lossRatio = Math.min(1, (5 / numTilesLeft) * partialTile);
      remainingRatio *= Math.max(0, 1 - lossRatio);
    }

    return troops * (1 - remainingRatio);
  }

  function estimateCityPopulationHit(game, context, cx, cy, outerSquared) {
    const troopRatio = Math.max(
      0,
      Math.min(
        1,
        getPlayerTroopsNumber(context.targetPlayer) /
          Math.max(1, getPlayerMaxTroopsNumber(game, context.targetPlayer)),
      ),
    );
    const cityTroopIncrease = getCityTroopIncrease(game);
    let cityPopulationHit = 0;
    let citiesHit = 0;
    const hitCityPopulationWeights = new Map();

    for (const structure of context.structures) {
      if (structure.type !== "City") {
        continue;
      }

      try {
        const sx = game.x(structure.tile);
        const sy = game.y(structure.tile);
        const dx = sx - cx;
        const dy = sy - cy;
        if (dx * dx + dy * dy < outerSquared) {
          const cityHit = getUnitLevel(structure.unit) * cityTroopIncrease * troopRatio;
          cityPopulationHit += cityHit;
          citiesHit++;
          hitCityPopulationWeights.set(getStructureImpactKey(structure), cityHit);
        }
      } catch (_error) {
        // Ignore stale unit refs.
      }
    }

    return {
      cityPopulationHit,
      citiesHit,
      hitCityPopulationWeights,
    };
  }

  function hasNukeSuggestionTrainStation(unit) {
    try {
      return Boolean(unit?.hasTrainStation?.());
    } catch (_error) {
      return false;
    }
  }

  function getEconomicStructureWeight(structure) {
    const level = getUnitLevel(structure.unit);
    const trainStationMultiplier = hasNukeSuggestionTrainStation(structure.unit) ? 1.25 : 1;

    switch (structure.type) {
      case "Factory":
        return 1400000 * level * trainStationMultiplier;
      case "Port":
        return 900000 * level * trainStationMultiplier;
      case "City":
        return 650000 * level * trainStationMultiplier;
      default:
        return 0;
    }
  }

  function getStructureImpactKey(structure) {
    const unitKey = getUnitKey(structure.unit);
    return unitKey || `${structure.type}:${structure.tile}`;
  }

  function isPopulationOrEconomicNukeObjective(structure) {
    return structure?.type === "City" || getEconomicStructureWeight(structure) > 0;
  }

  function estimateNukeEconomicImpact(context, cx, cy, outerSquared) {
    let economicImpact = 0;
    let economicStructuresHit = 0;
    const hitEconomicStructureWeights = new Map();

    for (const structure of context.structures) {
      const structureWeight = getEconomicStructureWeight(structure);
      if (structureWeight <= 0) {
        continue;
      }

      try {
        const sx = context.game.x(structure.tile);
        const sy = context.game.y(structure.tile);
        const dx = sx - cx;
        const dy = sy - cy;
        if (dx * dx + dy * dy < outerSquared) {
          economicImpact += structureWeight;
          economicStructuresHit++;
          hitEconomicStructureWeights.set(
            getStructureImpactKey(structure),
            structureWeight,
          );
        }
      } catch (_error) {
        // Ignore stale unit refs.
      }
    }

    return {
      economicImpact,
      economicStructuresHit,
      hitEconomicStructureWeights,
    };
  }

  function combineDestructionStructureWeights(
    hitEconomicStructureWeights,
    hitCityPopulationWeights,
  ) {
    const weights = new Map();
    const structureKeys = new Set([
      ...Array.from(hitEconomicStructureWeights?.keys?.() || []),
      ...Array.from(hitCityPopulationWeights?.keys?.() || []),
    ]);

    for (const structureKey of structureKeys) {
      const economicWeight = hitEconomicStructureWeights?.get?.(structureKey) || 0;
      const cityWeight = hitCityPopulationWeights?.get?.(structureKey) || 0;
      weights.set(
        structureKey,
        economicWeight + cityWeight + AUTO_NUKE_DESTRUCTION_BUILDING_BONUS,
      );
    }

    return weights;
  }

  function anyTeamStructureInBlast(game, structures, cx, cy, outerSquared) {
    for (const structure of structures) {
      try {
        const sx = game.x(structure.tile);
        const sy = game.y(structure.tile);
        const dx = sx - cx;
        const dy = sy - cy;
        if (dx * dx + dy * dy < outerSquared) {
          return true;
        }
      } catch (_error) {
        // Ignore stale unit refs.
      }
    }
    return false;
  }

  function wouldNukeSuggestionBreakAlliance(game, context, cx, cy, outerSquared) {
    if (!context.allySmallIds?.size) {
      return false;
    }

    for (const structure of context.alliedStructures) {
      try {
        const sx = game.x(structure.tile);
        const sy = game.y(structure.tile);
        const dx = sx - cx;
        const dy = sy - cy;
        if (dx * dx + dy * dy <= outerSquared) {
          return true;
        }
      } catch (_error) {
        // Ignore stale unit refs.
      }
    }

    const minBucketX = Math.floor((cx - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketX = Math.floor((cx + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const minBucketY = Math.floor((cy - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketY = Math.floor((cy + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const innerSquared = context.magnitude.inner * context.magnitude.inner;
    const counts = new Map();

    for (let by = minBucketY; by <= maxBucketY; by++) {
      for (let bx = minBucketX; bx <= maxBucketX; bx++) {
        const bucket = context.tileInfo.allyBuckets.get(`${bx}:${by}`);
        if (!bucket) {
          continue;
        }

        for (const point of bucket) {
          const dx = point.x - cx;
          const dy = point.y - cy;
          const distSquared = dx * dx + dy * dy;
          if (distSquared > outerSquared) {
            continue;
          }

          const weight = distSquared <= innerSquared ? 1 : 0.5;
          const nextCount = (counts.get(point.ownerId) || 0) + weight;
          if (nextCount > context.allianceBreakThreshold) {
            return true;
          }
          counts.set(point.ownerId, nextCount);
        }
      }
    }

    return false;
  }

  function wouldNukeSuggestionAffectLauncher(game, context, cx, cy, outerSquared) {
    const myPlayerId = getPlayerSmallId(context.myPlayer);
    if (!Number.isFinite(myPlayerId)) {
      return true;
    }

    const minBucketX = Math.floor((cx - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketX = Math.floor((cx + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const minBucketY = Math.floor((cy - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketY = Math.floor((cy + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);

    for (let by = minBucketY; by <= maxBucketY; by++) {
      for (let bx = minBucketX; bx <= maxBucketX; bx++) {
        const bucket = context.tileInfo.selfBuckets.get(`${bx}:${by}`);
        if (!bucket) {
          continue;
        }

        for (const point of bucket) {
          const dx = point.x - cx;
          const dy = point.y - cy;
          if (dx * dx + dy * dy <= outerSquared) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function wouldHydrogenNukeAffectOtherPlayers(context, cx, cy, outerSquared) {
    if (context.spec?.type !== "Hydrogen Bomb") {
      return false;
    }

    const minBucketX = Math.floor((cx - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketX = Math.floor((cx + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const minBucketY = Math.floor((cy - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketY = Math.floor((cy + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);

    for (let by = minBucketY; by <= maxBucketY; by++) {
      for (let bx = minBucketX; bx <= maxBucketX; bx++) {
        const bucketKey = `${bx}:${by}`;
        const buckets = [
          context.tileInfo.otherPlayerBuckets?.get(bucketKey),
          context.tileInfo.allyBuckets?.get(bucketKey),
          context.tileInfo.selfBuckets?.get(bucketKey),
        ].filter(Boolean);

        for (const bucket of buckets) {
          for (const point of bucket) {
            const dx = point.x - cx;
            const dy = point.y - cy;
            if (dx * dx + dy * dy <= outerSquared) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  function getOwnerAtTile(game, tile) {
    try {
      return game.owner?.(tile) ?? null;
    } catch (_error) {
      return null;
    }
  }

  function isNukeSuggestionTileAllowed(game, myPlayer, tile, magnitude, teamStructures) {
    if (game?.isSpawnImmunityActive?.()) {
      return false;
    }

    const owner = getOwnerAtTile(game, tile);
    if (owner?.isPlayer?.() && isTeamGame(game) && myPlayer?.isOnSameTeam?.(owner)) {
      return false;
    }

    if (teamStructures.length === 0) {
      return true;
    }

    const cx = game.x(tile);
    const cy = game.y(tile);
    return !anyTeamStructureInBlast(
      game,
      teamStructures,
      cx,
      cy,
      magnitude.outer * magnitude.outer,
    );
  }

  function scoreNukeSuggestionTile(game, context, tile) {
    if (
      tile == null ||
      !isNukeSuggestionTileAllowed(
        game,
        context.myPlayer,
        tile,
        context.magnitude,
        context.teamStructures,
      )
    ) {
      return null;
    }

    let cx;
    let cy;
    try {
      cx = game.x(tile);
      cy = game.y(tile);
    } catch (_error) {
      return null;
    }

    const innerSquared = context.magnitude.inner * context.magnitude.inner;
    const outerSquared = context.magnitude.outer * context.magnitude.outer;
    if (wouldNukeSuggestionAffectLauncher(game, context, cx, cy, outerSquared)) {
      return null;
    }
    if (wouldNukeSuggestionBreakAlliance(game, context, cx, cy, outerSquared)) {
      return null;
    }
    if (wouldHydrogenNukeAffectOtherPlayers(context, cx, cy, outerSquared)) {
      return null;
    }

    let expectedTilesHit = 0;
    let innerTiles = 0;
    let outerTiles = 0;

    const minBucketX = Math.floor((cx - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketX = Math.floor((cx + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const minBucketY = Math.floor((cy - context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);
    const maxBucketY = Math.floor((cy + context.magnitude.outer) / NUKE_SUGGESTION_BUCKET_SIZE);

    for (let by = minBucketY; by <= maxBucketY; by++) {
      for (let bx = minBucketX; bx <= maxBucketX; bx++) {
        const bucket = context.tileInfo.buckets.get(`${bx}:${by}`);
        if (!bucket) {
          continue;
        }

        for (const point of bucket) {
          const dx = point.x - cx;
          const dy = point.y - cy;
          const distSquared = dx * dx + dy * dy;
          if (distSquared <= innerSquared) {
            expectedTilesHit += 1;
            innerTiles++;
          } else if (distSquared <= outerSquared) {
            expectedTilesHit += 0.5;
            outerTiles++;
          }
        }
      }
    }

    let populationLoss = 0;
    let cityPopulationHit = 0;
    let citiesHit = 0;
    let economicImpact = 0;
    let economicStructuresHit = 0;
    let hitEconomicStructureWeights = new Map();
    let hitCityPopulationWeights = new Map();
    let hitDestructionStructureWeights = new Map();
    let destructionImpact = 0;

    if (context.scoreMode === "economic" || context.scoreMode === "destruction") {
      const economicResult = estimateNukeEconomicImpact(context, cx, cy, outerSquared);
      economicImpact = economicResult.economicImpact;
      economicStructuresHit = economicResult.economicStructuresHit;
      hitEconomicStructureWeights =
        economicResult.hitEconomicStructureWeights || new Map();
    }

    if (context.scoreMode !== "economic") {
      populationLoss = estimateNukePopulationLoss(
        game,
        context.spec.type,
        context.targetPlayer,
        expectedTilesHit,
      );
      const cityResult = estimateCityPopulationHit(
        game,
        context,
        cx,
        cy,
        outerSquared,
      );
      cityPopulationHit = cityResult.cityPopulationHit;
      citiesHit = cityResult.citiesHit;
      hitCityPopulationWeights = cityResult.hitCityPopulationWeights || new Map();
    }
    if (context.scoreMode === "destruction") {
      hitDestructionStructureWeights = combineDestructionStructureWeights(
        hitEconomicStructureWeights,
        hitCityPopulationWeights,
      );
      for (const weight of hitDestructionStructureWeights.values()) {
        destructionImpact += weight;
      }
      destructionImpact += populationLoss * 0.15;
    }
    let samsHit = 0;
    const hitSamKeys = [];
    for (const sam of context.targetSams || []) {
      try {
        const samTile = getUnitTile(sam);
        if (samTile === null) {
          continue;
        }
        const sx = game.x(samTile);
        const sy = game.y(samTile);
        const dx = sx - cx;
        const dy = sy - cy;
        if (dx * dx + dy * dy < outerSquared) {
          samsHit++;
          const samKey = getUnitKey(sam);
          if (samKey) {
            hitSamKeys.push(samKey);
          }
        }
      } catch (_error) {
        // Ignore stale unit refs.
      }
    }

    const totalScore =
      context.scoreMode === "economic"
        ? economicImpact
        : context.scoreMode === "destruction"
          ? destructionImpact
          : populationLoss + cityPopulationHit + economicImpact;
    if (totalScore <= 0) {
      return null;
    }

    return {
      id: context.spec.id,
      spec: context.spec,
      type: context.spec.type,
      tile,
      x: cx,
      y: cy,
      magnitude: context.magnitude,
      populationLoss,
      cityPopulationHit,
      economicImpact,
      expectedTilesHit,
      innerTiles,
      outerTiles,
      citiesHit,
      economicStructuresHit,
      hitEconomicStructureWeights: hitEconomicStructureWeights || new Map(),
      hitCityPopulationWeights: hitCityPopulationWeights || new Map(),
      hitDestructionStructureWeights: hitDestructionStructureWeights || new Map(),
      hitSamKeys,
      samsHit,
      totalScore,
    };
  }

  function refineNukeSuggestionCandidate(game, context, candidate) {
    let best = candidate;
    const steps =
      context.spec.type === "Hydrogen Bomb"
        ? [40, 20, 10, 5, 2, 1]
        : [16, 8, 4, 2, 1];
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];

    for (const step of steps) {
      for (const [dx, dy] of directions) {
        const tile = getTileFromXY(game, best.x + dx * step, best.y + dy * step);
        const next = scoreNukeSuggestionTile(game, context, tile);
        if (next && next.totalScore > best.totalScore + 0.25) {
          best = next;
        }
      }
    }

    return best;
  }

  function findClosestReadySilo(game, targetTile, silos) {
    let bestSilo = null;
    let bestDistance = Infinity;

    for (const silo of silos) {
      const siloTile = getUnitTile(silo);
      if (siloTile === null) {
        continue;
      }

      let distance = Infinity;
      try {
        distance = game.manhattanDist(siloTile, targetTile);
      } catch (_error) {
        continue;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        bestSilo = silo;
      }
    }

    return bestSilo;
  }

  function getDefaultNukeSpeed(game) {
    try {
      const speed = Number(game?.config?.().defaultNukeSpeed?.());
      return Number.isFinite(speed) && speed > 0 ? speed : 6;
    } catch (_error) {
      return 6;
    }
  }

  function getDefaultNukeTargetableRange(game) {
    try {
      const range = Number(game?.config?.().defaultNukeTargetableRange?.());
      return Number.isFinite(range) && range > 0 ? range : 150;
    } catch (_error) {
      return 150;
    }
  }

  function getDefaultSamMissileSpeed(game) {
    try {
      const speed = Number(game?.config?.().defaultSamMissileSpeed?.());
      return Number.isFinite(speed) && speed > 0 ? speed : 12;
    } catch (_error) {
      return 12;
    }
  }

  function getSamCooldown(game) {
    try {
      const cooldown = Number(game?.config?.().SAMCooldown?.());
      return Number.isFinite(cooldown) && cooldown > 0 ? cooldown : 120;
    } catch (_error) {
      return 120;
    }
  }

  function getMissileAvailabilityTick(game, unit, cooldown) {
    const level = getUnitLevel(unit);
    const queue = getMissileTimerQueue(unit);
    if (queue.length < level) {
      return 0;
    }

    const frontTime = Number(queue[0]);
    if (!Number.isFinite(frontTime)) {
      return Infinity;
    }

    const currentTick = toFiniteNumber(game?.ticks?.(), 0);
    const ticksLeft = cooldown - (currentTick - frontTime);
    return Math.max(1, Math.ceil(ticksLeft) + 1);
  }

  function getCurrentGameTick(game) {
    return Math.floor(toFiniteNumber(game?.ticks?.(), 0));
  }

  function getAutoNukeShotLaunchOffsetTicks(shotIndex) {
    return Math.max(
      0,
      Math.ceil(
        Math.max(0, Number(shotIndex) || 0) *
          AUTO_NUKE_SEQUENCE_DELAY_MS /
          AUTO_NUKE_GAME_TICK_MS,
      ),
    );
  }

  function getSamMissileSlotAvailableTicks(game, sam, cooldown) {
    const level = Math.max(1, getUnitLevel(sam));
    const queue = getMissileTimerQueue(sam)
      .map((tick) => Number(tick))
      .filter(Number.isFinite)
      .slice(0, level);
    const currentTick = getCurrentGameTick(game);
    const slots = [];

    for (let index = queue.length; index < level; index++) {
      slots.push(0);
    }

    for (const firedAtTick of queue) {
      const ticksLeft = cooldown - (currentTick - firedAtTick);
      slots.push(Math.max(1, Math.ceil(ticksLeft) + 1));
    }

    return slots.sort((a, b) => a - b);
  }

  function getSamStackMissileSlotAvailableTicks(game, sams) {
    const cooldown = getSamCooldown(game);
    const slots = [];
    for (const sam of sams || []) {
      slots.push(...getSamMissileSlotAvailableTicks(game, sam, cooldown));
    }
    return slots.sort((a, b) => a - b);
  }

  function getSamRange(game, sam, sams = null) {
    try {
      const rangeLevel = sams ? getStackedSamLevel(sams, sam) : getUnitLevel(sam);
      const range = Number(game?.config?.().samRange?.(rangeLevel));
      return Number.isFinite(range) && range > 0 ? range : 70;
    } catch (_error) {
      return 70;
    }
  }

  function getMaxSamRange(game) {
    try {
      const range = Number(game?.config?.().maxSamRange?.());
      return Number.isFinite(range) && range > 0 ? range : 150;
    } catch (_error) {
      return 150;
    }
  }

  function clampNukeSuggestionValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCubicBezierPoint(p0, p1, p2, p3, t) {
    const inverse = 1 - t;
    const inverseSquared = inverse * inverse;
    const inverseCubed = inverseSquared * inverse;
    const squared = t * t;
    const cubed = squared * t;
    return {
      x:
        inverseCubed * p0.x +
        3 * inverseSquared * t * p1.x +
        3 * inverse * squared * p2.x +
        cubed * p3.x,
      y:
        inverseCubed * p0.y +
        3 * inverseSquared * t * p1.y +
        3 * inverse * squared * p2.y +
        cubed * p3.y,
    };
  }

  function createNukeSuggestionTrajectory(
    game,
    sourceTile,
    targetTile,
    rocketDirectionUp = true,
  ) {
    const speed = getDefaultNukeSpeed(game);
    const p0 = { x: game.x(sourceTile), y: game.y(sourceTile) };
    const p3 = { x: game.x(targetTile), y: game.y(targetTile) };
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const distance = Math.hypot(dx, dy);
    const maxHeight = Math.max(distance / 3, 50);
    const mapHeight = Number(game?.height?.()) || 1;
    const heightSign = rocketDirectionUp === false ? 1 : -1;
    const p1 = {
      x: p0.x + dx / 4,
      y: clampNukeSuggestionValue(
        p0.y + dy / 4 + heightSign * maxHeight,
        0,
        mapHeight - 1,
      ),
    };
    const p2 = {
      x: p0.x + (dx * 3) / 4,
      y: clampNukeSuggestionValue(
        p0.y + (dy * 3) / 4 + heightSign * maxHeight,
        0,
        mapHeight - 1,
      ),
    };

    const points = [p0];
    let t = 0;
    let previousPoint = p0;
    let cumulativeDistance = 0;
    while (t < 1) {
      t = Math.min(t + 0.002, 1);
      const currentPoint = getCubicBezierPoint(p0, p1, p2, p3, t);
      cumulativeDistance += Math.hypot(
        currentPoint.x - previousPoint.x,
        currentPoint.y - previousPoint.y,
      );
      if (cumulativeDistance >= speed) {
        points.push(currentPoint);
        cumulativeDistance = 0;
      }
      previousPoint = currentPoint;
    }

    const finalPoint = getCubicBezierPoint(p0, p1, p2, p3, 1);
    const lastPoint = points[points.length - 1];
    if (lastPoint.x !== finalPoint.x || lastPoint.y !== finalPoint.y) {
      points.push(finalPoint);
    }

    const trajectory = [];
    for (const point of points) {
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);
      try {
        if (game.isValidCoord?.(x, y)) {
          trajectory.push(game.ref(x, y));
        }
      } catch (_error) {
        // Ignore any point that falls outside a stale map.
      }
    }

    return trajectory.length > 0 ? trajectory : [sourceTile, targetTile];
  }

  function isNukeSuggestionTrajectoryTargetable(game, sourceTile, targetTile, tile, rangeSquared) {
    try {
      return (
        game.euclideanDistSquared(tile, targetTile) < rangeSquared ||
        game.euclideanDistSquared(sourceTile, tile) < rangeSquared
      );
    } catch (_error) {
      return false;
    }
  }

  function canSamInterceptFromTrajectoryIndex(
    game,
    sourceTile,
    targetTile,
    trajectory,
    currentIndex,
    samTile,
    samRangeSquared,
    samMissileSpeed,
    targetableRangeSquared,
  ) {
    const explosionTick = trajectory.length - currentIndex;
    for (let index = currentIndex; index < trajectory.length; index++) {
      const tile = trajectory[index];
      if (
        !isNukeSuggestionTrajectoryTargetable(
          game,
          sourceTile,
          targetTile,
          tile,
          targetableRangeSquared,
        )
      ) {
        continue;
      }

      let distSquared = Infinity;
      let samTickToReach = Infinity;
      try {
        distSquared = game.euclideanDistSquared(samTile, tile);
        samTickToReach = Math.ceil(game.manhattanDist(samTile, tile) / samMissileSpeed);
      } catch (_error) {
        continue;
      }

      const nukeTickToReach = index - currentIndex;
      const tickBeforeShooting = nukeTickToReach - samTickToReach;
      if (
        distSquared <= samRangeSquared &&
        samTickToReach < explosionTick &&
        tickBeforeShooting >= 0
      ) {
        return true;
      }
    }

    return false;
  }

  function findSamInterceptionOpportunity(
    game,
    sourceTile,
    targetTile,
    trajectory,
    sam,
    sams,
    rocketDirectionUp = true,
    nukeLaunchOffsetTicks = 0,
    samAvailableAtTick = 0,
  ) {
    const samTile = getUnitTile(sam);
    if (samTile === null || !Array.isArray(trajectory) || trajectory.length === 0) {
      return null;
    }

    const targetableRange = getDefaultNukeTargetableRange(game);
    const targetableRangeSquared = targetableRange * targetableRange;
    const samMissileSpeed = getDefaultSamMissileSpeed(game);
    const samRange = getSamRange(game, sam, sams);
    const samRangeSquared = samRange * samRange;
    const detectionRange = getMaxSamRange(game) * 2;
    const detectionRangeSquared = detectionRange * detectionRange;
    const launchTick = Math.max(0, Math.floor(Number(nukeLaunchOffsetTicks) || 0));
    const availableTick = Math.max(0, Math.floor(Number(samAvailableAtTick) || 0));
    const earliestShootTick = Math.max(launchTick, availableTick);
    let best = null;

    for (let index = 0; index < trajectory.length; index++) {
      const tile = trajectory[index];
      if (
        !isNukeSuggestionTrajectoryTargetable(
          game,
          sourceTile,
          targetTile,
          tile,
          targetableRangeSquared,
        )
      ) {
        continue;
      }

      let samTickToReach = Infinity;
      let distSquared = Infinity;
      try {
        distSquared = game.euclideanDistSquared(samTile, tile);
        samTickToReach = Math.ceil(game.manhattanDist(samTile, tile) / samMissileSpeed);
      } catch (_error) {
        continue;
      }
      if (distSquared > samRangeSquared) {
        continue;
      }

      const shootTick = launchTick + index - samTickToReach;
      if (shootTick < earliestShootTick) {
        continue;
      }
      if (shootTick + samTickToReach >= launchTick + trajectory.length) {
        continue;
      }

      const nukeIndexAtShot = Math.max(
        0,
        Math.min(trajectory.length - 1, shootTick - launchTick),
      );
      try {
        if (
          game.euclideanDistSquared(samTile, trajectory[nukeIndexAtShot]) >
            detectionRangeSquared
        ) {
          continue;
        }
      } catch (_error) {
        continue;
      }

      if (!best || shootTick < best.shootTick) {
        best = {
          sam,
          samTile,
          rocketDirectionUp,
          shootTick,
          interceptTile: tile,
          trajectoryIndex: index,
        };
      }
    }

    return best;
  }

  function findInterceptingSam(
    game,
    sourceTile,
    targetTile,
    sams,
    rocketDirectionUp = true,
  ) {
    return findInterceptingSams(
      game,
      sourceTile,
      targetTile,
      sams,
      rocketDirectionUp,
    )[0] || null;
  }

  function findInterceptingSams(
    game,
    sourceTile,
    targetTile,
    sams,
    rocketDirectionUp = true,
  ) {
    if (sams.length === 0) {
      return [];
    }

    const trajectory = createNukeSuggestionTrajectory(
      game,
      sourceTile,
      targetTile,
      rocketDirectionUp,
    );
    const samCooldown = getSamCooldown(game);
    const interceptingSams = [];

    for (const sam of sams) {
      const samTile = getUnitTile(sam);
      if (samTile === null) {
        continue;
      }

      const availableAt = getMissileAvailabilityTick(game, sam, samCooldown);
      if (!Number.isFinite(availableAt)) {
        continue;
      }

      const opportunity = findSamInterceptionOpportunity(
        game,
        sourceTile,
        targetTile,
        trajectory,
        sam,
        sams,
        rocketDirectionUp,
        0,
        availableAt,
      );
      if (opportunity) {
        interceptingSams.push(sam);
      }
    }

    return interceptingSams;
  }

  function getInterceptingSamsWeight(sams) {
    const stackWeights = new Map();

    for (const sam of sams || []) {
      const stackKey = getSamStackKey(sam) || getUnitKey(sam);
      if (!stackKey) {
        continue;
      }
      stackWeights.set(stackKey, (stackWeights.get(stackKey) || 0) + getUnitLevel(sam));
    }

    return Array.from(stackWeights.values())
      .reduce((sum, stackWeight) => sum + stackWeight, 0);
  }

  function chooseBestNukeRocketDirection(game, sourceTile, targetTile, sams) {
    const upSams = findInterceptingSams(game, sourceTile, targetTile, sams, true);
    const downSams = findInterceptingSams(game, sourceTile, targetTile, sams, false);
    const upWeight = getInterceptingSamsWeight(upSams);
    const downWeight = getInterceptingSamsWeight(downSams);

    if (downWeight < upWeight) {
      return {
        rocketDirectionUp: false,
        interceptingSams: downSams,
        interceptingSamWeight: downWeight,
      };
    }

    return {
      rocketDirectionUp: true,
      interceptingSams: upSams,
      interceptingSamWeight: upWeight,
    };
  }

  function dedupeNukeSuggestionCandidates(candidates) {
    const byTile = new Map();
    for (const candidate of candidates) {
      const existing = byTile.get(candidate.tile);
      if (!existing || candidate.totalScore > existing.totalScore) {
        byTile.set(candidate.tile, candidate);
      }
    }
    return Array.from(byTile.values()).sort((a, b) => b.totalScore - a.totalScore);
  }

  function computeNukeCandidatesForType(game, baseContext, spec, limit) {
    const magnitude = getNukeSuggestionMagnitude(game, spec.type);
    const context = {
      ...baseContext,
      game,
      magnitude,
      spec,
      scoreMode: spec.scoreMode || "population",
    };
    const seeds = buildNukeSuggestionSeeds(
      game,
      context.targetPlayer,
      context.tileInfo,
      context.structures,
      magnitude,
      spec,
    );

    const rawCandidates = [];
    for (const seed of seeds) {
      const candidate = scoreNukeSuggestionTile(game, context, seed);
      if (candidate) {
        rawCandidates.push(candidate);
      }
    }

    rawCandidates.sort((a, b) => b.totalScore - a.totalScore);
    const refinedCandidates = rawCandidates.slice(0, spec.maxRefineSeeds);
    for (const candidate of refinedCandidates) {
      rawCandidates.push(refineNukeSuggestionCandidate(game, context, candidate));
    }

    const candidates = dedupeNukeSuggestionCandidates(rawCandidates).slice(
      0,
      limit || NUKE_SUGGESTION_MAX_FINAL_CANDIDATES,
    );
    const candidatesWithSource = [];

    for (const candidate of candidates) {
      const sourceSilo = findClosestReadySilo(game, candidate.tile, context.readySilos);
      if (!sourceSilo) {
        continue;
      }

      const sourceTile = getUnitTile(sourceSilo);
      if (sourceTile === null) {
        continue;
      }

      const directionPlan = chooseBestNukeRocketDirection(
        game,
        sourceTile,
        candidate.tile,
        context.targetSams,
      );
      const interceptingSam = directionPlan.interceptingSams[0] || null;
      const candidateWithSource = {
        ...candidate,
        sourceTile,
        rocketDirectionUp: directionPlan.rocketDirectionUp,
        interceptingSamTile: getUnitTile(interceptingSam),
        intercepted: Boolean(interceptingSam),
      };
      candidatesWithSource.push(candidateWithSource);
    }

    return candidatesWithSource;
  }

  function computeNukeSuggestionForType(game, baseContext, spec) {
    const candidates = computeNukeCandidatesForType(
      game,
      baseContext,
      spec,
      NUKE_SUGGESTION_MAX_FINAL_CANDIDATES,
    );
    return (
      candidates.find((candidate) => !candidate.intercepted) ||
      candidates[0] ||
      null
    );
  }

  function computeEconomicNukeSuggestion(game, baseContext) {
    const atomSpec = NUKE_SUGGESTION_TYPES.find((spec) => spec.id === "atom");
    const hydrogenSpec = NUKE_SUGGESTION_TYPES.find((spec) => spec.id === "hydrogen");

    function computeForSpec(spec) {
      if (!shouldComputeNukeSuggestionSpec(game, baseContext.myPlayer, spec)) {
        return null;
      }

      return computeNukeSuggestionForType(game, baseContext, {
        ...NUKE_ECONOMIC_SUGGESTION,
        id: `economic-${spec.id}`,
        label: spec.id === "hydrogen" ? "Eco hydrogen" : "Eco atom",
        type: spec.type,
        sourceLabel: spec.label,
        maxRawSeeds: Math.min(
          NUKE_ECONOMIC_SUGGESTION.maxRawSeeds,
          spec.maxRawSeeds,
        ),
        maxRefineSeeds: Math.min(
          NUKE_ECONOMIC_SUGGESTION.maxRefineSeeds,
          spec.maxRefineSeeds,
        ),
        scoreMode: "economic",
      });
    }

    const atomCandidate = computeForSpec(atomSpec);
    const hydrogenCandidate = computeForSpec(hydrogenSpec);
    const suggestions = [];
    if (atomCandidate) {
      suggestions.push(atomCandidate);
    }

    if (!hydrogenCandidate) {
      return suggestions;
    }
    if (!atomCandidate) {
      return [hydrogenCandidate];
    }

    const hydrogenAvoidsInterception =
      atomCandidate.intercepted && !hydrogenCandidate.intercepted;
    const hydrogenExtraScore = hydrogenCandidate.totalScore - atomCandidate.totalScore;
    const hydrogenIsMeaningfullyBetter =
      hydrogenExtraScore >= NUKE_ECONOMIC_HYDROGEN_MIN_GAIN &&
      hydrogenCandidate.totalScore >=
        atomCandidate.totalScore * NUKE_ECONOMIC_HYDROGEN_GAIN_RATIO;

    if (hydrogenAvoidsInterception || hydrogenIsMeaningfullyBetter) {
      suggestions.push(hydrogenCandidate);
    }

    return suggestions;
  }

  function buildNukeSuggestionBaseContext(game, targetPlayer) {
    const myPlayer = game?.myPlayer?.();
    if (!myPlayer?.isPlayer?.() || !isEnemyNukeSuggestionTarget(game, targetPlayer)) {
      return null;
    }

    const readySilos = collectReadyNukeSilos(myPlayer);
    if (readySilos.length === 0) {
      return null;
    }

    const allySmallIds = collectAlliedPlayerSmallIds(game, myPlayer);
    const tileInfo = collectTargetTileInfo(game, targetPlayer, myPlayer, allySmallIds);
    if (!tileInfo) {
      return null;
    }

    return {
      myPlayer,
      targetPlayer,
      tileInfo,
      readySilos,
      targetSams: collectRelevantSams(game, myPlayer, targetPlayer, tileInfo),
      structures: collectTargetStructures(targetPlayer),
      teamStructures: collectTeamStructures(game, myPlayer),
      allySmallIds,
      alliedStructures: collectAlliedStructures(game, allySmallIds),
      allianceBreakThreshold: getNukeAllianceBreakThreshold(game),
    };
  }

  function computeNukeSuggestions(game, targetPlayer, options = null) {
    const myPlayer = game?.myPlayer?.();
    const baseContext = buildNukeSuggestionBaseContext(game, targetPlayer);
    if (!baseContext) {
      return [];
    }

    const requestedMode = options?.mode || "all";
    const includePopulation =
      requestedMode === "all" || requestedMode === "population";
    const includeEconomic =
      requestedMode === "all" || requestedMode === "economic";
    const populationSuggestions = includePopulation
      ? NUKE_SUGGESTION_TYPES
        .filter((spec) => shouldComputeNukeSuggestionSpec(game, myPlayer, spec))
        .map((spec) => computeNukeSuggestionForType(game, baseContext, spec))
        .filter(Boolean)
      : [];
    const economicSuggestions = includeEconomic
      ? computeEconomicNukeSuggestion(game, baseContext)
      : [];

    return [...populationSuggestions, ...economicSuggestions];
  }

  function formatNukeSuggestionPopulation(value) {
    const rounded = Math.round(value);
    if (rounded >= 1_000_000) {
      return `${(rounded / 1_000_000).toFixed(1)}M`;
    }
    if (rounded >= 1000) {
      return `${(rounded / 1000).toFixed(1)}k`;
    }
    return String(rounded);
  }

  function formatNukeSuggestionLabel(result) {
    if (result.intercepted) {
      return `${result.spec.label}: SAM covered`;
    }

    if (result.spec.scoreMode === "economic") {
      const parts = [
        `${result.spec.label}: ${formatNukeSuggestionPopulation(result.totalScore)} econ`,
      ];
      if (result.economicStructuresHit > 0) {
        parts.push(`${result.economicStructuresHit} structures`);
      }
      return parts.join(", ");
    }

    const parts = [
      `${result.spec.label}: ${formatNukeSuggestionPopulation(result.totalScore)} pop`,
    ];
    if (result.citiesHit > 0) {
      parts.push(`${result.citiesHit} cities`);
    }
    return parts.join(", ");
  }

  function getNukeSuggestionSignature(game, targetPlayer) {
    const myPlayer = game?.myPlayer?.();
    const targetId = getPlayerSmallId(targetPlayer);
    const myId = getPlayerSmallId(myPlayer);
    const tickBucket = Math.floor(toFiniteNumber(game?.ticks?.(), 0) / 10);
    const siloState = collectReadyNukeSilos(myPlayer)
      .map((unit) => `${unit.id?.()}:${getUnitTile(unit)}:${getUnitLevel(unit)}:${getMissileTimerQueue(unit).join(",")}`)
      .join("|");
    const samState = collectTargetSams(targetPlayer)
      .map((unit) => `${unit.id?.()}:${getUnitTile(unit)}:${getUnitLevel(unit)}:${getMissileTimerQueue(unit).join(",")}`)
      .join("|");
    const tilesOwned = toFiniteNumber(targetPlayer?.numTilesOwned?.(), 0);

    return `${myId}:${targetId}:${tickBucket}:${tilesOwned}:${siloState}:${samState}`;
  }

  function renderNukeSuggestions(container, game, transform, results) {
    const activeIds = new Set();

    for (const result of results) {
      let screenPos = null;
      try {
        screenPos = transform.worldToScreenCoordinates({ x: result.x, y: result.y });
      } catch (_error) {
        screenPos = null;
      }

      if (!Number.isFinite(screenPos?.x) || !Number.isFinite(screenPos?.y)) {
        continue;
      }

      const radius = Math.max(
        12,
        getNukeSuggestionScreenRadius(
          transform,
          { ...screenPos, worldX: result.x, worldY: result.y },
          result.magnitude.outer,
        ),
      );
      if (
        screenPos.x < -radius - 220 ||
        screenPos.y < -radius - 220 ||
        screenPos.x > window.innerWidth + radius + 220 ||
        screenPos.y > window.innerHeight + radius + 220
      ) {
        continue;
      }

      const markerId = result.id;
      activeIds.add(markerId);
      let zone = container.querySelector(
        `.openfront-helper-nuke-suggestion-zone[data-suggestion-id="${escapeCssIdentifier(markerId)}"]`,
      );
      if (!zone) {
        zone = document.createElement("div");
        zone.className = "openfront-helper-nuke-suggestion-zone";
        zone.dataset.suggestionId = markerId;
        container.appendChild(zone);
      }

      let label = container.querySelector(
        `.openfront-helper-nuke-suggestion-label[data-suggestion-id="${escapeCssIdentifier(markerId)}"]`,
      );
      if (!label) {
        label = document.createElement("div");
        label.className = "openfront-helper-nuke-suggestion-label";
        label.dataset.suggestionId = markerId;
        container.appendChild(label);
      }

      const status = result.intercepted ? "blocked" : "active";
      for (const element of [zone, label]) {
        element.dataset.suggestionStatus = status;
        element.style.setProperty("--suggestion-x", `${screenPos.x}px`);
        element.style.setProperty("--suggestion-y", `${screenPos.y}px`);
        element.style.setProperty("--suggestion-radius", `${radius}px`);
        element.style.setProperty("--suggestion-diameter", `${radius * 2}px`);
        element.style.setProperty("--suggestion-color", result.spec.color);
        element.style.setProperty("--suggestion-fill", result.spec.fill);
        element.style.setProperty("--suggestion-glow", result.spec.glow);
        element.style.setProperty(
          "--suggestion-label-gap",
          result.id.startsWith("economic")
            ? "22px"
            : result.id === "hydrogen" ? "16px" : "10px",
        );
      }
      label.textContent = formatNukeSuggestionLabel(result);
    }

    for (const marker of container.querySelectorAll("[data-suggestion-id]")) {
      if (!activeIds.has(marker.dataset.suggestionId || "")) {
        marker.remove();
      }
    }
  }

  function clearNukeSuggestionState(container = null) {
    currentNukeSuggestionResults = [];
    lastNukeSuggestionSignature = "";
    lastNukeSuggestionComputedAt = 0;
    nukeSuggestionTileInfoCache = null;
    container?.replaceChildren();
  }

  function isAutoNukeRadialTarget(params) {
    return Boolean(
      autoNukeEnabled &&
      params?.game &&
      params?.myPlayer?.isPlayer?.() &&
      isEnemyNukeSuggestionTarget(params.game, params.selected),
    );
  }

  function hasAutoNukeBuildTypeAvailable(game, player) {
    return NUKE_SUGGESTION_TYPES.some((spec) =>
      shouldComputeNukeSuggestionSpec(game, player, spec),
    );
  }

  function isAutoNukeRadialItemDisabled(params) {
    if (!isAutoNukeRadialTarget(params)) {
      return true;
    }

    if (!hasAutoNukeBuildTypeAvailable(params.game, params.myPlayer)) {
      return true;
    }

    return collectReadyNukeSilos(params.myPlayer).length === 0;
  }

  function selectAutoNukeCandidate(game, targetPlayer, mode) {
    const candidates = computeNukeSuggestions(game, targetPlayer, { mode }).filter(
      (candidate) => !candidate.intercepted,
    );
    const matchingCandidates = candidates.filter((candidate) => {
      const isEconomic = candidate.spec?.scoreMode === "economic";
      return mode === "economic" ? isEconomic : !isEconomic;
    });

    matchingCandidates.sort((a, b) => b.totalScore - a.totalScore);
    return matchingCandidates[0] || null;
  }

  function getReadyNukeSiloSlotCount(player) {
    return collectActiveNukeSilos(player)
      .reduce((sum, silo) => {
        const availableSlots = getUnitLevel(silo) - getMissileTimerQueue(silo).length;
        return sum + Math.max(0, availableSlots);
      }, 0);
  }

  function getTotalNukeSiloSlotCount(player) {
    return collectActiveNukeSilos(player)
      .reduce((sum, silo) => sum + Math.max(0, getUnitLevel(silo)), 0);
  }

  function getAutoNukeMinimumAvailableCost(game, player) {
    const costs = NUKE_SUGGESTION_TYPES
      .filter(
        (spec) =>
          spec.type !== "Hydrogen Bomb" &&
          isNukeSuggestionTypeEnabled(game, spec.type),
      )
      .map((spec) => getNukeSuggestionUnitCost(game, player, spec.type))
      .filter((cost) => Number.isFinite(cost) && cost > 0);
    return costs.length > 0 ? Math.min(...costs) : Infinity;
  }

  function getAutoNukeCandidateSpecs(game, player, mode) {
    const baseSpecs = NUKE_SUGGESTION_TYPES.filter(
      (spec) =>
        spec.type !== "Hydrogen Bomb" &&
        isNukeSuggestionTypeEnabled(game, spec.type),
    );

    if (mode === "population") {
      return baseSpecs;
    }

    if (mode === "destruction" || mode === "sams") {
      return baseSpecs.map((spec) => ({
        ...spec,
        id: `${mode}-${spec.id}`,
        label: mode === "sams" ? `SAM ${spec.label}` : `Destroy ${spec.label}`,
        scoreMode: "destruction",
      }));
    }

    return baseSpecs.map((spec) => ({
      ...NUKE_ECONOMIC_SUGGESTION,
      id: `economic-${spec.id}`,
      label: spec.id === "hydrogen" ? "Eco hydrogen" : "Eco atom",
      type: spec.type,
      sourceLabel: spec.label,
      maxRawSeeds: Math.min(
        NUKE_ECONOMIC_SUGGESTION.maxRawSeeds,
        spec.maxRawSeeds,
      ),
      maxRefineSeeds: Math.min(
        NUKE_ECONOMIC_SUGGESTION.maxRefineSeeds,
        spec.maxRefineSeeds,
      ),
      scoreMode: "economic",
    }));
  }

  function scoreAutoNukeSamClearCandidate(game, baseContext, spec, sam, unlockScore) {
    const samTile = getUnitTile(sam);
    if (samTile === null) {
      return null;
    }

    const magnitude = getNukeSuggestionMagnitude(game, spec.type);
    if (
      !isNukeSuggestionTileAllowed(
        game,
        baseContext.myPlayer,
        samTile,
        magnitude,
        baseContext.teamStructures,
      )
    ) {
      return null;
    }

    let cx;
    let cy;
    try {
      cx = game.x(samTile);
      cy = game.y(samTile);
    } catch (_error) {
      return null;
    }

    const outerSquared = magnitude.outer * magnitude.outer;
    const context = {
      ...baseContext,
      game,
      magnitude,
      spec,
      scoreMode: "sam-clear",
    };
    if (wouldNukeSuggestionAffectLauncher(game, context, cx, cy, outerSquared)) {
      return null;
    }
    if (wouldNukeSuggestionBreakAlliance(game, context, cx, cy, outerSquared)) {
      return null;
    }
    if (wouldHydrogenNukeAffectOtherPlayers(context, cx, cy, outerSquared)) {
      return null;
    }

    const hitSamKeys = [];
    for (const targetSam of baseContext.targetSams || []) {
      const targetSamTile = getUnitTile(targetSam);
      if (targetSamTile === null) {
        continue;
      }

      try {
        const dx = game.x(targetSamTile) - cx;
        const dy = game.y(targetSamTile) - cy;
        if (dx * dx + dy * dy <= outerSquared) {
          const samKey = getUnitKey(targetSam);
          if (samKey) {
            hitSamKeys.push(samKey);
          }
        }
      } catch (_error) {
        // Ignore stale SAM refs.
      }
    }

    const samKey = getUnitKey(sam);
    if (!samKey || !hitSamKeys.includes(samKey)) {
      return null;
    }
    const samStackKey = getSamStackKey(sam) || samKey;
    const samClearStackSamKeys = getSamStackUnitKeys(
      baseContext.targetSams,
      samStackKey,
    );

    const sourceSilo = findClosestReadySilo(game, samTile, baseContext.readySilos);
    const sourceTile = getUnitTile(sourceSilo);
    if (sourceTile === null) {
      return null;
    }

    const directionPlan = chooseBestNukeRocketDirection(
      game,
      sourceTile,
      samTile,
      baseContext.targetSams,
    );
    const samClearSpec = {
      ...spec,
      id: `sam-clear-${spec.id}`,
      label: "Clear SAM",
      scoreMode: "sam-clear",
    };
    const interceptingSam = directionPlan.interceptingSams[0] || null;

    return {
      id: `sam-clear-${samKey}-${spec.id}`,
      spec: samClearSpec,
      type: spec.type,
      tile: samTile,
      x: cx,
      y: cy,
      magnitude,
      populationLoss: 0,
      cityPopulationHit: 0,
      economicImpact: 0,
      expectedTilesHit: 0,
      innerTiles: 0,
      outerTiles: 0,
      citiesHit: 0,
      economicStructuresHit: 0,
      hitEconomicStructureWeights: new Map(),
      hitCityPopulationWeights: new Map(),
      hitDestructionStructureWeights: new Map(),
      hitSamKeys,
      samsHit: hitSamKeys.length,
      totalScore: Math.max(1, unlockScore * 0.28),
      sourceTile,
      rocketDirectionUp: directionPlan.rocketDirectionUp,
      interceptingSamTile: getUnitTile(interceptingSam),
      intercepted: Boolean(interceptingSam),
      isSamClear: true,
      samClearStackKey: samStackKey,
      samClearStackSamKeys:
        samClearStackSamKeys.length > 0 ? samClearStackSamKeys : [samKey],
      samClearOwnedByTarget: isSamOwnedByNukeTarget(baseContext, sam),
    };
  }

  function isAutoNukeBurnStructureForMode(structure, mode) {
    if (structure?.tile == null) {
      return false;
    }
    if (mode === "destruction" || mode === "sams") {
      return structure.type === "City" || getEconomicStructureWeight(structure) > 0;
    }
    if (mode === "economic") {
      return getEconomicStructureWeight(structure) > 0;
    }
    return structure.type === "City";
  }

  function getAutoNukeBurnStructureFallbackScore(structure, mode) {
    if (mode === "destruction" || mode === "sams") {
      return (structure.type === "City" ? getUnitLevel(structure.unit) * 650000 : 0) +
        getEconomicStructureWeight(structure);
    }
    if (mode === "economic") {
      return getEconomicStructureWeight(structure);
    }
    return structure.type === "City" ? getUnitLevel(structure.unit) : 0;
  }

  function scoreAutoNukeTargetBuildingBurnCandidate(
    game,
    baseContext,
    spec,
    sam,
    unlockScore,
    mode,
  ) {
    const samTile = getUnitTile(sam);
    const samKey = getUnitKey(sam);
    if (samTile === null || !samKey) {
      return null;
    }

    const relevantStructures = baseContext.structures
      .filter((structure) => isAutoNukeBurnStructureForMode(structure, mode))
      .sort((a, b) => {
        let distanceA = Infinity;
        let distanceB = Infinity;
        try {
          distanceA = game.manhattanDist(samTile, a.tile);
          distanceB = game.manhattanDist(samTile, b.tile);
        } catch (_error) {
          // Keep invalid stale refs at the end.
        }
        return distanceA - distanceB ||
          getAutoNukeBurnStructureFallbackScore(b, mode) -
            getAutoNukeBurnStructureFallbackScore(a, mode);
      });

    for (const structure of relevantStructures) {
      const targetTile = structure.tile;
      const magnitude = getNukeSuggestionMagnitude(game, spec.type);
      if (
        !isNukeSuggestionTileAllowed(
          game,
          baseContext.myPlayer,
          targetTile,
          magnitude,
          baseContext.teamStructures,
        )
      ) {
        continue;
      }

      let cx;
      let cy;
      try {
        cx = game.x(targetTile);
        cy = game.y(targetTile);
      } catch (_error) {
        continue;
      }

      const outerSquared = magnitude.outer * magnitude.outer;
      const context = {
        ...baseContext,
        game,
        magnitude,
        spec,
        scoreMode: "sam-burn-building",
      };
      if (wouldNukeSuggestionAffectLauncher(game, context, cx, cy, outerSquared)) {
        continue;
      }
      if (wouldNukeSuggestionBreakAlliance(game, context, cx, cy, outerSquared)) {
        continue;
      }
      if (wouldHydrogenNukeAffectOtherPlayers(context, cx, cy, outerSquared)) {
        continue;
      }

      const sourceSilo = findClosestReadySilo(
        game,
        targetTile,
        baseContext.readySilos,
      );
      const sourceTile = getUnitTile(sourceSilo);
      if (sourceTile === null) {
        continue;
      }

      const directionPlan = chooseBestNukeRocketDirection(
        game,
        sourceTile,
        targetTile,
        baseContext.targetSams,
      );
      const interceptsBurn = directionPlan.interceptingSams
        .some((interceptingSam) => getUnitKey(interceptingSam) === samKey);
      if (!interceptsBurn) {
        continue;
      }

      const burnSpec = {
        ...spec,
        id: `sam-burn-${spec.id}`,
        label: "Burn SAM",
        scoreMode: "sam-burn-building",
      };

      return {
        id: `sam-burn-${samKey}-${mode}-${targetTile}-${spec.id}`,
        spec: burnSpec,
        type: spec.type,
        tile: targetTile,
        x: cx,
        y: cy,
        magnitude,
        populationLoss: 0,
        cityPopulationHit: 0,
        economicImpact: 0,
        expectedTilesHit: 0,
        innerTiles: 0,
        outerTiles: 0,
        citiesHit: 0,
        economicStructuresHit: 0,
        hitEconomicStructureWeights: new Map(),
        hitCityPopulationWeights: new Map(),
        hitDestructionStructureWeights: new Map(),
        hitSamKeys: [],
        samsHit: 0,
        totalScore: Math.max(1, unlockScore * 0.08),
        sourceTile,
        rocketDirectionUp: directionPlan.rocketDirectionUp,
        interceptingSamTile: samTile,
        intercepted: true,
        isSamBurnBuilding: true,
        samClearOwnedByTarget: false,
      };
    }

    return null;
  }

  function getAutoNukeSamBurnSpec(game, player) {
    const atomSpec = NUKE_SUGGESTION_TYPES.find((spec) => spec.id === "atom");
    if (atomSpec && isNukeSuggestionTypeEnabled(game, atomSpec.type)) {
      return atomSpec;
    }

    return NUKE_SUGGESTION_TYPES.find(
      (spec) =>
        spec.type !== "Hydrogen Bomb" &&
        isNukeSuggestionTypeEnabled(game, spec.type),
    ) || null;
  }

  function addAutoNukeSamClearCandidates(game, baseContext, specs, candidates, mode) {
    if (!specs.length) {
      return;
    }

    const samUnlockScores = new Map();
    const samsByKey = new Map();
    if (candidates.length > 0) {
      for (const candidate of candidates) {
        if (candidate.sourceTile == null) {
          continue;
        }

        for (const sam of findInterceptingSams(
          game,
          candidate.sourceTile,
          candidate.tile,
          baseContext.targetSams,
          candidate.rocketDirectionUp,
        )) {
          const samKey = getUnitKey(sam);
          if (!samKey) {
            continue;
          }
          samsByKey.set(samKey, sam);
          samUnlockScores.set(
            samKey,
            (samUnlockScores.get(samKey) || 0) + candidate.totalScore,
          );
        }
      }
    }

    const burnSpec = getAutoNukeSamBurnSpec(game, baseContext.myPlayer);
    if (!burnSpec) {
      return;
    }

    if (mode === "destruction" || mode === "sams") {
      const seenTargetSamStacks = new Set();
      for (const sam of baseContext.targetSams || []) {
        if (!isSamOwnedByNukeTarget(baseContext, sam)) {
          continue;
        }
        const stackKey = getSamStackKey(sam) || getUnitKey(sam);
        if (!stackKey || seenTargetSamStacks.has(stackKey)) {
          continue;
        }
        seenTargetSamStacks.add(stackKey);
        const stackSams = (baseContext.targetSams || []).filter(
          (stackSam) => getSamStackKey(stackSam) === stackKey,
        );
        const stackLevel = getSamStackInterceptionCapacity(
          game,
          stackSams.length > 0 ? stackSams : [sam],
        );
        const samKey = getUnitKey(sam);
        if (samKey) {
          samsByKey.set(samKey, sam);
          samUnlockScores.set(
            samKey,
            Math.max(
              samUnlockScores.get(samKey) || 0,
              AUTO_NUKE_DESTRUCTION_SAM_BONUS * Math.max(1, stackLevel),
            ),
          );
        }
      }
    }

    for (const [samKey, unlockScore] of samUnlockScores) {
      const sam = samsByKey.get(samKey);
      if (!isSamOwnedByNukeTarget(baseContext, sam)) {
        continue;
      }
      const clearCandidate = scoreAutoNukeSamClearCandidate(
        game,
        baseContext,
        burnSpec,
        sam,
        unlockScore,
      );
      if (clearCandidate) {
        candidates.push(clearCandidate);
      }
    }
  }

  function computeAutoNukeCandidatePool(game, targetPlayer, mode, options = null) {
    const baseContext = buildNukeSuggestionBaseContext(game, targetPlayer);
    if (!baseContext) {
      return {
        baseContext: null,
        candidates: [],
      };
    }

    const autoSams = collectAllHostileSams(game, baseContext.myPlayer);
    const autoContext = {
      ...baseContext,
      targetSams: autoSams.length > 0 ? autoSams : baseContext.targetSams,
      readySilos: options?.includeCoolingSilos
        ? collectActiveNukeSilos(baseContext.myPlayer)
        : baseContext.readySilos,
    };
    const candidates = [];
    const specs = getAutoNukeCandidateSpecs(game, autoContext.myPlayer, mode);
    for (const spec of specs) {
      candidates.push(
        ...computeNukeCandidatesForType(
          game,
          autoContext,
          spec,
          AUTO_NUKE_MAX_CANDIDATES_PER_SPEC,
        ),
      );
    }
    addAutoNukeSamClearCandidates(game, autoContext, specs, candidates, mode);

    candidates.sort((a, b) => b.totalScore - a.totalScore);
    return {
      baseContext: autoContext,
      candidates,
    };
  }

  function getSamInterceptionCapacity(game, sam) {
    const readySlots = Math.max(0, getUnitLevel(sam) - getMissileTimerQueue(sam).length);
    if (readySlots > 0) {
      return readySlots;
    }

    const availableAt = getMissileAvailabilityTick(game, sam, getSamCooldown(game));
    return Number.isFinite(availableAt) ? 1 : 0;
  }

  function getSamStackInterceptionCapacity(_game, sams) {
    return (sams || []).reduce((sum, sam) => sum + getUnitLevel(sam), 0);
  }

  function getAutoNukeSamStackSams(baseContext, stackKey, fallbackSams = null) {
    const stackSams = (baseContext.targetSams || []).filter(
      (sam) => getSamStackKey(sam) === stackKey,
    );
    return stackSams.length > 0 ? stackSams : fallbackSams || [];
  }

  function getAutoNukeSamStackSlots(game, baseContext, state, stackKey, fallbackSams = null) {
    const existing = state.samSlotAvailableTicks?.get?.(stackKey);
    if (Array.isArray(existing)) {
      return [...existing].sort((a, b) => a - b);
    }

    return getSamStackMissileSlotAvailableTicks(
      game,
      getAutoNukeSamStackSams(baseContext, stackKey, fallbackSams),
    );
  }

  function findAutoNukeSamStackInterceptionSlot(
    game,
    stack,
    slotAvailableTicks,
    candidate,
    shotIndexOffset,
    state = null,
  ) {
    if (!stack?.sams?.length || candidate?.sourceTile == null || candidate?.tile == null) {
      return null;
    }

    const trajectory = createNukeSuggestionTrajectory(
      game,
      candidate.sourceTile,
      candidate.tile,
      candidate.rocketDirectionUp,
    );
    const launchOffsetTicks = getAutoNukeShotLaunchOffsetTicks(shotIndexOffset);
    let best = null;

    for (let slotIndex = 0; slotIndex < slotAvailableTicks.length; slotIndex++) {
      const slotAvailableAt = Math.max(
        0,
        Math.floor(Number(slotAvailableTicks[slotIndex]) || 0),
      );
      for (const sam of stack.sams) {
        const samKey = getUnitKey(sam);
        const opportunity = findSamInterceptionOpportunity(
          game,
          candidate.sourceTile,
          candidate.tile,
          trajectory,
          sam,
          stack.sams,
          candidate.rocketDirectionUp,
          launchOffsetTicks,
          slotAvailableAt,
        );
        if (
          opportunity &&
          isAutoNukeSamDestroyedBeforeTick(state, samKey, opportunity.shootTick)
        ) {
          continue;
        }
        if (
          opportunity &&
          (!best || opportunity.shootTick < best.shootTick)
        ) {
          best = {
            ...opportunity,
            slotIndex,
          };
        }
      }
    }

    return best;
  }

  function cloneAutoNukeSamSlotUpdates(updates) {
    const cloned = new Map();
    for (const [stackKey, slots] of updates || []) {
      cloned.set(stackKey, [...slots]);
    }
    return cloned;
  }

  function cloneAutoNukeTickMap(map) {
    const cloned = new Map();
    for (const [key, tick] of map || []) {
      const numericTick = Number(tick);
      if (key && Number.isFinite(numericTick)) {
        cloned.set(key, numericTick);
      }
    }
    return cloned;
  }

  function getAutoNukeCandidateFlightTicks(game, candidate) {
    if (candidate?.sourceTile == null || candidate?.tile == null) {
      return 0;
    }

    try {
      return createNukeSuggestionTrajectory(
        game,
        candidate.sourceTile,
        candidate.tile,
        candidate.rocketDirectionUp,
      ).length;
    } catch (_error) {
      return 0;
    }
  }

  function getAutoNukeCandidateLandingTick(game, candidate, shotIndex) {
    return getAutoNukeShotLaunchOffsetTicks(shotIndex) +
      getAutoNukeCandidateFlightTicks(game, candidate);
  }

  function isAutoNukeSamDestroyedBeforeTick(state, samKey, tick) {
    if (!samKey) {
      return false;
    }

    const destroyedAt = Number(state?.samDestroyedAtTicks?.get?.(samKey));
    return Number.isFinite(destroyedAt) && destroyedAt <= tick;
  }

  function applyAutoNukeInterceptionPlan(state, plan) {
    for (const shotSam of plan.shotSamKeys || []) {
      state.usedSamShots.set(
        shotSam.key,
        (state.usedSamShots.get(shotSam.key) || 0) + 1,
      );
    }

    if (!state.samSlotAvailableTicks) {
      state.samSlotAvailableTicks = new Map();
    }
    for (const [stackKey, slots] of plan.samSlotUpdates || []) {
      state.samSlotAvailableTicks.set(stackKey, [...slots].sort((a, b) => a - b));
    }
  }

  function groupInterceptingSamsByStack(interceptingSams, baseContext) {
    const stacks = new Map();

    for (const sam of interceptingSams) {
      const stackKey = getSamStackKey(sam) || getUnitKey(sam);
      if (!stackKey) {
        continue;
      }

      let stack = stacks.get(stackKey);
      if (!stack) {
        stack = {
          key: stackKey,
          sams: [],
          ownedByTarget: isSamOwnedByNukeTarget(baseContext, sam),
        };
        stacks.set(stackKey, stack);
      }
      stack.sams.push(sam);
    }

    return Array.from(stacks.values()).sort((a, b) => {
      if (a.ownedByTarget === b.ownedByTarget) {
        return 0;
      }
      return a.ownedByTarget ? 1 : -1;
    });
  }

  function getAutoNukeInterceptionPlan(
    game,
    baseContext,
    candidate,
    state,
    mode,
    shotIndexOffset = 0,
  ) {
    if (candidate.sourceTile == null) {
      return {
        shotsNeededBeforeLanding: Infinity,
        shotSamKeys: [],
        samSlotUpdates: new Map(),
      };
    }

    const shotSamKeys = [];
    const samSlotUpdates = new Map();
    const routeInterceptorStacks = groupInterceptingSamsByStack(
      baseContext.targetSams || [],
      baseContext,
    );
    const launchTick = getAutoNukeShotLaunchOffsetTicks(shotIndexOffset);

    for (const stack of routeInterceptorStacks) {
      if (!stack.key) {
        continue;
      }

      const stackUnitKeys = getSamStackUnitKeys(baseContext.targetSams, stack.key);
      if (
        stackUnitKeys.length > 0 &&
        stackUnitKeys.every((samKey) =>
          isAutoNukeSamDestroyedBeforeTick(state, samKey, launchTick),
        )
      ) {
        continue;
      }

      const stackSams = getAutoNukeSamStackSams(
        baseContext,
        stack.key,
        stack.sams,
      );
      const simStack = {
        ...stack,
        sams: stackSams.length > 0 ? stackSams : stack.sams,
      };
      let stackSlots = samSlotUpdates.has(stack.key)
        ? [...samSlotUpdates.get(stack.key)]
        : getAutoNukeSamStackSlots(game, baseContext, state, stack.key, simStack.sams);
      const firstMainInterception = findAutoNukeSamStackInterceptionSlot(
        game,
        simStack,
        stackSlots,
        candidate,
        shotIndexOffset + shotSamKeys.length,
        state,
      );
      if (!firstMainInterception) {
        continue;
      }

      const samBurnSpec = getAutoNukeSamBurnSpec(game, baseContext.myPlayer);
      if (!samBurnSpec) {
        return {
          shotsNeededBeforeLanding: Infinity,
          shotSamKeys: [],
          samSlotUpdates: new Map(),
          burnCost: Infinity,
        };
      }

      const sam = stack.sams[0];
      const ownedByTarget = stack.ownedByTarget;
      const burnCandidate = ownedByTarget
        ? scoreAutoNukeSamClearCandidate(
          game,
          baseContext,
          samBurnSpec,
          sam,
          candidate.totalScore,
        )
        : scoreAutoNukeTargetBuildingBurnCandidate(
          game,
          baseContext,
          samBurnSpec,
          sam,
          candidate.totalScore,
          mode,
        );
      if (!burnCandidate) {
        return {
          shotsNeededBeforeLanding: Infinity,
          shotSamKeys: [],
          samSlotUpdates: new Map(),
          burnCost: Infinity,
        };
      }

      let guard = 0;
      while (guard < AUTO_NUKE_MAX_SAM_BURN_SHOTS_PER_STACK) {
        guard++;
        const mainInterception = findAutoNukeSamStackInterceptionSlot(
          game,
          simStack,
          stackSlots,
          candidate,
          shotIndexOffset + shotSamKeys.length,
          state,
        );
        if (!mainInterception) {
          break;
        }

        const burnInterception = findAutoNukeSamStackInterceptionSlot(
          game,
          simStack,
          stackSlots,
          burnCandidate,
          shotIndexOffset + shotSamKeys.length,
          state,
        );
        if (!burnInterception) {
          return {
            shotsNeededBeforeLanding: Infinity,
            shotSamKeys: [],
            samSlotUpdates: new Map(),
            burnCost: Infinity,
          };
        }

        stackSlots[burnInterception.slotIndex] =
          burnInterception.shootTick + getSamCooldown(game) + 1;
        stackSlots = stackSlots.sort((a, b) => a - b);
        samSlotUpdates.set(stack.key, [...stackSlots]);
        shotSamKeys.push({
          key: stack.key,
          ownedByTarget,
          candidate: burnCandidate,
          interceptedAtTick: burnInterception.shootTick,
        });
      }

      const stillIntercepts = findAutoNukeSamStackInterceptionSlot(
        game,
        simStack,
        stackSlots,
        candidate,
        shotIndexOffset + shotSamKeys.length,
        state,
      );
      if (stillIntercepts) {
        return {
          shotsNeededBeforeLanding: Infinity,
          shotSamKeys: [],
          samSlotUpdates: new Map(),
          burnCost: Infinity,
        };
      }
    }

    const burnCost = shotSamKeys.reduce((sum, shotSam) => {
      const cost = getNukeSuggestionUnitCost(
        game,
        baseContext.myPlayer,
        shotSam.candidate.spec.type,
      );
      return sum + (Number.isFinite(cost) && cost > 0 ? cost : Infinity);
    }, 0);

    return {
      shotsNeededBeforeLanding: shotSamKeys.length,
      shotSamKeys,
      samSlotUpdates,
      burnCost,
    };
  }

  function getAutoNukeCircleOverlapFactor(
    candidate,
    selectedCandidates,
    spreadMultiplier = 1,
  ) {
    let factor = 1;
    const spread = Math.max(1, Number(spreadMultiplier) || 1);

    for (const selected of selectedCandidates) {
      if (selected.isSamClear) {
        continue;
      }

      const distance = Math.hypot(candidate.x - selected.x, candidate.y - selected.y);
      const smallerRadius = Math.min(
        candidate.magnitude.outer,
        selected.magnitude.outer,
      );
      const largerRadius = Math.max(
        candidate.magnitude.outer,
        selected.magnitude.outer,
      );

      if (distance < smallerRadius * 0.45 * spread) {
        return 0;
      }
      if (distance < smallerRadius * 0.9 * spread) {
        factor = Math.min(factor, spread > 1 ? 0.18 : 0.35);
      } else if (distance < largerRadius * 1.35 * spread) {
        factor = Math.min(factor, spread > 1 ? 0.42 : 0.65);
      }
    }

    return factor;
  }

  function getAutoNukeRemoteObjectiveFactor(candidate, state) {
    if ((state?.destructionPhase || "") !== "remote") {
      return 1;
    }

    const origin = state.remoteOrigin;
    if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
      return 1.2;
    }

    const distance = Math.hypot(candidate.x - origin.x, candidate.y - origin.y);
    return 1.1 + Math.min(1.75, distance / 150);
  }

  function isAutoNukeSamClearPhase(mode, state) {
    return mode === "sams" ||
      (mode === "destruction" && state?.destructionPhase === "sams");
  }

  function isAutoNukeSamClearStackCleared(state, stackKey) {
    if (!stackKey) {
      return true;
    }

    const stackKeys = state?.samClearStackUnitKeys?.get?.(stackKey) || [];
    if (stackKeys.length === 0) {
      return false;
    }

    return stackKeys.every((samKey) => state.destroyedSamKeys.has(samKey));
  }

  function chooseAutoNukeFocusedSamStackKey(candidates, state) {
    if (
      state.focusedSamStackKey &&
      !isAutoNukeSamClearStackCleared(state, state.focusedSamStackKey)
    ) {
      return state.focusedSamStackKey;
    }

    let best = null;
    for (const candidate of candidates || []) {
      const stackKey = candidate.samClearStackKey;
      if (!candidate.isSamClear || !stackKey) {
        continue;
      }

      const stackKeys = candidate.samClearStackSamKeys || [];
      if (stackKeys.length > 0) {
        state.samClearStackUnitKeys.set(stackKey, stackKeys);
      }
      const remainingSamCount = stackKeys.reduce(
        (sum, samKey) => sum + (state.destroyedSamKeys.has(samKey) ? 0 : 1),
        0,
      );
      if (remainingSamCount <= 0) {
        continue;
      }

      const score = remainingSamCount * AUTO_NUKE_DESTRUCTION_SAM_BONUS +
        (candidate.totalScore || 0);
      if (!best || score > best.score) {
        best = {
          stackKey,
          score,
        };
      }
    }

    state.focusedSamStackKey = best?.stackKey || null;
    return state.focusedSamStackKey;
  }

  function getAutoNukeMarginalScore(candidate, mode, state) {
    if (candidate.isSamClear || candidate.spec?.scoreMode === "sam-clear") {
      if (mode === "destruction" || mode === "sams") {
        if (mode === "destruction" && state.destructionPhase !== "sams") {
          return 0;
        }
        const samScore = (candidate.hitSamKeys || []).reduce(
          (sum, samKey) => sum + (state.destroyedSamKeys.has(samKey) ? 0 : 1),
          0,
        );
        return samScore > 0 ? candidate.totalScore * 4 : 0;
      }
      return (candidate.hitSamKeys || []).some(
        (samKey) => !state.destroyedSamKeys.has(samKey),
      )
        ? candidate.totalScore
        : 0;
    }

    if (mode === "economic" && candidate.hitEconomicStructureWeights?.size) {
      let marginalEconomicImpact = 0;
      for (const [structureKey, weight] of candidate.hitEconomicStructureWeights) {
        if (!state.hitEconomicStructureKeys.has(structureKey)) {
          marginalEconomicImpact += weight;
        }
      }
      return marginalEconomicImpact;
    }

    if (mode === "destruction") {
      const phase = state.destructionPhase || "buildings";
      if (phase === "sams") {
        return 0;
      }
      let marginalBuildingImpact = 0;
      for (const [structureKey, weight] of candidate.hitDestructionStructureWeights || []) {
        if (!state.hitDestructionStructureKeys.has(structureKey)) {
          marginalBuildingImpact += weight;
        }
      }
      const residualPopulationImpact = (candidate.populationLoss || 0) * 0.15;
      return (marginalBuildingImpact + residualPopulationImpact) *
        getAutoNukeRemoteObjectiveFactor(candidate, state) *
        getAutoNukeCircleOverlapFactor(
          candidate,
          state.selectedCandidates,
          state.spreadMultiplier,
        );
    }

    if (mode === "sams") {
      return 0;
    }

    return candidate.totalScore *
      getAutoNukeCircleOverlapFactor(
        candidate,
        state.selectedCandidates,
        state.spreadMultiplier,
      );
  }

  function isAutoNukeHydrogenCandidateEfficient(
    game,
    baseContext,
    candidate,
    candidates,
    mode,
    state,
    marginalScore,
    totalCost,
    remainingGold,
    remainingSiloSlots,
  ) {
    if (candidate.spec?.type !== "Hydrogen Bomb") {
      return true;
    }
    if (isHydrogenCheaperThanFiveAtomNukes(game, baseContext.myPlayer)) {
      return true;
    }

    const atomCost = getNukeSuggestionUnitCost(
      game,
      baseContext.myPlayer,
      "Atom Bomb",
    );
    if (!Number.isFinite(atomCost) || atomCost <= 0) {
      return marginalScore > 0;
    }

    const atomAlternatives = [];
    for (const atomCandidate of candidates) {
      if (
        atomCandidate === candidate ||
        atomCandidate.isSamClear ||
        atomCandidate.spec?.type !== "Atom Bomb"
      ) {
        continue;
      }

      const atomKey = `${atomCandidate.spec.type}:${atomCandidate.tile}`;
      if (state.selectedCandidateKeys.has(atomKey)) {
        continue;
      }

      const atomPlan = getAutoNukeInterceptionPlan(
        game,
        baseContext,
        atomCandidate,
        state,
        mode,
      );
      const atomShotsNeeded = atomPlan.shotsNeededBeforeLanding + 1;
      const atomTotalCost = atomCost + atomPlan.burnCost;
      if (
        !Number.isFinite(atomTotalCost) ||
        atomShotsNeeded > 5 ||
        atomShotsNeeded > remainingSiloSlots ||
        atomTotalCost > remainingGold
      ) {
        continue;
      }

      const atomMarginalScore = getAutoNukeMarginalScore(
        atomCandidate,
        mode,
        state,
      );
      if (atomMarginalScore < AUTO_NUKE_MIN_MARGINAL_SCORE) {
        continue;
      }

      atomAlternatives.push({
        score: atomMarginalScore,
        cost: atomTotalCost,
        shots: atomShotsNeeded,
        density: atomMarginalScore / atomTotalCost,
      });
    }

    atomAlternatives.sort((a, b) =>
      b.density - a.density || b.score - a.score,
    );

    let atomScore = 0;
    let atomTotalCost = 0;
    let atomShots = 0;
    for (const alternative of atomAlternatives) {
      if (atomShots + alternative.shots > 5) {
        continue;
      }
      atomScore += alternative.score;
      atomTotalCost += alternative.cost;
      atomShots += alternative.shots;
      if (atomShots >= 5) {
        break;
      }
    }

    if (atomScore <= 0 || atomTotalCost <= 0) {
      return marginalScore > 0;
    }

    const hydrogenDensity = marginalScore / totalCost;
    const atomDensity = atomScore / atomTotalCost;
    return marginalScore >= atomScore || hydrogenDensity >= atomDensity * 1.05;
  }

  function markAutoNukeCandidateLanded(candidate, state, landingTick = 0) {
    if (!candidate.isSamClear) {
      state.selectedCandidates.push(candidate);
    }

    for (const samKey of candidate.hitSamKeys || []) {
      state.destroyedSamKeys.add(samKey);
      if (!state.samDestroyedAtTicks) {
        state.samDestroyedAtTicks = new Map();
      }
      const currentDestroyedAt = Number(state.samDestroyedAtTicks.get(samKey));
      const destroyedAt = Math.max(0, Math.floor(Number(landingTick) || 0));
      if (!Number.isFinite(currentDestroyedAt) || destroyedAt < currentDestroyedAt) {
        state.samDestroyedAtTicks.set(samKey, destroyedAt);
      }
    }

    for (const structureKey of candidate.hitEconomicStructureWeights?.keys?.() || []) {
      state.hitEconomicStructureKeys.add(structureKey);
    }

    for (const cityKey of candidate.hitCityPopulationWeights?.keys?.() || []) {
      state.hitCityPopulationKeys.add(cityKey);
    }

    for (const structureKey of candidate.hitDestructionStructureWeights?.keys?.() || []) {
      state.hitDestructionStructureKeys.add(structureKey);
    }
  }

  function cloneAutoNukePlanState(state = null) {
    return {
      selectedCandidates: [...(state?.selectedCandidates || [])],
      selectedCandidateKeys: new Set(state?.selectedCandidateKeys || []),
      hitEconomicStructureKeys: new Set(state?.hitEconomicStructureKeys || []),
      hitCityPopulationKeys: new Set(state?.hitCityPopulationKeys || []),
      hitDestructionStructureKeys: new Set(state?.hitDestructionStructureKeys || []),
      destroyedSamKeys: new Set(state?.destroyedSamKeys || []),
      samClearStackUnitKeys: new Map(state?.samClearStackUnitKeys || []),
      focusedSamStackKey: state?.focusedSamStackKey || null,
      samDestroyedAtTicks: cloneAutoNukeTickMap(state?.samDestroyedAtTicks),
      usedSamShots: new Map(state?.usedSamShots || []),
      samSlotAvailableTicks: cloneAutoNukeSamSlotUpdates(
        state?.samSlotAvailableTicks,
      ),
      plannedAtTick: Number.isFinite(Number(state?.plannedAtTick))
        ? Number(state.plannedAtTick)
        : null,
      spreadMultiplier: Math.max(1, Number(state?.spreadMultiplier) || 1),
      destructionPhase: state?.destructionPhase || "buildings",
      remoteOrigin: state?.remoteOrigin || null,
    };
  }

  function normalizeAutoNukePlanStateTiming(game, state) {
    const currentTick = getCurrentGameTick(game);
    if (Number.isFinite(Number(state.plannedAtTick))) {
      const elapsedTicks = Math.max(0, currentTick - Number(state.plannedAtTick));
      if (elapsedTicks > 0) {
        for (const [stackKey, slots] of state.samSlotAvailableTicks || []) {
          state.samSlotAvailableTicks.set(
            stackKey,
            slots.map((tick) => Math.max(0, Number(tick) - elapsedTicks)),
          );
        }
        for (const [samKey, destroyedAtTick] of state.samDestroyedAtTicks || []) {
          state.samDestroyedAtTicks.set(
            samKey,
            Math.max(0, Number(destroyedAtTick) - elapsedTicks),
          );
        }
      }
    }
    state.plannedAtTick = currentTick;
  }

  function orderAutoNukeShots(shots) {
    const thirdPartySamShots = [];
    const remainingShots = [];

    for (const shot of shots) {
      const isThirdPartyInterceptSam =
        shot.reason === "sam-intercept" &&
        shot.interceptingSamOwnedByTarget === false;
      const isThirdPartyClearSam =
        shot.reason === "sam-clear" &&
        shot.targetSamOwnedByTarget === false;

      if (isThirdPartyInterceptSam || isThirdPartyClearSam) {
        thirdPartySamShots.push(shot);
      } else {
        remainingShots.push(shot);
      }
    }

    return [...thirdPartySamShots, ...remainingShots];
  }

  function getAutoNukeDestructionObjectiveScore(candidate) {
    const buildingCount = candidate.hitDestructionStructureWeights?.size || 0;
    return buildingCount * AUTO_NUKE_DESTRUCTION_BUILDING_BONUS +
      (candidate.totalScore || 0);
  }

  function createAutoNukePlanMetrics() {
    return {
      populationDamage: 0,
      economicDamage: 0,
      samsDestroyed: 0,
      hitPopulationCandidateKeys: new Set(),
      hitCityPopulationKeys: new Set(),
      hitEconomicStructureKeys: new Set(),
      hitSamKeys: new Set(),
    };
  }

  function addAutoNukeCandidateMetrics(metrics, candidate) {
    if (!metrics || !candidate) {
      return;
    }

    for (const [cityKey, weight] of candidate.hitCityPopulationWeights || []) {
      if (!metrics.hitCityPopulationKeys.has(cityKey)) {
        metrics.hitCityPopulationKeys.add(cityKey);
        metrics.populationDamage += Math.max(0, Number(weight) || 0);
      }
    }

    const populationLoss = Math.max(0, Number(candidate.populationLoss) || 0);
    if (populationLoss > 0) {
      const populationCandidateKey = `${candidate.spec?.type || ""}:${candidate.tile}`;
      if (!metrics.hitPopulationCandidateKeys.has(populationCandidateKey)) {
        metrics.hitPopulationCandidateKeys.add(populationCandidateKey);
        metrics.populationDamage += populationLoss;
      }
    }

    for (const [structureKey, weight] of candidate.hitEconomicStructureWeights || []) {
      if (!metrics.hitEconomicStructureKeys.has(structureKey)) {
        metrics.hitEconomicStructureKeys.add(structureKey);
        metrics.economicDamage += Math.max(0, Number(weight) || 0);
      }
    }

    for (const samKey of candidate.hitSamKeys || []) {
      if (!metrics.hitSamKeys.has(samKey)) {
        metrics.hitSamKeys.add(samKey);
        metrics.samsDestroyed++;
      }
    }
  }

  function finalizeAutoNukePlanMetrics(metrics, shotCount, cost) {
    return {
      shotCount: Math.max(0, Math.floor(Number(shotCount) || 0)),
      cost: Math.max(0, Number(cost) || 0),
      populationDamage: Math.max(0, Number(metrics?.populationDamage) || 0),
      economicDamage: Math.max(0, Number(metrics?.economicDamage) || 0),
      samsDestroyed: Math.max(0, Math.floor(Number(metrics?.samsDestroyed) || 0)),
    };
  }

  function appendAutoNukeDestructionConfirmationShots(
    game,
    baseContext,
    mode,
    state,
    shots,
    remainingGold,
    remainingSiloSlots,
    totalCost,
    confirmationShotLimit = AUTO_NUKE_DESTRUCTION_CONFIRMATION_SHOTS,
    metrics = null,
  ) {
    if (
      (mode !== "destruction" && mode !== "sams") ||
      confirmationShotLimit <= 0 ||
      remainingGold <= 0 ||
      remainingSiloSlots <= 0
    ) {
      return {
        remainingGold,
        remainingSiloSlots,
        totalCost,
      };
    }

    const mainObjectives = state.selectedCandidates
      .filter((candidate) => !candidate.isSamClear && candidate.tile != null)
      .sort((a, b) =>
        getAutoNukeDestructionObjectiveScore(b) -
          getAutoNukeDestructionObjectiveScore(a),
      );
    if (mainObjectives.length === 0) {
      return {
        remainingGold,
        remainingSiloSlots,
        totalCost,
      };
    }

    let confirmationShots = 0;
    let objectiveIndex = 0;
    while (
      confirmationShots < confirmationShotLimit &&
      remainingGold > 0 &&
      remainingSiloSlots > 0 &&
      objectiveIndex < mainObjectives.length * confirmationShotLimit
    ) {
      const candidate = mainObjectives[objectiveIndex % mainObjectives.length];
      objectiveIndex++;

      const nukeCost = getNukeSuggestionUnitCost(
        game,
        baseContext.myPlayer,
        candidate.spec.type,
      );
      if (!Number.isFinite(nukeCost) || nukeCost <= 0) {
        continue;
      }

      const interceptionPlan = getAutoNukeInterceptionPlan(
        game,
        baseContext,
        candidate,
        state,
        mode,
        shots.length,
      );
      const shotsNeeded = interceptionPlan.shotsNeededBeforeLanding + 1;
      const burnCost = interceptionPlan.burnCost || 0;
      const shotCost = nukeCost + burnCost;
      if (
        !Number.isFinite(shotCost) ||
        !Number.isFinite(shotsNeeded) ||
        shotsNeeded > remainingSiloSlots ||
        shotCost > remainingGold
      ) {
        continue;
      }

      for (const shotSam of interceptionPlan.shotSamKeys) {
        shots.push({
          tile: shotSam.candidate.tile,
          sourceTile: shotSam.candidate.sourceTile,
          rocketDirectionUp: shotSam.candidate.rocketDirectionUp,
          spec: shotSam.candidate.spec,
          reason: "sam-intercept",
          interceptingSamKey: shotSam.key,
          interceptingSamOwnedByTarget: shotSam.ownedByTarget,
        });
      }
      applyAutoNukeInterceptionPlan(state, interceptionPlan);

      shots.push({
        tile: candidate.tile,
        sourceTile: candidate.sourceTile,
        rocketDirectionUp: candidate.rocketDirectionUp,
        spec: candidate.spec,
        reason: "confirmation",
      });
      addAutoNukeCandidateMetrics(metrics, candidate);
      markAutoNukeCandidateLanded(
        candidate,
        state,
        getAutoNukeCandidateLandingTick(game, candidate, shots.length - 1),
      );
      remainingGold -= shotCost;
      remainingSiloSlots -= shotsNeeded;
      totalCost += shotCost;
      confirmationShots++;
    }

    return {
      remainingGold,
      remainingSiloSlots,
      totalCost,
    };
  }

  function buildAutoNukePlan(
    game,
    targetPlayer,
    mode,
    options = null,
    candidatePool = null,
  ) {
    const { baseContext, candidates } = candidatePool ||
      computeAutoNukeCandidatePool(
        game,
        targetPlayer,
        mode,
      );
    if (!baseContext || candidates.length === 0) {
      return {
        shots: [],
        score: 0,
        cost: 0,
        budgetGold: 0,
        budgetSiloSlots: 0,
        availableGold: 0,
        availableSiloSlots: 0,
        minimumRequiredGold: Infinity,
        minimumRequiredSiloSlots: Infinity,
        metrics: finalizeAutoNukePlanMetrics(null, 0, 0),
        followupState: cloneAutoNukePlanState(),
        destructionPhase: options?.destructionPhase || "buildings",
      };
    }

    const gold = getPlayerGoldNumber(baseContext.myPlayer);
    const availableGold = Number.isFinite(gold) ? Math.max(0, gold) : 0;
    const overrideSiloSlots = Number(options?.availableSiloSlotsOverride);
    const availableSiloSlots =
      Number.isFinite(overrideSiloSlots) && overrideSiloSlots >= 0
        ? Math.floor(overrideSiloSlots)
        : getReadyNukeSiloSlotCount(baseContext.myPlayer);
    const budgetGold = Math.min(
      availableGold,
      Math.max(0, Number(options?.maxGold ?? availableGold)),
    );
    const budgetSiloSlots = Math.min(
      availableSiloSlots,
      Math.max(0, Math.floor(Number(options?.maxSiloSlots ?? availableSiloSlots))),
    );
    let remainingGold = budgetGold;
    let remainingSiloSlots = budgetSiloSlots;
    const state = cloneAutoNukePlanState(options?.initialState);
    normalizeAutoNukePlanStateTiming(game, state);
    state.spreadMultiplier = Math.max(
      state.spreadMultiplier || 1,
      Number(options?.spreadMultiplier) || 1,
    );
    state.destructionPhase =
      options?.destructionPhase || state.destructionPhase || "buildings";
    if (!state.remoteOrigin && baseContext.tileInfo?.centroid) {
      state.remoteOrigin = {
        x: baseContext.tileInfo.centroid.x,
        y: baseContext.tileInfo.centroid.y,
      };
    }
    const shots = [];
    const metrics = createAutoNukePlanMetrics();
    let totalScore = 0;
    let totalCost = 0;
    let minimumRequiredGold = Infinity;
    let minimumRequiredSiloSlots = Infinity;
    const confirmationShotLimit = mode === "destruction"
      ? Math.max(
        0,
        Math.floor(
          Number(
            options?.confirmationShots ??
              AUTO_NUKE_DESTRUCTION_CONFIRMATION_SHOTS,
          ),
        ),
      )
      : 0;
    const confirmationShotReserve = mode === "destruction"
      ? Math.min(
        confirmationShotLimit,
        Math.max(0, budgetSiloSlots - 2),
      )
      : 0;

    while (remainingSiloSlots > confirmationShotReserve && remainingGold > 0) {
      let best = null;
      const focusedSamStackKey = isAutoNukeSamClearPhase(mode, state)
        ? chooseAutoNukeFocusedSamStackKey(candidates, state)
        : null;

      for (const candidate of candidates) {
        if (
          focusedSamStackKey &&
          candidate.isSamClear &&
          candidate.samClearStackKey !== focusedSamStackKey
        ) {
          continue;
        }

        const candidateKey = `${candidate.spec.type}:${candidate.tile}`;
        if (state.selectedCandidateKeys.has(candidateKey)) {
          continue;
        }

        const nukeCost = getNukeSuggestionUnitCost(
          game,
          baseContext.myPlayer,
          candidate.spec.type,
        );
        if (!Number.isFinite(nukeCost) || nukeCost <= 0) {
          continue;
        }

        const interceptionPlan = getAutoNukeInterceptionPlan(
          game,
          baseContext,
          candidate,
          state,
          mode,
          shots.length,
        );
        const shotsNeeded = interceptionPlan.shotsNeededBeforeLanding + 1;
        const totalCost = nukeCost + interceptionPlan.burnCost;
        if (!Number.isFinite(totalCost) || !Number.isFinite(shotsNeeded)) {
          continue;
        }

        const marginalScore = getAutoNukeMarginalScore(candidate, mode, state);
        if (marginalScore < AUTO_NUKE_MIN_MARGINAL_SCORE) {
          continue;
        }

        const reserveFollowupShot =
          candidate.isSamClear && mode !== "sams" ? 1 : 0;
        const reserveFollowupCost = candidate.isSamClear && mode !== "sams"
          ? getAutoNukeMinimumAvailableCost(game, baseContext.myPlayer)
          : 0;
        if (
          (
            shotsNeeded + reserveFollowupShot + confirmationShotReserve >
              remainingSiloSlots ||
            totalCost + reserveFollowupCost > remainingGold
          )
        ) {
          minimumRequiredSiloSlots = Math.min(
            minimumRequiredSiloSlots,
            budgetSiloSlots - remainingSiloSlots + shotsNeeded +
              reserveFollowupShot + confirmationShotReserve,
          );
          minimumRequiredGold = Math.min(
            minimumRequiredGold,
            budgetGold - remainingGold + totalCost + reserveFollowupCost,
          );
          continue;
        }
        if (
          !isAutoNukeHydrogenCandidateEfficient(
            game,
            baseContext,
            candidate,
            candidates,
            mode,
            state,
            marginalScore,
            totalCost,
            remainingGold,
            remainingSiloSlots,
          )
        ) {
          continue;
        }

        const valueDensity = marginalScore / totalCost;
        if (
          !best ||
          valueDensity > best.valueDensity ||
          (
            valueDensity === best.valueDensity &&
            marginalScore > best.marginalScore
          )
        ) {
          best = {
            candidate,
            candidateKey,
            interceptionPlan,
            marginalScore,
            nukeCost,
            shotsNeeded,
            totalCost,
            valueDensity,
          };
        }
      }

      if (!best) {
        break;
      }

      for (const shotSam of best.interceptionPlan.shotSamKeys) {
        shots.push({
          tile: shotSam.candidate.tile,
          sourceTile: shotSam.candidate.sourceTile,
          rocketDirectionUp: shotSam.candidate.rocketDirectionUp,
          spec: shotSam.candidate.spec,
          reason: "sam-intercept",
          interceptingSamKey: shotSam.key,
          interceptingSamOwnedByTarget: shotSam.ownedByTarget,
        });
      }
      applyAutoNukeInterceptionPlan(state, best.interceptionPlan);

      const mainShotIndex = shots.length;
      shots.push({
        tile: best.candidate.tile,
        sourceTile: best.candidate.sourceTile,
        rocketDirectionUp: best.candidate.rocketDirectionUp,
        spec: best.candidate.spec,
        reason: best.candidate.isSamClear ? "sam-clear" : "impact",
        targetSamOwnedByTarget: best.candidate.samClearOwnedByTarget,
      });
      addAutoNukeCandidateMetrics(metrics, best.candidate);
      let samOvershootShots = 0;
      if (
        mode === "destruction" &&
        state.destructionPhase === "sams" &&
        best.candidate.isSamClear
      ) {
        const remainingSlotsAfterClear = remainingSiloSlots - best.shotsNeeded;
        const remainingGoldAfterClear = remainingGold - best.totalCost;
        samOvershootShots = Math.min(
          AUTO_NUKE_DESTRUCTION_SAM_OVERSHOOT_SHOTS,
          Math.max(0, remainingSlotsAfterClear),
          Math.max(0, Math.floor(remainingGoldAfterClear / best.nukeCost)),
        );
        for (let index = 0; index < samOvershootShots; index++) {
          shots.push({
            tile: best.candidate.tile,
            sourceTile: best.candidate.sourceTile,
            rocketDirectionUp: best.candidate.rocketDirectionUp,
            spec: best.candidate.spec,
            reason: "sam-clear-overshoot",
            targetSamOwnedByTarget: best.candidate.samClearOwnedByTarget,
          });
        }
      }
      state.selectedCandidateKeys.add(best.candidateKey);
      markAutoNukeCandidateLanded(
        best.candidate,
        state,
        getAutoNukeCandidateLandingTick(game, best.candidate, mainShotIndex),
      );
      if (
        isAutoNukeSamClearPhase(mode, state) &&
        isAutoNukeSamClearStackCleared(state, state.focusedSamStackKey)
      ) {
        state.focusedSamStackKey = null;
      }
      remainingGold -= best.totalCost + samOvershootShots * best.nukeCost;
      remainingSiloSlots -= best.shotsNeeded + samOvershootShots;
      totalCost += best.totalCost + samOvershootShots * best.nukeCost;
      if (!best.candidate.isSamClear || mode === "destruction" || mode === "sams") {
        totalScore += best.marginalScore;
      }
    }

    const confirmationResult = appendAutoNukeDestructionConfirmationShots(
      game,
      baseContext,
      mode,
      state,
      shots,
      remainingGold,
      remainingSiloSlots,
      totalCost,
      confirmationShotLimit,
      metrics,
    );
    remainingGold = confirmationResult.remainingGold;
    remainingSiloSlots = confirmationResult.remainingSiloSlots;
    totalCost = confirmationResult.totalCost;

    return {
      shots,
      score: totalScore,
      cost: totalCost,
      budgetGold,
      budgetSiloSlots,
      availableGold,
      availableSiloSlots,
      minimumRequiredGold,
      minimumRequiredSiloSlots,
      metrics: finalizeAutoNukePlanMetrics(metrics, shots.length, totalCost),
      followupState: cloneAutoNukePlanState(state),
      destructionPhase: state.destructionPhase,
    };
  }

  function buildAutoNukePlanForMode(
    game,
    targetPlayer,
    mode,
    options = null,
    candidatePool = null,
  ) {
    const plan = buildAutoNukePlan(game, targetPlayer, mode, options, candidatePool);
    if (
      mode !== "destruction" ||
      options?.destructionPhase !== "sams" ||
      !options?.allowDestructionPhaseFallback ||
      plan.shots.length > 0 ||
      plan.score > 0 ||
      Number.isFinite(plan.minimumRequiredGold) ||
      Number.isFinite(plan.minimumRequiredSiloSlots)
    ) {
      return plan;
    }

    return buildAutoNukePlan(
      game,
      targetPlayer,
      mode,
      {
        ...options,
        destructionPhase: "buildings",
        confirmationShots: AUTO_NUKE_DESTRUCTION_CONFIRMATION_SHOTS,
        allowDestructionPhaseFallback: false,
      },
      candidatePool,
    );
  }

  function waitForAutoNukeDelay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function getAutoNukeBuildableUnit(params, candidate) {
    const unitType = candidate?.spec?.type;
    if (!unitType || candidate?.tile == null) {
      return null;
    }

    if (typeof params?.myPlayer?.buildables === "function") {
      try {
        const buildables = await params.myPlayer.buildables(candidate.tile, [unitType]);
        const buildable = Array.from(buildables || []).find(
          (item) => item?.type === unitType,
        );
        if (buildable?.canBuild) {
          return buildable;
        }
      } catch (_error) {
        // Fall back to the broader action lookup.
      }
    }

    if (typeof params?.myPlayer?.actions === "function") {
      try {
        const actions = await params.myPlayer.actions(candidate.tile, [unitType]);
        const buildable = Array.from(actions?.buildableUnits || []).find(
          (item) => item?.type === unitType,
        );
        if (buildable?.canBuild) {
          return buildable;
        }
      } catch (_error) {
        return null;
      }
    }

    return null;
  }

  async function launchAutoNukeCandidate(params, candidate) {
    if (!candidate || candidate.intercepted || candidate.tile == null) {
      return false;
    }

    const buildableUnit = await getAutoNukeBuildableUnit(params, candidate);
    if (!buildableUnit?.canBuild) {
      return false;
    }

    if (
      candidate.spec?.type === "Atom Bomb" ||
      candidate.spec?.type === "Hydrogen Bomb"
    ) {
      const rocketDirectionUp = candidate.rocketDirectionUp !== false;
      if (params?.buildMenu?.uiState) {
        params.buildMenu.uiState.rocketDirectionUp = rocketDirectionUp;
      }
    }

    params?.buildMenu?.sendBuildOrUpgrade?.(buildableUnit, candidate.tile);
    return true;
  }

  function estimateAutoNukeShotLandingDelayMs(game, shot, shotIndex) {
    const sourceTile = Number(shot?.sourceTile);
    const targetTile = Number(shot?.tile);
    if (
      !Number.isFinite(sourceTile) ||
      !Number.isFinite(targetTile) ||
      sourceTile < 0 ||
      targetTile < 0
    ) {
      return AUTO_NUKE_FOLLOWUP_FALLBACK_LANDING_MS +
        shotIndex * AUTO_NUKE_SEQUENCE_DELAY_MS;
    }

    try {
      const trajectoryTicks = createNukeSuggestionTrajectory(
        game,
        sourceTile,
        targetTile,
        shot.rocketDirectionUp,
      ).length;
      return trajectoryTicks * AUTO_NUKE_GAME_TICK_MS +
        shotIndex * AUTO_NUKE_SEQUENCE_DELAY_MS;
    } catch (_error) {
      return AUTO_NUKE_FOLLOWUP_FALLBACK_LANDING_MS +
        shotIndex * AUTO_NUKE_SEQUENCE_DELAY_MS;
    }
  }

  function estimateAutoNukePlanLandingDelayMs(params, plan) {
    const shots = Array.isArray(plan?.shots) ? plan.shots : [];
    if (shots.length === 0) {
      return 0;
    }

    return shots.reduce(
      (maxDelay, shot, index) =>
        Math.max(maxDelay, estimateAutoNukeShotLandingDelayMs(params.game, shot, index)),
      0,
    );
  }

  async function launchAutoNukePlan(params, plan, progress = null) {
    let launchedCount = 0;
    plan.estimatedLandingDelayMs = estimateAutoNukePlanLandingDelayMs(params, plan);
    plan.estimatedImpactAtMs = performance.now() + plan.estimatedLandingDelayMs;

    if (progress) {
      updateAutoNukeProcessPanel({
        ...progress,
        detail: `Launching 0/${plan.shots.length} nukes`,
        progress: 0,
      });
    }

    for (const shot of plan.shots) {
      if (launchedCount > 0) {
        await waitForAutoNukeDelay(AUTO_NUKE_SEQUENCE_DELAY_MS);
      }

      const launched = await launchAutoNukeCandidate(params, shot);
      if (!launched) {
        break;
      }
      launchedCount++;
      if (progress) {
        updateAutoNukeProcessPanel({
          ...progress,
          detail: `Launching ${launchedCount}/${plan.shots.length} nukes`,
          progress: plan.shots.length > 0 ? launchedCount / plan.shots.length : 1,
        });
      }
    }

    return launchedCount;
  }

  function collectAutoNukeDestructionFollowupBuildings(player) {
    return getPlayerUnits(
      player,
      ...AUTO_NUKE_DESTRUCTION_FOLLOWUP_STRUCTURE_TYPES,
    ).filter(isActiveFinishedUnit);
  }

  function hideAutoNukeProcessPanel(delayMs = 0) {
    if (autoNukeProcessHideTimeout !== null) {
      window.clearTimeout(autoNukeProcessHideTimeout);
      autoNukeProcessHideTimeout = null;
    }

    const hide = () => {
      const panel = document.getElementById(AUTO_NUKE_PROCESS_PANEL_ID);
      if (panel) {
        panel.hidden = true;
      }
    };

    const delay = Math.max(0, Number(delayMs) || 0);
    if (delay > 0) {
      autoNukeProcessHideTimeout = window.setTimeout(() => {
        autoNukeProcessHideTimeout = null;
        hide();
      }, delay);
      return;
    }

    hide();
  }

  function ensureAutoNukeProcessPanelStyles() {
    if (document.getElementById(AUTO_NUKE_PROCESS_PANEL_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = AUTO_NUKE_PROCESS_PANEL_STYLE_ID;
    style.textContent = `
      #${AUTO_NUKE_PROCESS_PANEL_ID} {
        position: fixed;
        right: 14px;
        top: calc(50% + 118px);
        z-index: 2147483647;
        width: min(320px, calc(100vw - 28px));
        padding: 10px;
        border: 1px solid rgba(56, 189, 248, 0.46);
        border-radius: 8px;
        background: rgba(13, 18, 24, 0.97);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.44);
        color: #f8fafc;
        font: 800 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
        transform: translateY(-50%);
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID}[hidden] {
        display: none;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-top {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 5px;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-wave {
        color: #bae6fd;
        font-size: 12px;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-target {
        color: #94a3b8;
        font-size: 11px;
        max-width: 128px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: right;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-objective {
        color: #e2e8f0;
        font-size: 11px;
        margin-bottom: 7px;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-track {
        height: 7px;
        overflow: hidden;
        border-radius: 6px;
        background: rgba(51, 65, 85, 0.92);
        margin-bottom: 7px;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-fill {
        width: 0%;
        height: 100%;
        border-radius: 6px;
        background: linear-gradient(90deg, #38bdf8, #facc15);
        transition: width 140ms linear;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID}.openfront-helper-auto-nuke-process-waiting .openfront-helper-auto-nuke-process-fill {
        width: 38%;
        animation: openfront-helper-auto-nuke-process-wait 1.2s ease-in-out infinite alternate;
      }

      #${AUTO_NUKE_PROCESS_PANEL_ID} .openfront-helper-auto-nuke-process-detail {
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 750;
      }

      @keyframes openfront-helper-auto-nuke-process-wait {
        from { transform: translateX(-16%); }
        to { transform: translateX(180%); }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAutoNukeProcessPanel() {
    ensureAutoNukeProcessPanelStyles();

    let panel = document.getElementById(AUTO_NUKE_PROCESS_PANEL_ID);
    if (panel) {
      return panel;
    }

    panel = document.createElement("div");
    panel.id = AUTO_NUKE_PROCESS_PANEL_ID;
    panel.hidden = true;
    panel.innerHTML = `
      <div class="openfront-helper-auto-nuke-process-top">
        <div class="openfront-helper-auto-nuke-process-wave"></div>
        <div class="openfront-helper-auto-nuke-process-target"></div>
      </div>
      <div class="openfront-helper-auto-nuke-process-objective"></div>
      <div class="openfront-helper-auto-nuke-process-track">
        <div class="openfront-helper-auto-nuke-process-fill"></div>
      </div>
      <div class="openfront-helper-auto-nuke-process-detail"></div>
    `;
    (document.body || document.documentElement).appendChild(panel);
    return panel;
  }

  function updateAutoNukeProcessPanel(status = {}) {
    if (autoNukeProcessHideTimeout !== null) {
      window.clearTimeout(autoNukeProcessHideTimeout);
      autoNukeProcessHideTimeout = null;
    }

    const panel = ensureAutoNukeProcessPanel();
    const wave = panel.querySelector(".openfront-helper-auto-nuke-process-wave");
    const target = panel.querySelector(".openfront-helper-auto-nuke-process-target");
    const objective = panel.querySelector(".openfront-helper-auto-nuke-process-objective");
    const fill = panel.querySelector(".openfront-helper-auto-nuke-process-fill");
    const detail = panel.querySelector(".openfront-helper-auto-nuke-process-detail");
    const progress = Math.max(0, Math.min(1, Number(status.progress) || 0));

    panel.classList.toggle(
      "openfront-helper-auto-nuke-process-waiting",
      Boolean(status.waiting),
    );
    if (wave) {
      wave.textContent = status.waveLabel || "Auto nuke";
    }
    if (target) {
      target.textContent = status.targetName || "";
      target.title = status.targetName || "";
    }
    if (objective) {
      objective.textContent = status.objective || "Preparing strike";
    }
    if (fill && !status.waiting) {
      fill.style.width = `${Math.round(progress * 100)}%`;
    }
    if (detail) {
      detail.textContent = status.detail || "";
    }
    panel.hidden = false;
  }

  function getAutoNukeProcessObjective(mode, phase = null) {
    if (mode === "economic") {
      return "Maximize economic damage";
    }
    if (mode === "population") {
      return "Maximize population damage";
    }
    if (phase === "sams") {
      return "Destroy SAM stacks";
    }
    if (phase === "remote") {
      return "Destroy remote buildings";
    }
    if (phase === "buildings") {
      return "Destroy main buildings";
    }
    if (mode === "destruction") {
      return "Total destruction";
    }
    return "Launch nukes";
  }

  function getAutoNukeProcessWaveStatus(params, mode, waveNumber, phase, detail, extra = {}) {
    return {
      targetName: getPlayerDisplayName(params.selected),
      waveLabel: `Wave ${waveNumber}`,
      objective: getAutoNukeProcessObjective(mode, phase),
      detail,
      ...extra,
    };
  }

  function hideAutoNukeFollowupPrompt() {
    const prompt = document.getElementById(AUTO_NUKE_FOLLOWUP_PROMPT_ID);
    if (prompt) {
      prompt.hidden = true;
    }
  }

  function ensureAutoNukeFollowupPromptStyles() {
    if (document.getElementById(AUTO_NUKE_FOLLOWUP_PROMPT_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = AUTO_NUKE_FOLLOWUP_PROMPT_STYLE_ID;
    style.textContent = `
      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} {
        position: fixed;
        right: 14px;
        top: 50%;
        z-index: 2147483647;
        width: min(320px, calc(100vw - 28px));
        padding: 10px;
        border: 1px solid rgba(250, 204, 21, 0.5);
        border-radius: 8px;
        background: rgba(13, 18, 24, 0.97);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.44);
        color: #f8fafc;
        font: 800 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
        transform: translateY(-50%);
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID}[hidden] {
        display: none;
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} .openfront-helper-auto-nuke-followup-title {
        color: #fde68a;
        font-size: 12px;
        margin-bottom: 5px;
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} .openfront-helper-auto-nuke-followup-body {
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 750;
        margin-bottom: 9px;
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} .openfront-helper-auto-nuke-followup-actions {
        display: flex;
        gap: 7px;
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} button {
        flex: 1;
        padding: 7px 8px;
        border: 0;
        border-radius: 6px;
        color: #f8fafc;
        font: inherit;
        letter-spacing: 0;
        cursor: pointer;
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} button[data-auto-nuke-followup-run] {
        background: rgba(202, 138, 4, 0.85);
      }

      #${AUTO_NUKE_FOLLOWUP_PROMPT_ID} button[data-auto-nuke-followup-dismiss] {
        background: rgba(71, 85, 105, 0.82);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAutoNukeFollowupPrompt() {
    ensureAutoNukeFollowupPromptStyles();

    let prompt = document.getElementById(AUTO_NUKE_FOLLOWUP_PROMPT_ID);
    if (prompt) {
      return prompt;
    }

    prompt = document.createElement("div");
    prompt.id = AUTO_NUKE_FOLLOWUP_PROMPT_ID;
    prompt.hidden = true;
    prompt.innerHTML = `
      <div class="openfront-helper-auto-nuke-followup-title"></div>
      <div class="openfront-helper-auto-nuke-followup-body"></div>
      <div class="openfront-helper-auto-nuke-followup-actions">
        <button type="button" data-auto-nuke-followup-run>Run again</button>
        <button type="button" data-auto-nuke-followup-dismiss>Dismiss</button>
      </div>
    `;
    prompt.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.closest("[data-auto-nuke-followup-dismiss]")) {
        hideAutoNukeFollowupPrompt();
        return;
      }

      if (target.closest("[data-auto-nuke-followup-run]")) {
        const params = prompt.openFrontHelperAutoNukeParams;
        hideAutoNukeFollowupPrompt();
        if (params) {
          params.autoNukePlans = {};
          executeAutoNuke(params, "destruction", "high");
        }
      }
    });
    (document.body || document.documentElement).appendChild(prompt);
    return prompt;
  }

  function showAutoNukeFollowupPrompt(params, remainingCount) {
    const prompt = ensureAutoNukeFollowupPrompt();
    prompt.openFrontHelperAutoNukeParams = params;

    const targetName = getPlayerDisplayName(params.selected);
    const title = prompt.querySelector(".openfront-helper-auto-nuke-followup-title");
    const body = prompt.querySelector(".openfront-helper-auto-nuke-followup-body");
    if (title) {
      title.textContent = "More targets remain";
    }
    if (body) {
      body.textContent =
        `${targetName} still has ${remainingCount} buildings left ` +
        `after the last wave, more than 10% of the pre-strike count. ` +
        `Shoot another Total destruction run?`;
    }
    prompt.hidden = false;
  }

  function scheduleAutoNukeFollowupPrompt(
    params,
    initialBuildingCount,
    estimatedImpactAtMs = 0,
  ) {
    if (autoNukeFollowupPromptTimeout !== null) {
      window.clearTimeout(autoNukeFollowupPromptTimeout);
      autoNukeFollowupPromptTimeout = null;
    }
    hideAutoNukeFollowupPrompt();

    const initialCount = Math.max(0, Math.floor(Number(initialBuildingCount) || 0));
    if (initialCount <= 0) {
      return;
    }

    const impactAt = Number(estimatedImpactAtMs);
    const promptDelayMs = Number.isFinite(impactAt) && impactAt > 0
      ? Math.max(
        0,
        Math.ceil(impactAt - performance.now() + AUTO_NUKE_FOLLOWUP_AFTER_IMPACT_MS),
      )
      : AUTO_NUKE_FOLLOWUP_FALLBACK_LANDING_MS +
        AUTO_NUKE_FOLLOWUP_AFTER_IMPACT_MS;

    autoNukeFollowupPromptTimeout = window.setTimeout(() => {
      autoNukeFollowupPromptTimeout = null;
      if (!canContinueAutoNukeSecondPass(params)) {
        return;
      }

      const remainingCount = collectAutoNukeDestructionFollowupBuildings(
        params.selected,
      ).length;
      const threshold = Math.max(
        0,
        initialCount * AUTO_NUKE_FOLLOWUP_REMAINING_BUILDING_RATIO,
      );
      if (remainingCount > threshold) {
        showAutoNukeFollowupPrompt(params, remainingCount);
      }
    }, promptDelayMs);
  }

  function canContinueAutoNukeSecondPass(params) {
    return Boolean(
      params?.myPlayer?.isPlayer?.() &&
      params?.selected?.isPlayer?.() &&
      isEnemyNukeSuggestionTarget(params.game, params.selected),
    );
  }

  function buildAutoNukeWavePotentialPlan(params, mode, initialState, waveOptions) {
    const totalSiloSlots = getTotalNukeSiloSlotCount(params.myPlayer);
    const gold = getPlayerGoldNumber(params.myPlayer);
    const availableGold = Number.isFinite(gold) ? Math.max(0, gold) : 0;
    if (totalSiloSlots <= 0 || availableGold <= 0) {
      return null;
    }

    const candidatePool = computeAutoNukeCandidatePool(
      params.game,
      params.selected,
      mode,
      { includeCoolingSilos: true },
    );
    const potentialPlan = buildAutoNukePlan(
      params.game,
      params.selected,
      mode,
      {
        maxGold: availableGold,
        maxSiloSlots: totalSiloSlots,
        availableSiloSlotsOverride: totalSiloSlots,
        initialState,
        spreadMultiplier: waveOptions.spreadMultiplier,
        destructionPhase: waveOptions.destructionPhase,
        confirmationShots: waveOptions.confirmationShots,
      },
      candidatePool,
    );

    return potentialPlan.shots.length > 0 && potentialPlan.score > 0
      ? potentialPlan
      : null;
  }

  async function waitForAutoNukeWavePlan(
    params,
    mode,
    initialState,
    waveOptions,
    processStatus = null,
  ) {
    const potentialPlan = buildAutoNukeWavePotentialPlan(
      params,
      mode,
      initialState,
      waveOptions,
    );
    if (!potentialPlan) {
      return null;
    }

    const totalSiloSlots = getTotalNukeSiloSlotCount(params.myPlayer);
    const readySlotFraction = Number(waveOptions.readySlotFraction) || 0.6;
    const desiredReadySiloSlots = Math.min(
      totalSiloSlots,
      Math.max(
        1,
        Math.min(
          potentialPlan.budgetSiloSlots || totalSiloSlots,
          Math.max(
            2,
            Math.ceil(totalSiloSlots * readySlotFraction),
          ),
        ),
      ),
    );
    const startedAt = performance.now();
    if (processStatus) {
      updateAutoNukeProcessPanel({
        ...processStatus,
        detail: `Waiting for silos ${getReadyNukeSiloSlotCount(params.myPlayer)}/${desiredReadySiloSlots}`,
        waiting: true,
      });
    }
    while (performance.now() - startedAt < AUTO_NUKE_SECOND_PASS_MAX_WAIT_MS) {
      if (!canContinueAutoNukeSecondPass(params)) {
        return null;
      }

      const readySiloSlots = getReadyNukeSiloSlotCount(params.myPlayer);
      const gold = getPlayerGoldNumber(params.myPlayer);
      const availableGold = Number.isFinite(gold) ? Math.max(0, gold) : 0;
      if (readySiloSlots <= 0 || availableGold <= 0) {
        if (processStatus) {
          updateAutoNukeProcessPanel({
            ...processStatus,
            detail: readySiloSlots <= 0
              ? `Waiting for silos 0/${desiredReadySiloSlots}`
              : "Waiting for gold",
            waiting: true,
          });
        }
        await waitForAutoNukeDelay(AUTO_NUKE_SECOND_PASS_POLL_MS);
        continue;
      }
      if (readySiloSlots < desiredReadySiloSlots) {
        if (processStatus) {
          updateAutoNukeProcessPanel({
            ...processStatus,
            detail: `Waiting for silos ${readySiloSlots}/${desiredReadySiloSlots}`,
            waiting: true,
          });
        }
        await waitForAutoNukeDelay(AUTO_NUKE_SECOND_PASS_POLL_MS);
        continue;
      }
      const launchSlotFraction = Number(waveOptions.launchSlotFraction);
      const maxSiloSlots = Number.isFinite(launchSlotFraction) &&
        launchSlotFraction > 0 &&
        launchSlotFraction < 1
        ? Math.max(1, Math.ceil(readySiloSlots * launchSlotFraction))
        : readySiloSlots;

      const followupPlan = buildAutoNukePlan(
        params.game,
        params.selected,
        mode,
        {
          maxGold: availableGold,
          maxSiloSlots,
          initialState,
          spreadMultiplier: waveOptions.spreadMultiplier,
          destructionPhase: waveOptions.destructionPhase,
          confirmationShots: waveOptions.confirmationShots,
        },
      );
      if (followupPlan.shots.length > 0 && followupPlan.score > 0) {
        return followupPlan;
      }
      if (processStatus) {
        updateAutoNukeProcessPanel({
          ...processStatus,
          detail: "Preparing wave plan",
          waiting: true,
        });
      }
      await waitForAutoNukeDelay(AUTO_NUKE_SECOND_PASS_POLL_MS);
    }

    return null;
  }

  async function launchAutoNukeWithOptionalSecondPass(params, mode, tierId, plan) {
    const isSamOnlyMode = mode === "sams";
    const isDestructionFlow = mode === "destruction" || isSamOnlyMode;
    const initialDestructionBuildingCount = mode === "destruction"
      ? collectAutoNukeDestructionFollowupBuildings(params.selected).length
      : 0;
    let waveNumber = 1;
    const launchedCount = await launchAutoNukePlan(
      params,
      plan,
      getAutoNukeProcessWaveStatus(
        params,
        mode,
        waveNumber,
        isDestructionFlow ? plan.destructionPhase : mode,
        `Launching ${plan.shots.length} nukes`,
      ),
    );
    let latestImpactAtMs = plan.estimatedImpactAtMs || 0;
    if (launchedCount === 0) {
      console.info(`OpenFront Helper: auto ${mode} nukes could not be launched.`);
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber,
          isDestructionFlow ? plan.destructionPhase : mode,
          "Launch failed",
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }

    if (!isDestructionFlow) {
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber,
          mode,
          `Complete: launched ${launchedCount} nukes`,
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }
    waveNumber++;

    const scheduleDestructionFollowup = () => {
      scheduleAutoNukeFollowupPrompt(
        params,
        initialDestructionBuildingCount,
        latestImpactAtMs,
      );
    };

    if (mode === "destruction") {
      scheduleDestructionFollowup();
    }

    let currentState = plan.followupState;
    let samClearWaveCount = plan.destructionPhase === "sams" ? 1 : 0;
    while (samClearWaveCount > 0 && samClearWaveCount < AUTO_NUKE_MAX_SAM_CLEAR_WAVES) {
      const samWavePlan = await waitForAutoNukeWavePlan(
        params,
        mode,
        currentState,
        {
          destructionPhase: "sams",
          spreadMultiplier: 1,
          readySlotFraction: AUTO_NUKE_SECOND_PASS_READY_SLOT_FRACTION,
          launchSlotFraction: 1,
          confirmationShots: 0,
        },
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber,
          "sams",
          "Waiting for SAM clear wave",
        ),
      );
      if (!samWavePlan) {
        break;
      }

      const samWaveLaunchedCount = await launchAutoNukePlan(
        params,
        samWavePlan,
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber,
          "sams",
          `Launching ${samWavePlan.shots.length} nukes`,
        ),
      );
      if (samWaveLaunchedCount === 0) {
        console.info("OpenFront Helper: total destruction SAM pass could not be launched.");
        updateAutoNukeProcessPanel(
          getAutoNukeProcessWaveStatus(
            params,
            mode,
            waveNumber,
            "sams",
            "SAM clear wave failed",
            { progress: 1 },
          ),
        );
        hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
        return;
      }
      latestImpactAtMs = Math.max(
        latestImpactAtMs,
        samWavePlan.estimatedImpactAtMs || 0,
      );
      if (mode === "destruction") {
        scheduleDestructionFollowup();
      }
      currentState = samWavePlan.followupState;
      samClearWaveCount++;
      waveNumber++;
    }

    if (isSamOnlyMode) {
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          Math.max(1, waveNumber - 1),
          "sams",
          "Complete",
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }

    const secondWavePlan = await waitForAutoNukeWavePlan(
      params,
      mode,
      currentState,
      {
        destructionPhase: "buildings",
        spreadMultiplier: AUTO_NUKE_SECOND_PASS_SPREAD_MULTIPLIER,
        readySlotFraction: AUTO_NUKE_SECOND_PASS_READY_SLOT_FRACTION,
        launchSlotFraction: AUTO_NUKE_SECOND_PASS_LAUNCH_SLOT_FRACTION,
        confirmationShots: AUTO_NUKE_DESTRUCTION_CONFIRMATION_SHOTS,
      },
      getAutoNukeProcessWaveStatus(
        params,
        mode,
        waveNumber,
        "buildings",
        "Waiting for main building wave",
      ),
    );
    if (!secondWavePlan) {
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          Math.max(1, waveNumber - 1),
          "sams",
          "Complete",
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }

    const secondWaveLaunchedCount = await launchAutoNukePlan(
      params,
      secondWavePlan,
      getAutoNukeProcessWaveStatus(
        params,
        mode,
        waveNumber,
        "buildings",
        `Launching ${secondWavePlan.shots.length} nukes`,
      ),
    );
    if (secondWaveLaunchedCount === 0) {
      console.info("OpenFront Helper: total destruction second pass could not be launched.");
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber,
          "buildings",
          "Main building wave failed",
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }
    latestImpactAtMs = Math.max(
      latestImpactAtMs,
      secondWavePlan.estimatedImpactAtMs || 0,
    );
    scheduleDestructionFollowup();
    waveNumber++;

    const thirdWavePlan = await waitForAutoNukeWavePlan(
      params,
      mode,
      secondWavePlan.followupState,
      {
        destructionPhase: "remote",
        spreadMultiplier: AUTO_NUKE_THIRD_PASS_SPREAD_MULTIPLIER,
        readySlotFraction: AUTO_NUKE_THIRD_PASS_READY_SLOT_FRACTION,
        launchSlotFraction: 1,
        confirmationShots: 0,
      },
      getAutoNukeProcessWaveStatus(
        params,
        mode,
        waveNumber,
        "remote",
        "Waiting for remote cleanup wave",
      ),
    );
    if (!thirdWavePlan) {
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber - 1,
          "buildings",
          "Complete",
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }

    const thirdWaveLaunchedCount = await launchAutoNukePlan(
      params,
      thirdWavePlan,
      getAutoNukeProcessWaveStatus(
        params,
        mode,
        waveNumber,
        "remote",
        `Launching ${thirdWavePlan.shots.length} nukes`,
      ),
    );
    if (thirdWaveLaunchedCount === 0) {
      console.info("OpenFront Helper: total destruction third pass could not be launched.");
      updateAutoNukeProcessPanel(
        getAutoNukeProcessWaveStatus(
          params,
          mode,
          waveNumber,
          "remote",
          "Remote cleanup wave failed",
          { progress: 1 },
        ),
      );
      hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
      return;
    }
    latestImpactAtMs = Math.max(
      latestImpactAtMs,
      thirdWavePlan.estimatedImpactAtMs || 0,
    );
    scheduleDestructionFollowup();
    updateAutoNukeProcessPanel(
      getAutoNukeProcessWaveStatus(
        params,
        mode,
        waveNumber,
        "remote",
        `Complete: launched ${thirdWaveLaunchedCount} nukes`,
        { progress: 1 },
      ),
    );
    hideAutoNukeProcessPanel(AUTO_NUKE_PROCESS_COMPLETE_HIDE_MS);
  }

  function getAutoNukePlanKey(mode, tierId = "default") {
    return `${mode}:${tierId || "default"}`;
  }

  function getAutoNukeBuildPlanOptions(mode, tierOptions, extraOptions = null) {
    const options = {
      ...(tierOptions?.options || {}),
      ...(extraOptions || {}),
    };

    if (mode === "sams") {
      options.destructionPhase = "sams";
      options.confirmationShots = 0;
      options.allowDestructionPhaseFallback = false;
    } else if (mode === "destruction" && !options.destructionPhase) {
      options.destructionPhase = "sams";
      options.confirmationShots = 0;
      options.allowDestructionPhaseFallback = true;
    }

    return options;
  }

  function executeAutoNuke(params, mode, tierId = null) {
    const now = performance.now();
    if (now - lastAutoNukeActionAt < AUTO_NUKE_ACTION_COOLDOWN_MS) {
      return;
    }
    lastAutoNukeActionAt = now;

    if (isAutoNukeRadialItemDisabled(params)) {
      return;
    }

    const tierOptions = getAutoNukeTierPlanOptions(params, tierId);
    if (tierOptions?.reason) {
      return;
    }
    const planKey = getAutoNukePlanKey(mode, tierId);
    const plan = params.autoNukePlans?.[planKey] ||
      buildAutoNukePlanForMode(
        params.game,
        params.selected,
        mode,
        getAutoNukeBuildPlanOptions(mode, tierOptions),
      );
    if (!plan.shots.length || plan.score <= 0) {
      if (tierId || mode === "destruction" || mode === "sams") {
        return;
      }
      const fallbackCandidate = selectAutoNukeCandidate(
        params.game,
        params.selected,
        mode,
      );
      if (!fallbackCandidate) {
        console.info(`OpenFront Helper: no valid auto ${mode} nuke target found.`);
        return;
      }
      launchAutoNukeCandidate(params, fallbackCandidate).then((launched) => {
        if (!launched) {
          console.info(`OpenFront Helper: auto ${mode} nuke could not be launched.`);
        }
      });
      return;
    }

    launchAutoNukeWithOptionalSecondPass(params, mode, tierId, plan);
  }

  function ensureAutoNukeContextMenuStyles() {
    if (document.getElementById(AUTO_NUKE_CONTEXT_MENU_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = AUTO_NUKE_CONTEXT_MENU_STYLE_ID;
    style.textContent = `
      #${AUTO_NUKE_CONTEXT_MENU_ID} {
        position: fixed;
        z-index: 2147483647;
        min-width: 220px;
        padding: 6px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 8px;
        background: rgba(13, 18, 24, 0.96);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
        color: #f8fafc;
        font: 800 12px/1.15 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID}[hidden] {
        display: none;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-title {
        padding: 5px 7px 7px;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 800;
        border-bottom: 1px solid rgba(148, 163, 184, 0.22);
        margin-bottom: 5px;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-loading {
        margin: 5px 4px 7px;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-loading[hidden] {
        display: none;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-loading-track {
        height: 6px;
        overflow: hidden;
        border-radius: 6px;
        background: rgba(51, 65, 85, 0.92);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-loading-fill {
        width: 0%;
        height: 100%;
        border-radius: 6px;
        background: linear-gradient(90deg, #38bdf8, #facc15);
        transition: width 120ms linear;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-loading-text {
        margin-top: 4px;
        color: #cbd5e1;
        font-size: 10px;
        font-weight: 750;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button {
        display: block;
        width: 100%;
        margin: 0;
        padding: 8px 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: #f8fafc;
        font: inherit;
        letter-spacing: 0;
        text-align: left;
        cursor: pointer;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button:hover:not(:disabled),
      #${AUTO_NUKE_CONTEXT_MENU_ID} button:focus-visible:not(:disabled) {
        outline: none;
        background: rgba(239, 68, 68, 0.24);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="economic"]:hover:not(:disabled),
      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="economic"]:focus-visible:not(:disabled) {
        background: rgba(34, 197, 94, 0.22);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="destruction"]:hover:not(:disabled),
      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="destruction"]:focus-visible:not(:disabled) {
        background: rgba(250, 204, 21, 0.2);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="sams"]:hover:not(:disabled),
      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="sams"]:focus-visible:not(:disabled) {
        background: rgba(56, 189, 248, 0.2);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button:disabled {
        cursor: not-allowed;
        color: rgba(203, 213, 225, 0.48);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-section {
        margin: 7px 4px 3px;
        padding-top: 6px;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
        color: #94a3b8;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-section[hidden] {
        display: none;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-section[data-auto-nuke-section-label="economic"] {
        color: #86efac;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-section[data-auto-nuke-section-label="population"] {
        color: #fca5a5;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-section[data-auto-nuke-section-label="sams"] {
        color: #bae6fd;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-section[data-auto-nuke-section-label="destruction"] {
        color: #fde68a;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="economic"] {
        border-left: 2px solid rgba(34, 197, 94, 0.42);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="population"] {
        border-left: 2px solid rgba(239, 68, 68, 0.42);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="sams"] {
        border-left: 2px solid rgba(56, 189, 248, 0.5);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button[data-auto-nuke-mode="destruction"] {
        border-left: 2px solid rgba(250, 204, 21, 0.5);
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-label,
      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-meta {
        display: block;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-label {
        color: inherit;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} .openfront-helper-auto-nuke-meta {
        margin-top: 3px;
        color: #cbd5e1;
        font-size: 10px;
        font-weight: 750;
      }

      #${AUTO_NUKE_CONTEXT_MENU_ID} button:disabled .openfront-helper-auto-nuke-meta {
        color: rgba(203, 213, 225, 0.48);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAutoNukeContextMenu() {
    ensureAutoNukeContextMenuStyles();

    let menu = document.getElementById(AUTO_NUKE_CONTEXT_MENU_ID);
    if (menu) {
      return menu;
    }

    menu = document.createElement("div");
    menu.id = AUTO_NUKE_CONTEXT_MENU_ID;
    menu.hidden = true;
    menu.innerHTML = `
      <div class="openfront-helper-auto-nuke-title">Auto nuke</div>
      <button type="button" data-auto-nuke-expand></button>
      <div class="openfront-helper-auto-nuke-loading" data-auto-nuke-loading hidden>
        <div class="openfront-helper-auto-nuke-loading-track">
          <div class="openfront-helper-auto-nuke-loading-fill" data-auto-nuke-loading-fill></div>
        </div>
        <div class="openfront-helper-auto-nuke-loading-text" data-auto-nuke-loading-text></div>
      </div>
      <div class="openfront-helper-auto-nuke-section" data-auto-nuke-section-label="economic">Economy</div>
      <button type="button" data-auto-nuke-mode="economic" data-auto-nuke-tier="low"></button>
      <button type="button" data-auto-nuke-mode="economic" data-auto-nuke-tier="medium"></button>
      <button type="button" data-auto-nuke-mode="economic" data-auto-nuke-tier="high"></button>
      <div class="openfront-helper-auto-nuke-section" data-auto-nuke-section-label="population">Population</div>
      <button type="button" data-auto-nuke-mode="population" data-auto-nuke-tier="low"></button>
      <button type="button" data-auto-nuke-mode="population" data-auto-nuke-tier="medium"></button>
      <button type="button" data-auto-nuke-mode="population" data-auto-nuke-tier="high"></button>
      <div class="openfront-helper-auto-nuke-section" data-auto-nuke-section-label="sams">SAMs</div>
      <button type="button" data-auto-nuke-mode="sams"></button>
      <div class="openfront-helper-auto-nuke-section" data-auto-nuke-section-label="destruction">Total destruction</div>
      <button type="button" data-auto-nuke-mode="destruction" data-auto-nuke-tier="high"></button>
    `;
    menu.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const expandButton = target.closest("[data-auto-nuke-expand]");
      if (expandButton instanceof HTMLButtonElement) {
        if (!expandButton.disabled) {
          expandAutoNukeContextMenu(menu).catch((error) => {
            console.error("OpenFront Helper: failed to calculate auto nuke plans.", error);
          });
        }
        return;
      }

      const button = target.closest("[data-auto-nuke-mode]");
      if (!(button instanceof HTMLButtonElement) || button.disabled) {
        return;
      }
      const mode = button.dataset.autoNukeMode;
      const tierId = button.dataset.autoNukeTier;
      const params = autoNukeContextMenuParams;
      hideAutoNukeContextMenu();
      if (
        params &&
        (
          mode === "economic" ||
          mode === "population" ||
          mode === "destruction" ||
          mode === "sams"
        )
      ) {
        executeAutoNuke(params, mode, tierId);
      }
    });
    (document.body || document.documentElement).appendChild(menu);
    return menu;
  }

  function hideAutoNukeContextMenu() {
    autoNukeContextMenuComputeId++;
    const menu = document.getElementById(AUTO_NUKE_CONTEXT_MENU_ID);
    if (menu) {
      menu.hidden = true;
    }
    autoNukeContextMenuParams = null;
  }

  function getAutoNukeContextMenuDisableReason(params) {
    if (!params?.selected?.isPlayer?.()) {
      return "No player or nation selected.";
    }
    if (!isEnemyNukeSuggestionTarget(params.game, params.selected)) {
      return "Target is not hostile.";
    }
    if (!hasAutoNukeBuildTypeAvailable(params.game, params.myPlayer)) {
      return "No nuke type is available.";
    }
    if (collectReadyNukeSilos(params.myPlayer).length === 0) {
      return "Need more missile silo slots.";
    }
    const gold = getPlayerGoldNumber(params.myPlayer);
    const minimumCost = getAutoNukeMinimumAvailableCost(params.game, params.myPlayer);
    if (!Number.isFinite(gold) || gold < minimumCost) {
      const missingGold = Number.isFinite(gold) ? minimumCost - gold : minimumCost;
      return `Need ${formatAutoNukeGold(missingGold)} more gold.`;
    }
    return "";
  }

  function getAutoNukeModeLabel(mode) {
    if (mode === "economic") {
      return "Auto econ nukes";
    }
    if (mode === "destruction") {
      return "Total destruction";
    }
    if (mode === "sams") {
      return "Destroy all SAMs";
    }
    return "Auto population nukes";
  }

  function getAutoNukeTierById(tierId) {
    return AUTO_NUKE_INTENSITY_TIERS.find((tier) => tier.id === tierId) ||
      AUTO_NUKE_INTENSITY_TIERS[AUTO_NUKE_INTENSITY_TIERS.length - 1];
  }

  function getAutoNukeTierRank(tierId) {
    return AUTO_NUKE_TIER_ORDER.has(tierId)
      ? AUTO_NUKE_TIER_ORDER.get(tierId)
      : AUTO_NUKE_INTENSITY_TIERS.length;
  }

  function getAutoNukeTierPlanOptions(params, tierId) {
    if (!tierId) {
      return {
        tier: null,
        options: null,
        reason: "",
      };
    }

    const tier = getAutoNukeTierById(tierId);
    const availableSiloSlots = getReadyNukeSiloSlotCount(params.myPlayer);
    const playerGold = getPlayerGoldNumber(params.myPlayer);
    const availableGold = Number.isFinite(playerGold) ? Math.max(0, playerGold) : 0;
    const minimumCost = getAutoNukeMinimumAvailableCost(params.game, params.myPlayer);

    if (availableSiloSlots < tier.minShots) {
      const missingSlots = tier.minShots - availableSiloSlots;
      return {
        tier,
        options: null,
        reason: `Need ${missingSlots} more missile silo ${missingSlots === 1 ? "slot" : "slots"}.`,
      };
    }

    const maxSiloSlots = Math.min(
      availableSiloSlots,
      Math.max(
        tier.minShots,
        Math.ceil(availableSiloSlots * tier.shotFraction),
      ),
    );
    const requiredGold = minimumCost * maxSiloSlots;

    if (!Number.isFinite(availableGold) || availableGold < requiredGold) {
      return {
        tier,
        options: null,
        reason: `Need ${formatAutoNukeGold(requiredGold - availableGold)} more gold.`,
      };
    }

    return {
      tier,
      options: {
        maxGold: availableGold,
        maxSiloSlots,
      },
      reason: "",
    };
  }

  function formatAutoNukeGold(value) {
    return formatNukeSuggestionPopulation(value);
  }

  function formatAutoNukeMetric(value) {
    return formatNukeSuggestionPopulation(Math.max(0, Number(value) || 0));
  }

  function getAutoNukePlanFailureReason(params, plan) {
    if (plan?.budgetSiloSlots === 0 || plan?.availableSiloSlots === 0) {
      return "Need more missile silo slots.";
    }

    const minimumCost = getAutoNukeMinimumAvailableCost(params.game, params.myPlayer);
    if (
      Number.isFinite(minimumCost) &&
      (
        plan?.budgetGold < minimumCost ||
        plan?.availableGold < minimumCost
      )
    ) {
      return `Need ${formatAutoNukeGold(minimumCost - (plan?.availableGold || 0))} more gold.`;
    }

    const missingSiloSlots = Number.isFinite(plan?.minimumRequiredSiloSlots)
      ? Math.max(0, Math.ceil(plan.minimumRequiredSiloSlots - plan.budgetSiloSlots))
      : 0;
    const missingGold = Number.isFinite(plan?.minimumRequiredGold)
      ? Math.max(0, plan.minimumRequiredGold - plan.budgetGold)
      : 0;
    if (missingSiloSlots > 0 && missingGold > 0) {
      return `Need ${formatAutoNukeGold(missingGold)} more gold and ${missingSiloSlots} more missile silo ${missingSiloSlots === 1 ? "slot" : "slots"} for this tier.`;
    }
    if (missingSiloSlots > 0) {
      return `Need ${missingSiloSlots} more missile silo ${missingSiloSlots === 1 ? "slot" : "slots"} for this tier.`;
    }
    if (missingGold > 0) {
      return `Need ${formatAutoNukeGold(missingGold)} more gold for this tier.`;
    }

    return "No safe plan.";
  }

  function getAutoNukePlanMetrics(plan) {
    return plan?.metrics || finalizeAutoNukePlanMetrics(null, plan?.shots?.length || 0, plan?.cost || 0);
  }

  function formatAutoNukePlanMeta(mode, plan) {
    const metrics = getAutoNukePlanMetrics(plan);
    const shotCount = metrics.shotCount || plan?.shots?.length || 0;
    const nukeLabel = shotCount === 1 ? "nuke" : "nukes";
    const parts = [
      `${shotCount} ${nukeLabel}`,
      `${formatAutoNukeGold(metrics.cost || plan?.cost || 0)} gold`,
    ];

    if (mode === "population" || mode === "destruction") {
      parts.push(`${formatAutoNukeMetric(metrics.populationDamage)} pop`);
    }
    if (mode === "economic" || mode === "destruction") {
      parts.push(`${formatAutoNukeMetric(metrics.economicDamage)} econ`);
    }
    if (mode === "sams" || mode === "destruction" || metrics.samsDestroyed > 0) {
      parts.push(`${metrics.samsDestroyed || 0} SAMs`);
    }
    if (mode === "destruction") {
      parts.push("multi-wave");
    } else if (mode === "sams") {
      parts.push("SAM waves");
    }

    return parts.join(" | ");
  }

  function enforceAutoNukeTierPlanOrder(entries) {
    const sortedEntries = entries
      .filter((entry) => entry.tierId)
      .sort((a, b) => getAutoNukeTierRank(a.tierId) - getAutoNukeTierRank(b.tierId));
    let strongestLowerPlan = null;

    for (const entry of sortedEntries) {
      const plan = entry.plan;
      const planShotCount = plan?.metrics?.shotCount || plan?.shots?.length || 0;
      const lowerShotCount =
        strongestLowerPlan?.metrics?.shotCount || strongestLowerPlan?.shots?.length || 0;

      if (!entry.reason && plan?.shots?.length && strongestLowerPlan && planShotCount < lowerShotCount) {
        entry.plan = strongestLowerPlan;
      }

      if (!entry.reason && entry.plan?.shots?.length) {
        const entryShotCount =
          entry.plan?.metrics?.shotCount || entry.plan?.shots?.length || 0;
        const currentBestShotCount =
          strongestLowerPlan?.metrics?.shotCount || strongestLowerPlan?.shots?.length || 0;
        if (!strongestLowerPlan || entryShotCount >= currentBestShotCount) {
          strongestLowerPlan = entry.plan;
        }
      }
    }
  }

  function renderAutoNukeButton(button, mode, tierId, plan, reason = "") {
    const tier = getAutoNukeTierById(tierId);
    const label = document.createElement("span");
    label.className = "openfront-helper-auto-nuke-label";
    label.textContent = mode === "sams"
      ? getAutoNukeModeLabel(mode)
      : `${getAutoNukeModeLabel(mode)} - ${tier.label}`;

    const meta = document.createElement("span");
    meta.className = "openfront-helper-auto-nuke-meta";

    if (reason) {
      button.disabled = true;
      button.title = reason;
      meta.textContent = reason;
    } else if (!plan?.shots?.length || plan.score <= 0) {
      const emptyReason = "No valid plan.";
      button.disabled = true;
      button.title = emptyReason;
      meta.textContent = emptyReason;
    } else {
      const metaText = formatAutoNukePlanMeta(mode, plan);
      button.disabled = false;
      button.title = metaText;
      meta.textContent = metaText;
    }

    button.replaceChildren(label, meta);
  }

  function renderAutoNukeLoadingButton(button, mode, tierId) {
    const tier = tierId ? getAutoNukeTierById(tierId) : null;
    const label = document.createElement("span");
    label.className = "openfront-helper-auto-nuke-label";
    label.textContent = mode === "sams"
      ? getAutoNukeModeLabel(mode)
      : `${getAutoNukeModeLabel(mode)} - ${tier?.label || "High"}`;

    const meta = document.createElement("span");
    meta.className = "openfront-helper-auto-nuke-meta";
    meta.textContent = "Calculating...";

    button.disabled = true;
    button.title = "Calculating auto nuke plan";
    button.replaceChildren(label, meta);
  }

  function renderAutoNukeExpandButton(button, reason = "") {
    const label = document.createElement("span");
    label.className = "openfront-helper-auto-nuke-label";
    label.textContent = "Auto nuke";

    const meta = document.createElement("span");
    meta.className = "openfront-helper-auto-nuke-meta";
    meta.textContent = reason || "Show auto nuke options";

    button.disabled = Boolean(reason);
    button.title = reason || "Calculate auto nuke plans";
    button.replaceChildren(label, meta);
  }

  function waitForAutoNukeMenuFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  function isAutoNukeMenuComputeActive(menu, params, computeId) {
    return (
      autoNukeContextMenuComputeId === computeId &&
      autoNukeContextMenuParams === params &&
      !menu.hidden
    );
  }

  function setAutoNukeMenuLoading(menu, visible, progress = 0, text = "") {
    const loading = menu.querySelector("[data-auto-nuke-loading]");
    const fill = menu.querySelector("[data-auto-nuke-loading-fill]");
    const textElement = menu.querySelector("[data-auto-nuke-loading-text]");
    if (loading instanceof HTMLElement) {
      loading.hidden = !visible;
    }
    if (fill instanceof HTMLElement) {
      fill.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
    }
    if (textElement instanceof HTMLElement) {
      textElement.textContent = text;
    }
  }

  function setAutoNukeModeButtonsHidden(menu, hidden) {
    for (const button of menu.querySelectorAll("[data-auto-nuke-mode]")) {
      if (button instanceof HTMLButtonElement) {
        button.hidden = hidden;
      }
    }
  }

  function setAutoNukeSectionLabelsHidden(menu, hidden) {
    for (const section of menu.querySelectorAll("[data-auto-nuke-section-label]")) {
      if (section instanceof HTMLElement) {
        section.hidden = hidden;
      }
    }
  }

  async function expandAutoNukeContextMenu(menu) {
    const params = autoNukeContextMenuParams;
    if (!params) {
      return;
    }
    const computeId = ++autoNukeContextMenuComputeId;

    const expandButton = menu.querySelector("[data-auto-nuke-expand]");
    if (expandButton instanceof HTMLButtonElement) {
      expandButton.hidden = true;
    }
    setAutoNukeSectionLabelsHidden(menu, false);
    setAutoNukeMenuLoading(menu, true, 0.02, "Preparing auto nuke plans...");

    const reason = getAutoNukeContextMenuDisableReason(params);
    params.autoNukePlans = {};
    const buttons = Array.from(menu.querySelectorAll("[data-auto-nuke-mode]"))
      .filter((button) => button instanceof HTMLButtonElement);
    const buttonsByMode = new Map();

    for (const button of buttons) {
      const mode = button.dataset.autoNukeMode;
      const tierId = button.dataset.autoNukeTier;
      button.hidden = false;
      renderAutoNukeLoadingButton(button, mode, tierId);
      if (!buttonsByMode.has(mode)) {
        buttonsByMode.set(mode, []);
      }
      buttonsByMode.get(mode).push(button);
    }

    positionAutoNukeContextMenu(
      menu,
      Number.parseFloat(menu.style.left) || 6,
      Number.parseFloat(menu.style.top) || 6,
    );

    await waitForAutoNukeMenuFrame();
    if (!isAutoNukeMenuComputeActive(menu, params, computeId)) {
      return;
    }

    if (reason) {
      for (const button of buttons) {
        renderAutoNukeButton(
          button,
          button.dataset.autoNukeMode,
          button.dataset.autoNukeTier,
          null,
          reason,
        );
      }
      setAutoNukeMenuLoading(menu, false);
      positionAutoNukeContextMenu(
        menu,
        Number.parseFloat(menu.style.left) || 6,
        Number.parseFloat(menu.style.top) || 6,
      );
      return;
    }

    const modeOrder = ["economic", "population", "sams", "destruction"]
      .filter((mode) => buttonsByMode.has(mode));
    const totalSteps = modeOrder.length + buttons.length;
    let completedSteps = 0;

    for (const mode of modeOrder) {
      const modeButtons = buttonsByMode.get(mode) || [];
      setAutoNukeMenuLoading(
        menu,
        true,
        completedSteps / Math.max(1, totalSteps),
        `Calculating ${getAutoNukeModeLabel(mode)}...`,
      );
      await waitForAutoNukeMenuFrame();
      if (!isAutoNukeMenuComputeActive(menu, params, computeId)) {
        return;
      }

      const candidatePool = computeAutoNukeCandidatePool(
        params.game,
        params.selected,
        mode,
      );
      completedSteps++;
      const modeEntries = [];

      for (const button of modeButtons) {
        if (!isAutoNukeMenuComputeActive(menu, params, computeId)) {
          return;
        }

        const tierId = button.dataset.autoNukeTier;
        const tierOptions = getAutoNukeTierPlanOptions(params, tierId);
        const plan = tierOptions.reason
          ? null
          : buildAutoNukePlanForMode(
            params.game,
            params.selected,
            mode,
            getAutoNukeBuildPlanOptions(mode, tierOptions),
            candidatePool,
          );

        modeEntries.push({
          button,
          mode,
          tierId,
          plan,
          reason: tierOptions.reason,
        });
      }

      enforceAutoNukeTierPlanOrder(modeEntries);

      for (const entry of modeEntries) {
        if (!isAutoNukeMenuComputeActive(menu, params, computeId)) {
          return;
        }

        const planKey = getAutoNukePlanKey(entry.mode, entry.tierId);
        if (entry.plan) {
          params.autoNukePlans[planKey] = entry.plan;
        }

        const buttonReason = entry.reason ||
          (!entry.plan?.shots?.length || entry.plan.score <= 0
            ? getAutoNukePlanFailureReason(params, entry.plan)
            : "");
        renderAutoNukeButton(
          entry.button,
          entry.mode,
          entry.tierId,
          entry.plan,
          buttonReason,
        );

        completedSteps++;
        setAutoNukeMenuLoading(
          menu,
          true,
          completedSteps / Math.max(1, totalSteps),
          `Calculated ${getAutoNukeModeLabel(mode)}`,
        );
        positionAutoNukeContextMenu(
          menu,
          Number.parseFloat(menu.style.left) || 6,
          Number.parseFloat(menu.style.top) || 6,
        );
        await waitForAutoNukeMenuFrame();
      }
    }

    if (!isAutoNukeMenuComputeActive(menu, params, computeId)) {
      return;
    }
    setAutoNukeMenuLoading(menu, false);
    positionAutoNukeContextMenu(
      menu,
      Number.parseFloat(menu.style.left) || 6,
      Number.parseFloat(menu.style.top) || 6,
    );
  }

  function positionAutoNukeContextMenu(menu, x, y) {
    menu.hidden = false;
    menu.style.left = "0px";
    menu.style.top = "0px";

    const rect = menu.getBoundingClientRect();
    const left = Math.min(Math.max(6, x), window.innerWidth - rect.width - 6);
    const top = Math.min(Math.max(6, y), window.innerHeight - rect.height - 6);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function showAutoNukeContextMenu(x, y, params) {
    const menu = ensureAutoNukeContextMenu();
    autoNukeContextMenuParams = params;

    const reason = getAutoNukeContextMenuDisableReason(params);
    params.autoNukePlans = {};
    const expandButton = menu.querySelector("[data-auto-nuke-expand]");
    if (expandButton instanceof HTMLButtonElement) {
      expandButton.hidden = false;
      renderAutoNukeExpandButton(expandButton, reason);
    }
    setAutoNukeModeButtonsHidden(menu, true);
    setAutoNukeSectionLabelsHidden(menu, true);

    positionAutoNukeContextMenu(menu, x, y);
  }

  function getAutoNukeRadialElement() {
    return document.querySelector("main-radial-menu");
  }

  function getAutoNukeBuildMenu(radialMenuElement) {
    return radialMenuElement?.buildMenu || document.querySelector("build-menu");
  }

  function getAutoNukeContextParamsFromEvent(event) {
    const radialMenuElement = getAutoNukeRadialElement();
    const game = radialMenuElement?.game || lastOpenFrontGameContext?.game;
    const transform =
      radialMenuElement?.transformHandler ||
      radialMenuElement?.transform ||
      lastOpenFrontGameContext?.transform;
    const myPlayer = game?.myPlayer?.();
    const buildMenu = getAutoNukeBuildMenu(radialMenuElement);
    if (
      !game ||
      !transform?.screenToWorldCoordinates ||
      !myPlayer?.isPlayer?.() ||
      !buildMenu?.sendBuildOrUpgrade
    ) {
      return null;
    }

    let worldCoords = null;
    try {
      worldCoords = transform.screenToWorldCoordinates(event.clientX, event.clientY);
      if (!game.isValidCoord?.(worldCoords.x, worldCoords.y)) {
        return null;
      }
    } catch (_error) {
      return null;
    }

    let tile = null;
    let selected = null;
    try {
      tile = game.ref(worldCoords.x, worldCoords.y);
      const owner = game.owner(tile);
      selected = owner?.isPlayer?.() ? owner : null;
    } catch (_error) {
      return null;
    }

    if (!selected?.isPlayer?.()) {
      return null;
    }

    return {
      myPlayer,
      selected,
      tile,
      playerActions: { buildableUnits: [] },
      game,
      buildMenu,
      closeMenu: hideAutoNukeContextMenu,
    };
  }

  function handleAutoNukeContextMenu(event) {
    if (!autoNukeEnabled) {
      return;
    }

    const params = getAutoNukeContextParamsFromEvent(event);
    if (!params) {
      hideAutoNukeContextMenu();
      return;
    }

    showAutoNukeContextMenu(event.clientX + 108, event.clientY - 58, params);
  }

  function handleAutoNukeDocumentPointerDown(event) {
    const menu = document.getElementById(AUTO_NUKE_CONTEXT_MENU_ID);
    if (!menu || menu.hidden || menu.contains(event.target)) {
      return;
    }
    hideAutoNukeContextMenu();
  }

  function handleAutoNukeDocumentKeyDown(event) {
    if (event.key === "Escape") {
      hideAutoNukeContextMenu();
    }
  }

  function installAutoNukeContextMenu() {
    if (autoNukeContextMenuInstalled) {
      return;
    }

    autoNukeContextMenuInstalled = true;
    document.addEventListener("contextmenu", handleAutoNukeContextMenu, true);
    document.addEventListener("pointerdown", handleAutoNukeDocumentPointerDown, true);
    document.addEventListener("keydown", handleAutoNukeDocumentKeyDown, true);
    window.addEventListener("blur", hideAutoNukeContextMenu);
    window.addEventListener("wheel", hideAutoNukeContextMenu, true);
  }

  function uninstallAutoNukeContextMenu() {
    if (!autoNukeContextMenuInstalled) {
      return;
    }

    autoNukeContextMenuInstalled = false;
    document.removeEventListener("contextmenu", handleAutoNukeContextMenu, true);
    document.removeEventListener("pointerdown", handleAutoNukeDocumentPointerDown, true);
    document.removeEventListener("keydown", handleAutoNukeDocumentKeyDown, true);
    window.removeEventListener("blur", hideAutoNukeContextMenu);
    window.removeEventListener("wheel", hideAutoNukeContextMenu, true);
    hideAutoNukeContextMenu();
    hideAutoNukeFollowupPrompt();
    if (autoNukeFollowupPromptTimeout !== null) {
      window.clearTimeout(autoNukeFollowupPromptTimeout);
      autoNukeFollowupPromptTimeout = null;
    }
  }

  function createAutoNukeMenuItem(mode, placement) {
    const isEconomic = mode === "economic";
    const isDestruction = mode === "destruction";
    const isSamClear = mode === "sams";
    return {
      id: `${AUTO_NUKE_MENU_ITEM_PREFIX}-${placement}-${mode}`,
      name: isEconomic
        ? "auto econ nuke"
        : isDestruction
          ? "total destruction nuke"
          : isSamClear ? "destroy all sams" : "auto population nuke",
      text: isEconomic
        ? "Auto Econ"
        : isDestruction ? "Destroy" : isSamClear ? "SAMs" : "Auto Pop",
      fontSize: "10px",
      color: isEconomic
        ? "#16a34a"
        : isDestruction ? "#ca8a04" : isSamClear ? "#0284c7" : "#dc2626",
      tooltipItems: [
        {
          text: isEconomic
            ? "Auto econ nuke"
            : isDestruction
              ? "Total destruction nuke"
              : isSamClear ? "Destroy all SAMs" : "Auto population nuke",
          className: "title",
        },
        {
          text: isEconomic
            ? "Fires at the best valid economy suggestion."
            : isDestruction
              ? "Fires at combined population and economy damage, then retries once after silo cooldown."
              : isSamClear
                ? "Fires SAM-clear waves and stops before population or economy targets."
              : "Fires at the best valid population suggestion.",
          className: "description",
        },
      ],
      disabled: isAutoNukeRadialItemDisabled,
      action: (params) =>
        executeAutoNuke(params, mode, isDestruction ? "high" : null),
    };
  }

  function createAutoNukeMenuItems(params, placement) {
    if (!isAutoNukeRadialTarget(params)) {
      return [];
    }

    return [
      createAutoNukeMenuItem("economic", placement),
      createAutoNukeMenuItem("population", placement),
      createAutoNukeMenuItem("sams", placement),
      createAutoNukeMenuItem("destruction", placement),
    ];
  }

  function menuItemsContainManualNukeActions(menuItems) {
    return menuItems.some((item) => {
      const itemText = String(item?.text || item?.name || item?.id || "");
      return /atom|hydrogen|mirv|nuke/i.test(itemText);
    });
  }

  function patchAutoNukeAttackMenuItem(menuItem) {
    if (
      !menuItem ||
      typeof menuItem.subMenu !== "function" ||
      autoNukeOriginalAttackSubMenus.has(menuItem)
    ) {
      return;
    }

    const originalSubMenu = menuItem.subMenu;
    menuItem.subMenu = function openFrontHelperAutoNukeAttackSubMenu(params) {
      const menuItems = Array.from(originalSubMenu.call(this, params) || []);
      if (!autoNukeEnabled || !menuItemsContainManualNukeActions(menuItems)) {
        return menuItems;
      }

      const existingIds = new Set(menuItems.map((item) => String(item?.id || "")));
      const autoNukeItems = createAutoNukeMenuItems(params, "attack").filter(
        (item) => !existingIds.has(item.id),
      );
      return autoNukeItems.length > 0
        ? [...menuItems, ...autoNukeItems]
        : menuItems;
    };

    autoNukeOriginalAttackSubMenus.set(menuItem, originalSubMenu);
  }

  function patchAutoNukeAttackSubMenus(menuItems) {
    for (const menuItem of menuItems) {
      if (typeof menuItem?.subMenu !== "function") {
        continue;
      }

      const menuText = String(menuItem?.id || menuItem?.name || menuItem?.text || "");
      if (/attack/i.test(menuText)) {
        patchAutoNukeAttackMenuItem(menuItem);
      }
    }
  }

  function getAutoNukeRadialRootMenu() {
    const radialMenuElement = document.querySelector("main-radial-menu");
    return radialMenuElement?.radialMenu?.rootMenu || null;
  }

  function patchAutoNukeRootMenu(rootMenu) {
    if (
      !rootMenu ||
      typeof rootMenu.subMenu !== "function" ||
      autoNukeOriginalRootSubMenus.has(rootMenu)
    ) {
      return false;
    }

    const originalSubMenu = rootMenu.subMenu;
    rootMenu.subMenu = function openFrontHelperAutoNukeRootSubMenu(params) {
      const menuItems = Array.from(originalSubMenu.call(this, params) || []);
      patchAutoNukeAttackSubMenus(menuItems);
      if (!autoNukeEnabled) {
        return menuItems;
      }

      const existingIds = new Set(menuItems.map((item) => String(item?.id || "")));
      const autoNukeItems = createAutoNukeMenuItems(params, "root").filter(
        (item) => !existingIds.has(item.id),
      );
      return autoNukeItems.length > 0
        ? [...menuItems, ...autoNukeItems]
        : menuItems;
    };

    autoNukeOriginalRootSubMenus.set(rootMenu, originalSubMenu);
    return true;
  }

  function restoreAutoNukeRootMenus() {
    for (const [menuItem, originalSubMenu] of autoNukeOriginalAttackSubMenus) {
      if (menuItem?.subMenu) {
        menuItem.subMenu = originalSubMenu;
      }
    }
    autoNukeOriginalAttackSubMenus.clear();

    for (const [rootMenu, originalSubMenu] of autoNukeOriginalRootSubMenus) {
      if (rootMenu?.subMenu) {
        rootMenu.subMenu = originalSubMenu;
      }
    }
    autoNukeOriginalRootSubMenus.clear();
  }

  function scheduleAutoNukePatchRetry() {
    if (!autoNukeEnabled || autoNukePatchTimeout !== null) {
      return;
    }

    autoNukePatchTimeout = window.setTimeout(() => {
      autoNukePatchTimeout = null;
      syncAutoNukeRadialMenuPatch();
    }, AUTO_NUKE_PATCH_RETRY_MS);
  }

  function syncAutoNukeRadialMenuPatch() {
    if (!autoNukeEnabled) {
      restoreAutoNukeRootMenus();
      return;
    }

    const rootMenu = getAutoNukeRadialRootMenu();
    if (!rootMenu) {
      scheduleAutoNukePatchRetry();
      return;
    }

    patchAutoNukeRootMenu(rootMenu);
    scheduleAutoNukePatchRetry();
  }

  function setAutoNukeEnabled(enabled) {
    autoNukeEnabled = Boolean(enabled);
    if (autoNukePatchTimeout !== null) {
      window.clearTimeout(autoNukePatchTimeout);
      autoNukePatchTimeout = null;
    }

    restoreAutoNukeRootMenus();
    if (!autoNukeEnabled) {
      uninstallAutoNukeContextMenu();
      return;
    }

    installAutoNukeContextMenu();
  }

  function syncNukeSuggestions() {
    if (!nukeSuggestionsEnabled) {
      document.getElementById(NUKE_SUGGESTION_CONTAINER_ID)?.remove();
      nukeSuggestionAnimationFrame = null;
      clearNukeSuggestionState();
      return;
    }

    const container = ensureNukeSuggestionContainer();
    const overlay = getHoveredPlayerInfoOverlay();
    const game = overlay?.game;
    const transform = overlay?.transform;
    const targetPlayer = overlay?.player;

    if (
      !game ||
      !transform ||
      !targetPlayer?.isPlayer?.() ||
      !isEnemyNukeSuggestionTarget(game, targetPlayer)
    ) {
      clearNukeSuggestionState(container);
      nukeSuggestionAnimationFrame = requestAnimationFrame(syncNukeSuggestions);
      return;
    }

    const now = performance.now();
    const signature = getNukeSuggestionSignature(game, targetPlayer);
    if (
      signature !== lastNukeSuggestionSignature ||
      now - lastNukeSuggestionComputedAt >= NUKE_SUGGESTION_REFRESH_MS
    ) {
      currentNukeSuggestionResults = computeNukeSuggestions(game, targetPlayer);
      lastNukeSuggestionSignature = signature;
      lastNukeSuggestionComputedAt = now;
    }

    renderNukeSuggestions(container, game, transform, currentNukeSuggestionResults);
    nukeSuggestionAnimationFrame = requestAnimationFrame(syncNukeSuggestions);
  }

  function setNukeSuggestionsEnabled(enabled) {
    nukeSuggestionsEnabled = Boolean(enabled);
    if (!nukeSuggestionsEnabled) {
      if (nukeSuggestionAnimationFrame !== null) {
        cancelAnimationFrame(nukeSuggestionAnimationFrame);
      }
      nukeSuggestionAnimationFrame = null;
      document.getElementById(NUKE_SUGGESTION_CONTAINER_ID)?.remove();
      clearNukeSuggestionState();
      return;
    }

    if (nukeSuggestionAnimationFrame === null) {
      syncNukeSuggestions();
    }
  }
