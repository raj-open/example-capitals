/**
 * Appearance of the map (Mapbox Standard).
 *
 * Docs: https://docs.mapbox.com/map-styles/standard/guides
 * (the `custom` theme is omitted, as it needs a colour lookup table of our own)
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { create } from "zustand";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

export const STYLES = {
    standard: "mapbox://styles/mapbox/standard",
    satellite: "mapbox://styles/mapbox/standard-satellite",
} as const;

export const LIGHT_PRESETS = ["dawn", "day", "dusk", "night"] as const;

export const THEMES = ["default", "faded", "monochrome"] as const;

/**
 * Worlds (an easter egg): Earth is the Mapbox map, the Moon and Mars a global texture.
 * Textures: Solar System Scope (CC BY 4.0, https://www.solarsystemscope.com/textures), via Wikimedia Commons.
 */
export const BODIES = {
    earth: undefined,
    moon: "2/26/Solarsystemscope_texture_2k_moon.jpg",
    mars: "4/46/Solarsystemscope_texture_2k_mars.jpg",
} as const;

export const TEXTURE_CREDIT = "Textures: Solar System Scope (CC BY 4.0)";

const COMMONS = "https://upload.wikimedia.org/wikipedia/commons";

/** light presets for which the UI is dark too */
const DARK = new Set<string>(["dusk", "night"]);

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export type Body = keyof typeof BODIES;

export interface Appearance {
    body: Body;
    style: keyof typeof STYLES;
    lightPreset: (typeof LIGHT_PRESETS)[number];
    theme: (typeof THEMES)[number];
}

export interface MapState extends Appearance {
    set: (patch: Partial<Appearance>) => void;
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function isDark(lightPreset: Appearance["lightPreset"]): boolean {
    return DARK.has(lightPreset);
}

/**
 * URL of the texture of a body; undefined for Earth (the Mapbox map).
 */
export function texture(body: Body): string | undefined {
    const path = BODIES[body];
    return path && `${COMMONS}/${path}`;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

export const useMapStyle = create<MapState>()((set) => ({
    body: "earth",
    style: "standard",
    lightPreset: "night",
    theme: "default",

    set: (patch) => {
        set(patch);
    },
}));
