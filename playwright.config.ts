import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "evidence/phase-1/playwright.json" }]],
  use: {
    baseURL: "http://127.0.0.1:8081",
    serviceWorkers: "allow",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 8081 --strictPort",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 5"] } }],
});
