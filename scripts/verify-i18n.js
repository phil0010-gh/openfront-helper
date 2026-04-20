const fs = require("fs");
const path = require("path");

const english = JSON.parse(fs.readFileSync(path.join("locales", "en", "common.json"), "utf8"));
const englishKeys = Object.keys(english);
const localeIssues = [];

for (const locale of fs.readdirSync("locales")) {
  const file = path.join("locales", locale, "common.json");
  if (!fs.existsSync(file)) {
    continue;
  }

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const missing = englishKeys.filter((key) => !(key in data));
  const extra = Object.keys(data).filter((key) => !(key in english));
  if (missing.length || extra.length) {
    localeIssues.push({ locale, missing, extra });
  }
}

const popupHtml = fs.readFileSync("popup.html", "utf8");
const popupText = Array.from(
  popupHtml.matchAll(/>([^<>]*[A-Za-z][^<>]*)</g),
  (match) => match[1].replace(/\s+/g, " ").trim(),
).filter(Boolean);
const popupAttributes = Array.from(
  popupHtml.matchAll(/(?:aria-label|title|placeholder|data-info-title)="([^"]*[A-Za-z][^"]*)"/g),
  (match) => match[1].trim(),
);
const ignoredPopupValues = new Set([
  "A",
  "EN",
  "i",
  "00:00",
  "v2.0.1",
  "If",
  "openfront.io",
  "was already open when you installed this extension, reload that tab once. Otherwise the extension will not work on that tab.",
]);
const missingPopupKeys = Array.from(
  new Set(
    [...popupText, ...popupAttributes].filter(
      (value) => !(value in english) && !ignoredPopupValues.has(value),
    ),
  ),
);

const floatingHelpers = fs.readFileSync(path.join("content", "floating-helpers.js"), "utf8");
const missingFloatingKeys = Array.from(
  new Set(
    Array.from(floatingHelpers.matchAll(/(?<![A-Za-z0-9_])t\("([^"]+)"\)/g), (match) => match[1]).filter(
      (key) => !(key in english),
    ),
  ),
);

const result = {
  locales: fs.readdirSync("locales").filter((locale) =>
    fs.existsSync(path.join("locales", locale, "common.json")),
  ).length,
  keys: englishKeys.length,
  localeIssues,
  missingPopupKeys,
  missingFloatingKeys,
};

console.log(JSON.stringify(result, null, 2));

if (
  localeIssues.length ||
  missingPopupKeys.length ||
  missingFloatingKeys.length
) {
  process.exitCode = 1;
}
