// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { capitalId, isId, toHex, uuid5 } from "../src/_core/ids.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("uuid5", () => {
    it("matches the reference implementation", () => {
        // python: uuid.uuid5(uuid.NAMESPACE_DNS, "www.example.com")
        expect(toHex(uuid5("www.example.com", NAMESPACE_DNS))).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
    });
});

describe("capitalId", () => {
    it("is short, alphanumeric in groups and deterministic", () => {
        const id = capitalId("France", "Paris");
        expect(id).toMatch(/^[0-9A-Za-z]{7}-[0-9A-Za-z]{7}-[0-9A-Za-z]{8}$/);
        expect(isId(id)).toBe(true);
        expect(isId("123")).toBe(false);
        expect(capitalId("France", "Paris")).toBe(id);
    });

    it("ignores case and surrounding spaces, like the unique indexes", () => {
        expect(capitalId(" FRANCE ", "paris")).toBe(capitalId("France", "Paris"));
    });

    it("separates country and name unambiguously", () => {
        expect(capitalId("a b", "c")).not.toBe(capitalId("a", "b c"));
    });
});
