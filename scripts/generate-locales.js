const fs = require("fs");
const path = require("path");

require(path.join("..", "shared", "i18n.js"));

const english = globalThis.OpenFrontHelperI18n.DEFAULT_TRANSLATIONS;
const languageCodes = globalThis.OpenFrontHelperI18n.LANGUAGE_CODES;
const translatableKeys = Object.keys(english).filter(
  (key) => key !== "languageCode" && key !== "languageName",
);
const englishLanguageNames = new Intl.DisplayNames(["en"], { type: "language" });

function getEnglishLanguageName(languageCode) {
  if (languageCode === "tl") {
    return "Tagalog";
  }

  return englishLanguageNames.of(languageCode) || languageCode;
}

function encodeTranslationPayload(texts) {
  return texts
    .map((text, index) => `<x id="${String(index + 1).padStart(4, "0")}">${text}</x>`)
    .join("");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeTranslationText(text) {
  return String(text)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function parseTranslationPayload(translatedText, count) {
  const translated = new Array(count).fill(null);
  const pattern = /<x id="(\d+)">([\s\S]*?)<\/x>/g;

  for (let match = pattern.exec(translatedText); match; match = pattern.exec(translatedText)) {
    const index = Number(match[1]) - 1;
    if (Number.isInteger(index) && index >= 0 && index < translated.length) {
      translated[index] = decodeTranslationText(match[2].trimEnd());
    }
  }

  return translated;
}

async function translateChunk(languageCode, texts) {
  const query = encodeTranslationPayload(texts);
  const body = new URLSearchParams({
    q: query,
    langpair: `en|${languageCode}`,
  });

  const response = await fetch("https://api.mymemory.translated.net/get", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`Translation request failed for ${languageCode}: ${response.status}`);
  }

  const data = await response.json();
  const translatedText = String(data?.responseData?.translatedText ?? "");
  if (!translatedText) {
    throw new Error(`Empty translation response for ${languageCode}`);
  }

  const translated = parseTranslationPayload(translatedText, texts.length);
  if (translated.some((value) => value === null)) {
    throw new Error(`Incomplete translation response for ${languageCode}`);
  }

  return translated;
}

async function translateTexts(languageCode, texts) {
  if (texts.length === 0) {
    return [];
  }

  try {
    return await translateChunk(languageCode, texts);
  } catch (error) {
    if (texts.length === 1) {
      throw error;
    }

    const midpoint = Math.ceil(texts.length / 2);
    const left = await translateTexts(languageCode, texts.slice(0, midpoint));
    const right = await translateTexts(languageCode, texts.slice(midpoint));
    return [...left, ...right];
  }
}

async function buildLocale(languageCode) {
  if (languageCode === "en") {
    return english;
  }

  try {
    const requestedTexts = [
      ...translatableKeys.map((key) => english[key]),
      getEnglishLanguageName(languageCode),
    ];
    const translatedTexts = await translateTexts(languageCode, requestedTexts);
    const translations = Object.fromEntries(
      translatableKeys.map((key, index) => [key, translatedTexts[index]]),
    );

    return {
      languageCode,
      languageName: translatedTexts[translatedTexts.length - 1],
      ...translations,
    };
  } catch (error) {
    console.warn(`Falling back to English for ${languageCode}:`, error.message);
    return {
      ...english,
      languageCode,
      languageName: getEnglishLanguageName(languageCode),
    };
  }
}

async function main() {
  fs.mkdirSync("locales", { recursive: true });

  for (const languageCode of languageCodes) {
    const directory = path.join("locales", languageCode);
    fs.mkdirSync(directory, { recursive: true });

    const data = await buildLocale(languageCode);
    fs.writeFileSync(
      path.join(directory, "common.json"),
      `${JSON.stringify(data, null, 2)}\n`,
    );
    console.log(`wrote ${languageCode}`);
    await delay(250);
  }

  console.log(`created ${languageCodes.length} locale files`);
}

main().catch((error) => {
  console.error("Failed to generate locales:", error);
  process.exitCode = 1;
});
