import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages project-site path.
  base: "/redline-grid/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false
  }
});
