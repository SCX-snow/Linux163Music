import { resolve } from "node:path";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { defineConfig } from "electron-vite";

function copyHtmlPlugin() {
  return {
    name: "copy-lyrics-html",
    closeBundle() {
      const src = resolve(__dirname, "src/main/lyrics-window.html");
      const destDir = resolve(__dirname, "out/main");
      const dest = resolve(destDir, "lyrics-window.html");
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      copyFileSync(src, dest);
    },
  };
}

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
    },
    plugins: [copyHtmlPlugin()],
  },
  preload: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
          inject: resolve(__dirname, "src/preload/inject.ts"),
        },
      },
    },
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
      },
    },
  },
});
