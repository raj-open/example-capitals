// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { BadRequestError } from "../src/_core/errors.ts";
import { parseCapitalInput } from "../src/models/capital.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("parseCapitalInput", () => {
    it("accepts a valid body", () => {
        const body = { name: " Paris ", country: "France", latitude: 48.86, longitude: 2.35 };
        expect(parseCapitalInput(body)).toEqual({ ...body, name: "Paris", capital: true });
    });

    it("accepts a colour (lower case)", () => {
        const body = { name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, colour: "#1E88E5" };
        expect(parseCapitalInput(body)).toEqual({ ...body, capital: true, colour: "#1e88e5" });
    });

    it("keeps an explicit capital flag", () => {
        const body = { name: "Osaka", country: "Japan", latitude: 34.69, longitude: 135.5, capital: false };
        expect(parseCapitalInput(body)).toEqual(body);
    });

    it.each([
        null,
        {},
        { name: "", country: "France", latitude: 0, longitude: 0 },
        { name: "Paris", country: "France", latitude: 91, longitude: 0 },
        { name: "Paris", country: "France", latitude: 0, longitude: "2" },
        { name: "Paris", country: "France", latitude: 0, longitude: 2, capital: "yes" },
        { name: "Paris", country: "France", latitude: 0, longitude: 2, colour: "blue" },
    ])("rejects %j", (body) => {
        expect(() => parseCapitalInput(body)).toThrow(BadRequestError);
    });
});
