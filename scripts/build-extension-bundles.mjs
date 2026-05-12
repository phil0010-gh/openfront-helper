import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

mkdirSync(resolve(root, "dist", "content"), { recursive: true });
mkdirSync(resolve(root, "dist", "page-bridge"), { recursive: true });

const common = {
  bundle: true,
  platform: "browser",
  target: "es2022",
  logLevel: "info",
  jsx: "automatic",
  loader: { ".tsx": "tsx", ".ts": "ts" },
};

await esbuild.build({
  ...common,
  entryPoints: [resolve(root, "src/floating/main.tsx")],
  outfile: resolve(root, "dist/content/floating-helpers-react.js"),
  format: "iife",
  globalName: "OpenFrontFloatingHelpersReact",
});

await esbuild.build({
  ...common,
  entryPoints: [resolve(root, "src/page-bridge-overlays/main.tsx")],
  outfile: resolve(root, "dist/page-bridge/helper-overlays.js"),
  format: "iife",
  globalName: "OpenFrontHelperOverlaysBundle",
});
