// Thin bridge: React floating panel bundle registers __openfrontSyncFloatingHelpersPanel.

function syncFloatingHelpersPanel() {
  const fn = globalThis.__openfrontSyncFloatingHelpersPanel;
  if (typeof fn === "function") {
    fn();
  }
}
