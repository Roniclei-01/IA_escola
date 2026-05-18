import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 10_000,
  use: {
    baseURL: "http://127.0.0.1:1421",
    launchOptions: {
      executablePath: "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    }
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 1421",
    url: "http://127.0.0.1:1421",
    reuseExistingServer: true,
    timeout: 10_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
