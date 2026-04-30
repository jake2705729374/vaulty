import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    // Node environment gives us globalThis.crypto.subtle (Node 18+)
    // without needing jsdom or a browser harness.
    environment: "node",

    // Only pick up files inside __tests__/ so vitest never touches
    // Next.js app/ files (server components, route handlers, etc.).
    include: ["__tests__/**/*.test.ts"],

    // Crypto operations with 100k PBKDF2 iterations can be slow.
    // 15s covers even the large-entry round-trip tests.
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      // Mirror the @/* path alias from tsconfig.json
      "@": path.resolve(__dirname, "."),
    },
  },
})
