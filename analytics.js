const ANALYTICS_CONFIG = {
  enabled: false,
  measurementId: "",
  apiSecret: "",
};

const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
const ANALYTICS_SETTINGS_KEY = "settings";
const ANALYTICS_ENDPOINT = "https://www.google-analytics.com/mp/collect";

function isAnalyticsConfigured() {
  return Boolean(
    ANALYTICS_CONFIG.enabled &&
      ANALYTICS_CONFIG.measurementId &&
      ANALYTICS_CONFIG.apiSecret,
  );
}

async function isAnalyticsOptedIn() {
  const stored = await chrome.storage.local.get(ANALYTICS_SETTINGS_KEY);
  return stored[ANALYTICS_SETTINGS_KEY]?.analyticsEnabled === true;
}

function sanitizeAnalyticsEventName(name) {
  const eventName = String(name || "").replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z]/.test(eventName)) {
    return null;
  }
  return eventName.slice(0, 40);
}

function sanitizeAnalyticsParams(params = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(params || {})) {
    const paramName = String(key).replace(/[^A-Za-z0-9_]/g, "_").slice(0, 40);
    if (!paramName || value === undefined || value === null) {
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      sanitized[paramName] = value;
      continue;
    }
    sanitized[paramName] = String(value).slice(0, 100);
  }
  return sanitized;
}

async function getAnalyticsClientId() {
  const stored = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY);
  if (typeof stored[ANALYTICS_CLIENT_ID_KEY] === "string") {
    return stored[ANALYTICS_CLIENT_ID_KEY];
  }

  const clientId = crypto.randomUUID();
  await chrome.storage.local.set({
    [ANALYTICS_CLIENT_ID_KEY]: clientId,
  });
  return clientId;
}

async function trackAnalyticsEvent(name, params = {}) {
  if (!isAnalyticsConfigured()) {
    return;
  }

  const eventName = sanitizeAnalyticsEventName(name);
  if (!eventName) {
    return;
  }

  if (!(await isAnalyticsOptedIn())) {
    return;
  }

  const clientId = await getAnalyticsClientId();
  const url = new URL(ANALYTICS_ENDPOINT);
  url.searchParams.set("measurement_id", ANALYTICS_CONFIG.measurementId);
  url.searchParams.set("api_secret", ANALYTICS_CONFIG.apiSecret);

  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      events: [
        {
          name: eventName,
          params: {
            extension_version: chrome.runtime.getManifest().version,
            ...sanitizeAnalyticsParams(params),
          },
        },
      ],
    }),
  });
}
