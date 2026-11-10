/**
 * Demos: screenshots for /demos and the social preview of the repo (requires `just serve-db`).
 * Same servers as the end-to-end tests; not part of `just tests`.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { defineConfig } from "@playwright/test";

import e2e from "../e2e/playwright.config.ts";

// ----------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------

export default defineConfig({
    ...e2e,
    testDir: ".",
    outputDir: "../../.cache/playwright-demos",
    workers: 1,
    timeout: 120_000,
    projects: [
        {
            name: "chromium",
            use: { browserName: "chromium" },
        },
    ],
});
