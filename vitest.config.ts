import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    include: ["src/survival/**/*.test.ts", "src/components/guide/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "evidence/phase-1/coverage",
      include: ["src/survival/engine.ts", "src/survival/resolver.ts"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 80,
        branches: 75,
      },
    },
  },
});
