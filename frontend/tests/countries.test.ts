// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { countryName } from "../src/utils/countries.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("countryName", () => {
    it("names a country by its code (as the browser does)", () => {
        expect(countryName("CN")).toBe("China");
        expect(countryName("PL")).toBe("Poland");
    });

    it("uses the known spelling (and, Saint)", () => {
        expect(countryName("KN", ["Saint Kitts and Nevis"])).toBe("Saint Kitts and Nevis");
        expect(countryName("BA", ["Bosnia and Herzegovina"])).toBe("Bosnia and Herzegovina");
    });

    it("names those which differ beyond spelling as REST Countries does", () => {
        expect(countryName("TR")).toBe("Turkey");
        expect(countryName("CI")).toBe("Ivory Coast");
    });

    it("knows no unknown code", () => {
        expect(countryName("XX")).toBeUndefined();
        expect(countryName("")).toBeUndefined();
    });
});
