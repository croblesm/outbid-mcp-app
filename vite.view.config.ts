import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// Builds the MCP App view into one self-contained HTML file: hosts render it in a sandboxed iframe
// that can't load our scripts from anywhere else.
export default defineConfig({
  root: "mcp-view",
  plugins: [viteSingleFile()],
  build: { outDir: "../dist-view", emptyOutDir: true, target: "es2022" },
})
