/**
 * Import of countries and their capitals from REST Countries (v5).
 *
 * Docs: https://restcountries.com/docs/countries
 *
 * The API pages via `limit` + `offset` (envelope `data.objects`, `data.meta.more`),
 * but can neither filter nor sort by population,
 * so all countries are fetched and the selection (`populationMin`, `top`) happens here.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { MongoBulkWriteError } from "mongodb";

import { capitals } from "../db/collections.ts";

import { UnavailableError } from "../_core/errors.ts";
import { capitalId } from "../_core/ids.ts";
import { regionColour } from "../_core/regions.ts";
import { settings } from "../_core/settings.ts";
import type { CapitalData } from "../models/capital.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

/**
 * Country as returned by the API (only the fields requested via `response_fields`).
 */
export interface Country {
    names?: { common?: string };
    capitals?: { name?: string; coordinates?: { lat?: number; lng?: number } }[];
    population?: number;
    region?: string;
}

export interface Selection {
    populationMin: number;
    top: number;
}

interface Page {
    data: {
        objects: Country[];
        meta: { total: number; count: number; more: boolean };
    };
}

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const FIELDS = ["names.common", "capitals", "population", "region"].join(",");

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Fetches all countries and upserts the capitals of the selection (by country and name, so it is idempotent).
 * Costs ⌈total / limit⌉ requests of the monthly quota. Returns the number of capitals stored.
 */
export async function importCapitals(): Promise<number> {
    if (!settings.restcountries.key) {
        throw new UnavailableError("RESTCOUNTRIES_API_KEY is not set");
    }

    const items = toCapitals(await fetchAll(), settings.restcountries);
    return upsert(items);
}

/**
 * Maps countries to capitals (`country` = common name, `name` = first capital).
 *
 * - skips countries without a capital or coordinates
 * - keeps countries with population ≥ `populationMin`, then the `top` most populous
 */
export function toCapitals(data: Country[], { populationMin, top }: Selection): CapitalData[] {
    return data
        .filter((item) => (item.population ?? 0) >= populationMin)
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .map(toCapital)
        .filter((item) => item !== undefined)
        .slice(0, top);
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Fetches all pages (⌈total / limit⌉ requests, sequential to respect the rate limit).
 */
async function fetchAll(): Promise<Country[]> {
    const { url, key, limit } = settings.restcountries;
    const items: Country[] = [];
    let offset = 0;
    let more = true;

    while (more) {
        const query = new URLSearchParams({ limit: String(limit), offset: String(offset), response_fields: FIELDS });
        const response = await fetch(`${url}?${query}`, { headers: { Authorization: `Bearer ${key}` } });

        if (!response.ok) {
            throw new Error(`REST Countries responded with ${response.status}`);
        }

        const { data } = (await response.json()) as Page;
        items.push(...data.objects);
        offset += data.meta.count;
        more = data.meta.more && data.meta.count > 0;
    }

    return items;
}

function toCapital({ names, capitals, region }: Country): CapitalData | undefined {
    const country = names?.common?.trim();
    const capital = capitals?.[0];
    const name = capital?.name?.trim();
    const { lat, lng } = capital?.coordinates ?? {};

    if (!country || !name || !isNumber(lat) || !isNumber(lng)) {
        return undefined;
    }

    const colour = regionColour(region);
    const data: CapitalData = { name, country, latitude: lat, longitude: lng, capital: true };
    return colour === undefined ? data : { ...data, colour };
}

/**
 * Upserts by (country, name), the unique key; conflicts (e.g. with an id taken by an edited capital) are logged and skipped.
 */
async function upsert(items: CapitalData[]): Promise<number> {
    if (items.length === 0) {
        return 0;
    }

    // the colour (by region) only for new cities, so colours chosen by the user survive a re-import
    const operations = items.map(({ colour, ...item }) => ({
        updateOne: {
            filter: { country: item.country, name: item.name },
            update: {
                $set: item,
                $setOnInsert: { _id: capitalId(item.country, item.name), ...(colour && { colour }) },
            },
            upsert: true,
        },
    }));

    try {
        await capitals().bulkWrite(operations, { ordered: false });
        return items.length;
    } catch (err) {
        if (!(err instanceof MongoBulkWriteError)) {
            throw err;
        }

        const errors = [err.writeErrors].flat();
        console.warn(
            `skipped ${errors.length} conflicting capitals:`,
            errors.map(({ errmsg }) => errmsg),
        );
        return items.length - errors.length;
    }
}

function isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}
