/**
 * End-to-end: UI + API + database (requires `just serve-db`).
 * The servers are started unless already running.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { defineConfig, devices } from "@playwright/test";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const port = process.env.PORT ?? "3001";

// ----------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------

export default defineConfig({
    testDir: ".",
    outputDir: "../../.cache/playwright",
    reporter: "list",
    use: {
        baseURL: "http://localhost:5173",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: [
        {
            command: "node backend/src/index.ts",
            cwd: "../..",
            url: `http://localhost:${port}/health`,
            reuseExistingServer: true,
        },
        {
            command: "npx --no -- vite --config frontend/vite.config.ts frontend",
            cwd: "../..",
            url: "http://localhost:5173",
            reuseExistingServer: true,
        },
    ],
});
