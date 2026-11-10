/**
 * Size of the markers by zoom level: 32px close up, smaller further out to prevent overcrowding.
 */

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/** pairs (minimum zoom, size in px), by descending zoom */
const SIZES: [number, number][] = [
    [4, 32],
    [3, 16],
    [2, 8],
];

const MIN = 4;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function markerSize(zoom: number): number {
    return SIZES.find(([threshold]) => zoom >= threshold)?.[1] ?? MIN;
}
