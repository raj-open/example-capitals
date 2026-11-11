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
    // buttons in the UI to clear and fill the DB (for tests); set DATA_ACTIONS=false where data must be kept
    data: {
        enabled: process.env.DATA_ACTIONS !== "false",
    },
    restcountries: {
        url: process.env.RESTCOUNTRIES_URL ?? "https://api.restcountries.com/countries/v5",
        key: process.env.RESTCOUNTRIES_API_KEY ?? "",
        // page size: at most 100 on the free plan, 500 on paid plans
        limit: toNumber(process.env.RESTCOUNTRIES_LIMIT, 100),
        // selection (applied locally, as the API can neither filter nor sort by population)
        populationMin: toNumber(process.env.RESTCOUNTRIES_POPULATION_MIN, 0),
        top: toNumber(process.env.RESTCOUNTRIES_TOP, Number.POSITIVE_INFINITY),
    },
} as const;

export type Settings = typeof settings;

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Parses a numeric variable; unset or empty values fall back to the default.
 */
function toNumber(value: string | undefined, fallback: number): number {
    return value === undefined || value.trim() === "" ? fallback : Number(value);
}
