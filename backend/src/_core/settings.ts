/**
 * Settings, read once from the environment.
 *
 * Workspace scripts run with cwd=backend, so the repo-root .env is loaded explicitly.
 * For the full list of variables see /templates/template.env.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { config } from "dotenv";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

config({ path: new URL("../../../.env", import.meta.url), quiet: true });

// ----------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------

export const settings = {
    port: Number(process.env.PORT ?? 3001),
    database: {
        host: process.env.DATABASE_HOST ?? "localhost",
        port: Number(process.env.DATABASE_PORT ?? 27017),
        name: process.env.DATABASE_NAME ?? "capitals",
        user: process.env.DATABASE_USER ?? "",
        password: process.env.DATABASE_PASSWORD ?? "",
    },
    restcountries: {
        url: process.env.RESTCOUNTRIES_URL ?? "https://api.restcountries.com/countries/v5",
        key: process.env.RESTCOUNTRIES_API_KEY ?? "",
    },
} as const;

export type Settings = typeof settings;
