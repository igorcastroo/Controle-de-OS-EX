import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  globalTeardown: "./tests/stop-server.js",
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    headless: true,
    timezoneId: "America/Fortaleza",
    acceptDownloads: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/server.js",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
