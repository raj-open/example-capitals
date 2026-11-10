// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import type { Country } from "../src/services/countries.ts";
import { toCapitals } from "../src/services/countries.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ALL = { populationMin: 0, top: Number.POSITIVE_INFINITY };

function country(common: string, capital: string, population: number, lat = 1, lng = 2): Country {
    return { names: { common }, capitals: [{ name: capital, coordinates: { lat, lng } }], population };
}

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("toCapitals", () => {
    it("maps common name and first capital, most populous first", () => {
        const data = [
            country("Malta", "Valletta", 500_000, 35.9, 14.5),
            country("France", "Paris", 68_000_000, 48.9, 2.4),
        ];

        expect(toCapitals(data, ALL)).toEqual([
            { country: "France", name: "Paris", latitude: 48.9, longitude: 2.4, capital: true },
            { country: "Malta", name: "Valletta", latitude: 35.9, longitude: 14.5, capital: true },
        ]);
    });

    it("colours by region", () => {
        const data: Country[] = [
            { ...country("France", "Paris", 2), region: "Europe" },
            { ...country("Nowhere", "Void", 1), region: "Atlantis" },
        ];

        expect(toCapitals(data, ALL).map(({ colour }) => colour)).toEqual(["#1e88e5", undefined]);
    });

    it("skips countries without a capital or coordinates", () => {
        const data: Country[] = [
            { names: { common: "Antarctica" }, capitals: [], population: 0 },
            { names: { common: "Nowhere" }, capitals: [{ name: "Void" }], population: 1 },
            country("France", "Paris", 1),
        ];

        expect(toCapitals(data, ALL).map(({ country }) => country)).toEqual(["France"]);
    });

    it("keeps capitals sharing a name in different countries", () => {
        const data = [country("Norfolk Island", "Kingston", 2_000), country("Jamaica", "Kingston", 2_800_000)];
        expect(toCapitals(data, ALL).map(({ country }) => country)).toEqual(["Jamaica", "Norfolk Island"]);
    });

    it("selects by minimum population and top count", () => {
        const data = [country("A", "a", 10), country("B", "b", 30), country("C", "c", 20), country("D", "d", 5)];

        expect(toCapitals(data, { populationMin: 10, top: 2 }).map(({ country }) => country)).toEqual(["B", "C"]);
    });
});
