/**
 * Type-ahead search over cities, by country and by city (separately).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Capital } from "../../@api/types.gen.ts";
import { LOCALE } from "./locale.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Fields to search, each optional: country and city (`name`).
 */
export interface Query {
    country: string;
    name: string;
}

/**
 * Returns the ids of all matches, in list order:
 * every non-empty field is contained as a substring in its field of the city (ignoring case and diacritics).
 * An empty query matches nothing.
 */
export function search(items: Capital[], query: Query): string[] {
    const needles = (Object.keys(query) as (keyof Query)[])
        .map((key) => [key, normalise(query[key])] as const)
        .filter(([, needle]) => needle !== "");

    if (needles.length === 0) {
        return [];
    }

    return items
        .filter((item) => needles.every(([key, needle]) => normalise(item[key]).includes(needle)))
        .map(({ id }) => id);
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

function normalise(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase(LOCALE)
        .trim();
}
