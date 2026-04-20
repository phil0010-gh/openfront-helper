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

localizeGameFoundWindow().catch((error) => {
  console.error("Failed to localize game found window:", error);
});

chrome.storage.local.get("joinNotificationSoundData", (result) => {
  if (result.joinNotificationSoundData) {
    new Audio(result.joinNotificationSoundData).play().catch(() => {});
  }
});

setTimeout(() => window.close(), 6000);
