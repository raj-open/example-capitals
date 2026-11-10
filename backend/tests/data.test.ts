// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { LOCALE } from "../src/_core/locale.ts";
import { cities } from "../src/data/cities.ts";
import { EXAMPLES } from "../src/data/examples.ts";
import { parseCapitalInput } from "../src/models/capital.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe.each([
    ["examples", EXAMPLES],
    ["cities", cities()],
])("%s", (_, items) => {
    it("are valid and coloured", () => {
        for (const item of items) {
            expect(parseCapitalInput(item)).toEqual(item);
            expect(item.colour).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it("are unique per (country, name), with at most one capital per country", () => {
        const keys = items.map(({ country, name }) => `${country}|${name}`.toLocaleLowerCase(LOCALE));
        expect(new Set(keys).size).toBe(keys.length);

        const capitals = items.filter(({ capital }) => capital).map(({ country }) => country);
        expect(new Set(capitals).size).toBe(capitals.length);
    });
});

describe("cities", () => {
    it("are a few hundred ordinary cities", () => {
        const items = cities();
        expect(items.length).toBe(300);
        expect(items.every(({ capital }) => !capital)).toBe(true);
    });
});
