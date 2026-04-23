async function localizeGameFoundWindow() {
  const shared = globalThis.OpenFrontHelperSettings;
  const i18n = globalThis.OpenFrontHelperI18n;
  if (!shared || !i18n) {
    return;
  }

  const stored = await chrome.storage.local.get(shared.STORAGE_KEY);
  const settings = shared.normalizeSettings(stored[shared.STORAGE_KEY]);
  const translations = await i18n.loadBundle(settings.language);
  document.documentElement.lang = settings.language;
  i18n.localizeElement(document.body, translations);
  document.title = i18n.getMessage(translations, "Game Found!");
  const subtitle = document.querySelector(".sub");
  if (subtitle) {
    subtitle.textContent = i18n.getMessage(translations, "Joining now...");
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function playAudioWithRetries(src) {
  if (!src) {
    return false;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.currentTime = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await audio.play();
      return true;
    } catch (_error) {
      audio.load();
      await delay(160 + attempt * 220);
    }
  }

  return false;
}

async function playGameFoundSound() {
  try {
    const custom = await chrome.storage.local.get("joinNotificationSoundData");
    const customSrc =
      typeof custom.joinNotificationSoundData === "string"
        ? custom.joinNotificationSoundData
        : null;

    if (customSrc && (await playAudioWithRetries(customSrc))) {
      return;
    }

    await playAudioWithRetries(chrome.runtime.getURL("assets/autojoin.mp3"));
  } catch (_error) {
    // Ignore audio/storage errors in the ephemeral notification window.
  }
}

playGameFoundSound().catch(() => {});

localizeGameFoundWindow().catch((error) => {
  console.error("Failed to localize game found window:", error);
});

setTimeout(() => window.close(), 6000);
