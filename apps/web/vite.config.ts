import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `VITE_STATIC=1 vite build` produces one self-contained HTML file (public data
// bundled in, no API) for sharing as a demo.
const staticDemo = process.env.VITE_STATIC === "1";

export default defineConfig({
  plugins: [react(), ...(staticDemo ? [viteSingleFile()] : [])],
  build: staticDemo ? { outDir: "dist-demo", emptyOutDir: true } : {},
  server: {
    host: true,
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
    fs: { allow: ["../.."] },
  },
});
