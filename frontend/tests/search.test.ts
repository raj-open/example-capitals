// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { search } from "../src/utils/search.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ITEMS = [
    { id: "1", country: "Brazil", name: "Brasília", latitude: 0, longitude: 0, capital: true },
    { id: "2", country: "Côte d'Ivoire", name: "Yamoussoukro", latitude: 0, longitude: 0, capital: true },
    { id: "3", country: "Germany", name: "Berlin", latitude: 0, longitude: 0, capital: true },
    { id: "4", country: "Iceland", name: "Reykjavik", latitude: 0, longitude: 0, capital: true },
];

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("search", () => {
    const country = (text: string) => search(ITEMS, { country: text, name: "" });
    const city = (text: string) => search(ITEMS, { country: "", name: text });

    it("matches nothing for an empty query", () => {
        expect(search(ITEMS, { country: " ", name: "" })).toEqual([]);
    });

    it("ignores case and diacritics", () => {
        expect(country("COTE")).toEqual(["2"]);
        expect(city("brasilia")).toEqual(["1"]);
    });

    it("searches country and city separately", () => {
        expect(country("ber")).toEqual([]);
        expect(city("ber")).toEqual(["3"]);
        expect(city("i")).toEqual(["1", "3", "4"]);
    });

    it("narrows down with both fields", () => {
        expect(search(ITEMS, { country: "i", name: "r" })).toEqual(["1", "2", "4"]);
        expect(search(ITEMS, { country: "ice", name: "rey" })).toEqual(["4"]);
    });

    it("matches substrings anywhere, in list order", () => {
        expect(city("y")).toEqual(["2", "4"]);
        expect(city("ssou")).toEqual(["2"]);
    });
});
