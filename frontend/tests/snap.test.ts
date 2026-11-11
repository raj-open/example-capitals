// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import type { Place, Spot } from "../src/utils/snap.ts";
import { snap } from "../src/utils/snap.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/** 1° = 10px (a flat screen is enough here) */
const project = ({ longitude, latitude }: Spot) => ({ x: longitude * 10, y: -latitude * 10 });

const STORED: Place = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35 };
const SAMPLE: Place = { name: "Lyon", country: "France", latitude: 45.76, longitude: 4.84 };
const PLACES = [STORED, SAMPLE];

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("snap", () => {
    it("snaps a point to the nearest known place", () => {
        expect(snap({ latitude: 45.9, longitude: 4.9 }, PLACES, project)).toBe(SAMPLE);
        expect(snap({ latitude: 48.8, longitude: 2.4 }, PLACES, project)).toBe(STORED);
    });

    it("keeps a point without a known place nearby (rounded)", () => {
        expect(snap({ latitude: 43.123456, longitude: 0.987654 }, PLACES, project)).toEqual({
            latitude: 43.1235,
            longitude: 0.9877,
        });
    });

    it("prefers the earlier place on a tie", () => {
        const twin = { ...STORED, id: undefined };
        expect(snap({ latitude: 48.86, longitude: 2.35 }, [twin, STORED], project)).toBe(twin);
    });

    it("snaps a label to the known place of the same name (case- and accent-insensitive)", () => {
        const sample = { ...SAMPLE, name: "Lyón" };
        expect(snap({ name: "lyon", latitude: 46, longitude: 5 }, [STORED, sample], project)).toBe(sample);
    });

    it("keeps a label without a known place of its name nearby", () => {
        expect(snap({ name: "Villeurbanne", latitude: 45.77, longitude: 4.88 }, PLACES, project)).toEqual({
            name: "Villeurbanne",
            latitude: 45.77,
            longitude: 4.88,
        });
        expect(snap({ name: "Paris", latitude: 30, longitude: 2.35 }, PLACES, project)).toEqual({
            name: "Paris",
            latitude: 30,
            longitude: 2.35,
        });
    });
});
