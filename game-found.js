chrome.storage.local.get("joinNotificationSoundData", (result) => {
  if (result.joinNotificationSoundData) {
    new Audio(result.joinNotificationSoundData).play().catch(() => {});
  }
});

setTimeout(() => window.close(), 6000);
