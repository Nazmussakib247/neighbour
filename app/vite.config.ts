import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    host: true,
    // Docker on Windows/WSL2 doesn't forward host filesystem events into the
    // container, so Vite's watcher misses edits. Polling makes hot-reload work.
    watch: { usePolling: true, interval: 300 },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
