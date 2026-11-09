import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages project-site path.
  base: "/redline-grid/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false
  },
  plugins: [{
    name: "copy-season-archive",
    closeBundle() {
      const source = resolve(process.cwd(), "archive");
      const destination = resolve(process.cwd(), "dist/archive");
      if (existsSync(source)) {
        cpSync(source, destination, { recursive: true });
      }
    }
  }]
});
