/**
 * A large sample of ordinary cities (no capitals), coloured by region.
 *
 * Source: Natural Earth (public domain), https://www.naturalearthdata.com
 * - /backend/src/data/cities.json was generated once from `ne_50m_populated_places_simple`:
 *   the 300 most populous places which are not capitals (at most 8 per country), sorted by country and city
 * - country names are those of REST Countries (e.g. "United States", not "United States of America")
 * - regions (UN) from `ne_110m_admin_0_countries`, as REST Countries uses them
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { readFileSync } from "node:fs";

import { regionColour } from "../_core/regions.ts";
import type { CapitalData } from "../models/capital.ts";

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
 * Reads the sample (on demand, so it costs no memory unless used).
 */
export function cities(): CapitalData[] {
    const items: City[] = JSON.parse(readFileSync(new URL("./cities.json", import.meta.url), "utf8"));

    return items.map(({ region, ...item }) => {
        const colour = regionColour(region);
        return { ...item, capital: false, ...(colour && { colour }) };
    });
}
