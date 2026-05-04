// Reports a best-effort stable lobby chat room id from the page context.

  let lastReportedChatContextSignature = "";

  function readChatContextCandidate(target, keys) {
    if (!target) {
      return "";
    }

    for (const key of keys) {
      try {
        const rawValue = target[key];
        const value = typeof rawValue === "function" ? rawValue.call(target) : rawValue;
        if (typeof value === "string" || typeof value === "number") {
          const normalized = String(value).trim();
          if (normalized) {
            return normalized;
          }
        }
      } catch (_error) {
        // Some OpenFront properties are getters that can throw outside their state.
      }
    }

    return "";
  }

  function getChatContextConfig(game) {
    try {
      const rawConfig = game?.config;
      const config = typeof rawConfig === "function" ? rawConfig.call(game) : rawConfig;
      return config && typeof config === "object" ? config : null;
    } catch (_error) {
      return null;
    }
  }

  function normalizeChatRoomId(value) {
    const normalized = String(value || "")
      .trim()
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96);
    return normalized || null;
  }

  function normalizeOpenFrontChatDisplayName(value) {
    const normalized = String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 32);
    if (!normalized || normalized === "Unknown") {
      return null;
    }
    return normalized;
  }

  function formatOpenFrontChatDisplayName(username, clanTag) {
    const normalizedUsername = normalizeOpenFrontChatDisplayName(username);
    if (!normalizedUsername) {
      return null;
    }

    const normalizedClanTag = String(clanTag || "")
      .trim()
      .replace(/^\[|\]$/g, "")
      .slice(0, 5);
    return normalizeOpenFrontChatDisplayName(
      normalizedClanTag ? `[${normalizedClanTag}] ${normalizedUsername}` : normalizedUsername,
    );
  }

  function getOpenFrontChatRoomId(game) {
    const idKeys = [
      "gameID",
      "gameId",
      "game_id",
      "lobbyID",
      "lobbyId",
      "lobby_id",
      "matchID",
      "matchId",
      "match_id",
      "id",
    ];
    const directId = readChatContextCandidate(game, idKeys);
    if (directId) {
      return normalizeChatRoomId(directId);
    }

    const config = getChatContextConfig(game);
    const configId = readChatContextCandidate(config, idKeys);
    if (configId) {
      return normalizeChatRoomId(configId);
    }

    return null;
  }

  function getOpenFrontChatDisplayNameFromGame(game) {
    try {
      const myPlayer = game?.myPlayer?.();
      if (!myPlayer?.isPlayer?.()) {
        return null;
      }

      if (typeof getPlayerDisplayName === "function") {
        const displayName = normalizeOpenFrontChatDisplayName(
          getPlayerDisplayName(myPlayer),
        );
        if (displayName) {
          return displayName;
        }
      }

      const username = readChatContextCandidate(myPlayer, ["name", "username", "userName"]);
      const clanTag = readChatContextCandidate(myPlayer, [
        "clanTag",
        "clan_tag",
        "clan",
        "tag",
      ]);
      return formatOpenFrontChatDisplayName(username, clanTag);
    } catch (_error) {
      return null;
    }
  }

  function getOpenFrontChatDisplayNameFromUsernameInput() {
    const usernameInput = document.querySelector("username-input");
    if (!usernameInput) {
      return null;
    }

    const username = readChatContextCandidate(usernameInput, [
      "getUsername",
      "username",
      "value",
    ]);
    const clanTag = readChatContextCandidate(usernameInput, [
      "getClanTag",
      "clanTag",
      "clan_tag",
      "clan",
      "tag",
    ]);
    return formatOpenFrontChatDisplayName(username, clanTag);
  }

  function getOpenFrontChatDisplayName(game) {
    return (
      getOpenFrontChatDisplayNameFromGame(game) ||
      getOpenFrontChatDisplayNameFromUsernameInput()
    );
  }

  function reportOpenFrontChatContext() {
    const game = lastOpenFrontGameContext?.game || findOpenFrontGameContextInDom()?.game;
    const roomId = getOpenFrontChatRoomId(game);
    const defaultDisplayName = getOpenFrontChatDisplayName(game);
    const signature = `${roomId || ""}|${defaultDisplayName || ""}`;
    if (signature === lastReportedChatContextSignature) {
      return;
    }

    lastReportedChatContextSignature = signature;
    postToExtension("LOBBY_CHAT_CONTEXT", {
      roomId,
      defaultDisplayName,
    });
  }
