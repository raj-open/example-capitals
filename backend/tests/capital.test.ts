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
        expect(parseCapitalInput(body)).toEqual({ ...body, name: "Paris" });
    });

    it.each([
        null,
        {},
        { name: "", country: "France", latitude: 0, longitude: 0 },
        { name: "Paris", country: "France", latitude: 91, longitude: 0 },
        { name: "Paris", country: "France", latitude: 0, longitude: "2" },
    ])("rejects %j", (body) => {
        expect(() => parseCapitalInput(body)).toThrow(BadRequestError);
    });
});
