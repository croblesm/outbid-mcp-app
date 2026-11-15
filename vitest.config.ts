import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
  test: {
    projects: [
      { test: { name: "unit", include: ["src/**/*.test.ts?(x)"], environment: "jsdom" } },
      { test: { name: "rls", include: ["tests/**/*.test.ts"], environment: "node", testTimeout: 20000 } },
    ],
  },
})
