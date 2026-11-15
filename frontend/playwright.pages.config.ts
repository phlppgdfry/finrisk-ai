import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.FINRISK_SITE_URL || "http://127.0.0.1:8013",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1536, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.FINRISK_SITE_URL
    ? undefined
    : {
        command: `${process.env.FINRISK_PYTHON || ".venv/bin/python"} -m http.server 8013 --bind 127.0.0.1 --directory frontend/dist-pages`,
        cwd: "..",
        url: "http://127.0.0.1:8013",
        reuseExistingServer: !process.env.CI,
        timeout: 20000,
      },
});
