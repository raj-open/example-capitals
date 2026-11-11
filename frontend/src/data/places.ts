/**
 * Known places for snap-to (see /frontend/src/utils/snap.ts):
 * the stored cities first, then the Natural Earth sample of the backend (/backend/src/data/cities.json),
 * so a city can be added on the map even if it is not stored yet (or not shown, e.g. with "Capitals only").
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import sample from "../../../backend/src/data/cities.json";
import type { Capital } from "../../@api/types.gen.ts";
import type { Place } from "../utils/snap.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/** without the region (only used by the backend, for colours) */
const SAMPLE: Place[] = sample.map(({ name, country, latitude, longitude }) => ({
    name,
    country,
    latitude,
    longitude,
}));

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function places(items: Capital[]): Place[] {
    return [...items, ...SAMPLE];
}
