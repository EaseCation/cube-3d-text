import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4179",
    browserName: "chromium",
    acceptDownloads: true,
    launchOptions: { args: ["--enable-webgl", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "yarn dev --host 127.0.0.1 --port 4179 --strictPort",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
