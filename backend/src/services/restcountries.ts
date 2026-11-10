/**
 * Import of countries and their capitals from REST Countries (v5).
 *
 * Docs: https://restcountries.com/docs
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { settings } from "../_core/settings.ts";
import type { CapitalInput } from "../models/capital.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Fetches all countries and stores their capitals.
 * Returns the number of capitals stored.
 */
export async function importAll(): Promise<number> {
    const { url, key } = settings.restcountries;

    if (!key) {
        console.warn("RESTCOUNTRIES_API_KEY not set: skipped import");
        return 0;
    }

    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });

    if (!response.ok) {
        throw new Error(`REST Countries responded with ${response.status}`);
    }

    const items = toCapitals(await response.json());

    // TODO: upsert by country (bulkWrite with updateOne + upsert), so restarts are idempotent
    return items.length;
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Maps the raw response to capitals (`country` = common name, `name` = capital).
 */
function toCapitals(_data: unknown): CapitalInput[] {
    // TODO: map fields of the v5 response; skip countries without a capital or coordinates
    return [];
}
