// Reports a best-effort stable lobby chat room id from the page context.

  let lastReportedChatRoomId = null;

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

  function reportOpenFrontChatContext() {
    const game = lastOpenFrontGameContext?.game || findOpenFrontGameContextInDom()?.game;
    const roomId = getOpenFrontChatRoomId(game);
    if (roomId === lastReportedChatRoomId) {
      return;
    }

    lastReportedChatRoomId = roomId;
    postToExtension("LOBBY_CHAT_CONTEXT", {
      roomId,
    });
  }
