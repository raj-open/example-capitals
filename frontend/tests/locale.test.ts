// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { coordinates } from "../src/utils/format.ts";
import { formatNumber, parseNumber } from "../src/utils/locale.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("formatNumber", () => {
    it("uses the decimal mark of the locale, without grouping", () => {
        expect(formatNumber(1234.5678, "en-GB")).toBe("1234.5678");
        expect(formatNumber(1234.5678, "de-DE")).toBe("1234,5678");
        expect(formatNumber(-0.5, "de-DE", 2)).toBe("-0,50");
    });
});

describe("parseNumber", () => {
    it.each([
        ["48.86", 48.86],
        ["48,86", 48.86],
        [" -12,5 ", -12.5],
        ["−3.2", -3.2],
        ["7", 7],
    ])("parses %j", (text, value) => {
        expect(parseNumber(text)).toBe(value);
    });

    it.each(["", "abc", "1.234,5", "1,2,3", "12."])("rejects %j", (text) => {
        expect(parseNumber(text)).toBeUndefined();
    });
});

describe("coordinates", () => {
    it("separates latitude and longitude unambiguously", () => {
        expect(coordinates({ latitude: 48.8566, longitude: 2.3522 }, "en-GB")).toBe("48.86° · 2.35°");
        expect(coordinates({ latitude: 48.8566, longitude: 2.3522 }, "de-DE")).toBe("48,86° · 2,35°");
    });
});
