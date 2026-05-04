const ANALYTICS_DEFAULT_CONFIG = {
  enabled: false,
  measurementId: "",
  apiSecret: "",
  endpoint: "https://www.google-analytics.com/mp/collect",
  debugEndpoint: "https://www.google-analytics.com/debug/mp/collect",
  debug: false,
};

const ANALYTICS_CONFIG = {
  ...ANALYTICS_DEFAULT_CONFIG,
  ...(globalThis.OPENFRONT_ANALYTICS_CONFIG || {}),
};

const ANALYTICS_CLIENT_ID_KEY = "analyticsClientId";
const ANALYTICS_SETTINGS_KEY = "settings";

function isAnalyticsConfigured() {
  return Boolean(
    ANALYTICS_CONFIG.enabled &&
      ANALYTICS_CONFIG.measurementId &&
      ANALYTICS_CONFIG.apiSecret &&
      getAnalyticsEndpoint(),
  );
}

function getAnalyticsEndpoint() {
  return ANALYTICS_CONFIG.debug
    ? ANALYTICS_CONFIG.debugEndpoint
    : ANALYTICS_CONFIG.endpoint;
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

function sanitizeAnalyticsUserProperties(userProperties = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(userProperties || {})) {
    const propertyName = String(key).replace(/[^A-Za-z0-9_]/g, "_").slice(0, 24);
    if (!propertyName || value === undefined || value === null) {
      continue;
    }
    sanitized[propertyName] = {
      value:
        typeof value === "boolean" || typeof value === "number"
          ? String(value)
          : String(value).slice(0, 36),
    };
  }
  return sanitized;
}

function getAnalyticsDebugMode() {
  return ANALYTICS_CONFIG.debug === true;
}

function getAnalyticsLanguage() {
  return chrome.i18n?.getUILanguage?.() || "unknown";
}

function getAnalyticsSessionId() {
  return Math.floor(Date.now() / 1000);
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

async function trackAnalyticsEvent(name, params = {}, options = {}) {
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
  const url = new URL(getAnalyticsEndpoint());
  url.searchParams.set("measurement_id", ANALYTICS_CONFIG.measurementId);
  url.searchParams.set("api_secret", ANALYTICS_CONFIG.apiSecret);
  const eventParams = {
    language: getAnalyticsLanguage(),
    engagement_time_msec: 1,
    session_id: getAnalyticsSessionId(),
    extension_version: chrome.runtime.getManifest().version,
    ...sanitizeAnalyticsParams(params),
  };
  if (getAnalyticsDebugMode()) {
    eventParams.debug_mode = 1;
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      user_properties: sanitizeAnalyticsUserProperties(options.userProperties),
      events: [
        {
          name: eventName,
          params: eventParams,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Analytics request failed with status ${response.status}`);
  }

  if (getAnalyticsDebugMode()) {
    const result = await response.json().catch(() => null);
    const validationMessages = Array.isArray(result?.validationMessages)
      ? result.validationMessages
      : [];
    if (validationMessages.length > 0) {
      throw new Error(
        `Analytics validation failed: ${validationMessages
          .map((message) => message.description || message.validationCode || "unknown issue")
          .join("; ")}`,
      );
    }
  }
}
