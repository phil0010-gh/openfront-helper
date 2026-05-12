import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFileSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

function copyExtensionStatics() {
  const dist = resolve(__dirname, "dist");
  copyFileSync(resolve(__dirname, "map-data.js"), resolve(dist, "map-data.js"));
  cpSync(resolve(__dirname, "shared"), resolve(dist, "shared"), { recursive: true });
  cpSync(resolve(__dirname, "assets"), resolve(dist, "assets"), { recursive: true });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-extension-statics",
      closeBundle: copyExtensionStatics,
    },
  ],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
      },
    },
  },
});
