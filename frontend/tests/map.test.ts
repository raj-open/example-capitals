// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { BODIES, isDark, texture, useMapStyle } from "../src/store/map.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("useMapStyle", () => {
    it("starts with Mapbox Standard at night", () => {
        const { style, lightPreset, theme } = useMapStyle.getState();
        expect({ style, lightPreset, theme }).toEqual({ style: "standard", lightPreset: "night", theme: "default" });
    });

    it("starts on Earth, the only body without a texture", () => {
        expect(useMapStyle.getState().body).toBe("earth");
        expect(texture("earth")).toBeUndefined();
        expect(texture("mars")).toMatch(/^https:\/\/upload\.wikimedia\.org\/.+_mars\.jpg$/);
        expect(Object.keys(BODIES)).toEqual(["earth", "moon", "mars"]);
    });

    it("uses a dark UI for dusk and night", () => {
        expect(["dawn", "day", "dusk", "night"].map((preset) => isDark(preset as "day"))).toEqual([
            false,
            false,
            true,
            true,
        ]);
    });

    it("updates parts of the appearance", () => {
        useMapStyle.getState().set({ lightPreset: "dawn", theme: "monochrome" });
        expect(useMapStyle.getState()).toMatchObject({ style: "standard", lightPreset: "dawn", theme: "monochrome" });
    });
});
