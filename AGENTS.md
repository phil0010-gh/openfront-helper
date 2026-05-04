# AGENTS.md

Guidance for AI coding agents working on this repository.

## Project overview

This is an unofficial browser extension for `https://openfront.io`.

Main responsibilities:

- Auto-join public lobbies based on selected filters.
- Provide popup-based settings and helper controls.
- Inject content scripts and page-bridge scripts for in-game helper features.
- Store user settings through extension storage.

## Important files and folders

- `manifest.json` - extension manifest, permissions, content-script order, and web-accessible resources.
- `popup.html` - popup UI shell and stylesheet/script includes.
- `styles\` - popup CSS split by area:
  - `popup-base.css` - base tokens, popup shell, header, shared chrome.
  - `popup-layout.css` - layout, auto-join panel, map filters.
  - `popup-helpers.css` - helper cards and helper-related popup UI.
  - `popup-filters.css` - lobby filter controls.
  - `popup-mistral.css` - optional pixel-art theme; do not re-enable unless explicitly requested.
- `popup\` - popup state, rendering, and event handling.
- `shared\settings.js` - shared defaults and settings normalization used by popup and content scripts.
- `shared\i18n.js` and `locales\` - translation bundle handling and localized strings.
- `content\core.js` - shared content-script state and bridge synchronization.
- `content\floating-helpers.js` - floating helpers window injected into the OpenFront page.
- `content\auto-join.js` - lobby detection and auto-join behavior.
- `page-bridge\` - scripts that run in the page context for OpenFront-specific helpers.
- `map-data.js` and `assets\map-thumbnails\` - map metadata and thumbnails.
- `scripts\` - utility scripts for locales and packaging.

## Development notes

- This repository has no full build system configured in `package.json`.
- Prefer small, targeted changes. Avoid refactoring unrelated code.
- Keep popup and content-script settings behavior in sync by using `shared\settings.js` rather than duplicating defaults.
- Preserve the content-script load order in `manifest.json` unless the dependency order is intentionally changed.
- Do not add third-party dependencies unless necessary.
- Do not commit generated packages or temporary artifacts.
- Use Windows paths with backslashes in commands and documentation examples.

## Validation

Use existing Node syntax checks where possible:

```powershell
node --check content\floating-helpers.js
node --check content\core.js
node --check content\auto-join.js
node --check page-bridge\alliance-requests-panel.js
node validate-syntax.js
```

If changing translations, run:

```powershell
node scripts\verify-i18n.js
```

If changing packaging behavior, inspect `scripts\build-zip.js` and run the existing script directly with Node.

## UI and design guidance

- The current popup design is the default dark theme from the split popup stylesheets.
- `styles\popup-mistral.css` is not linked from `popup.html`; keep it disabled unless the user explicitly asks for the Mistral/pixel-art theme.
- The floating helpers panel has inline styles in `content\floating-helpers.js`; keep it visually aligned with the default dark/green helper design.
- When changing popup layout, check both `popup.html` and the relevant stylesheet in `styles\`.
- When changing floating helper entries, update creation, event handling, and update logic together so removed controls do not leave dead code.

## Browser extension constraints

- Content scripts cannot directly access page JavaScript internals; use page-bridge scripts and `window.postMessage` patterns already present in the codebase.
- Keep page-bridge scripts listed as `web_accessible_resources` when they are injected or fetched from the page.
- Avoid broad `try/catch` blocks that hide failures. Follow existing explicit error logging patterns.
- Be careful with storage migrations and defaults; normalize through shared helpers.

## Localization

- User-facing strings should go through the existing i18n flow when they appear in popup/content UI.
- Add or update translations in `shared\i18n.js` / `locales\` consistently.
- Do not hard-code new visible English strings in multiple places if an existing translation key can be reused.

## Safety expectations

- Do not add analytics, telemetry, or data collection without explicit user request.
- Do not include secrets or credentials in source files.
- Preserve user settings and existing behavior unless the task specifically asks to change them.
