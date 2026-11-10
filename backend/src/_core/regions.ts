/**
 * Colours of the markers by region (as in REST Countries: `region`), used by the import and the seed.
 */

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

export const REGION_COLOURS = {
    Europe: "#1e88e5",
    Americas: "#e53935",
    Asia: "#43a047",
    Africa: "#fb8c00",
    Oceania: "#8e24aa",
    Antarctic: "#00acc1",
} as const;

export type Region = keyof typeof REGION_COLOURS;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Colour of a region; undefined for an unknown region (the UI then uses its default).
 */
export function regionColour(region: string | undefined): string | undefined {
    return REGION_COLOURS[region as Region];
}
