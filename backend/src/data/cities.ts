/**
 * A large sample of ordinary cities (no capitals):
 * coloured by region for the DB (POST /data/cities), plain for snap-to in the UI (GET /places).
 *
 * Source: Natural Earth (public domain), https://www.naturalearthdata.com
 * - /backend/assets/cities.json was generated once from `ne_50m_populated_places_simple`:
 *   the 300 most populous places which are not capitals (at most 8 per country), sorted by country and city
 * - country names are those of REST Countries (e.g. "United States", not "United States of America")
 * - regions (UN) from `ne_110m_admin_0_countries`, as REST Countries uses them
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { readFileSync } from "node:fs";

import type { Place } from "../../@api/types.gen.ts";
import { regionColour } from "../_core/regions.ts";
import type { CapitalData } from "../models/capital.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const PATH = new URL("../../assets/cities.json", import.meta.url);

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

interface City {
    country: string;
    name: string;
    latitude: number;
    longitude: number;
    region: string;
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * The sample as cities for the DB: not capitals, coloured by region.
 */
export function cities(): CapitalData[] {
    return read().map(({ region, ...item }) => {
        const colour = regionColour(region);
        return { ...item, capital: false, ...(colour && { colour }) };
    });
}

/**
 * The sample as places (without the region).
 */
export function places(): Place[] {
    return read().map(({ region: _, ...place }) => place);
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Reads the sample (on demand, so it costs no memory unless used).
 */
function read(): City[] {
    return JSON.parse(readFileSync(PATH, "utf8"));
}
