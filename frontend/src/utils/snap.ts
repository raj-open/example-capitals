/**
 * Snap-to for adding a city on the map:
 * a spot (a clicked point, or a place label of the map) is matched against known places
 * (stored cities and the Natural Earth sample), so it can be added with name, country and exact coordinates.
 *
 * - a label (has a name): the known place of the same name nearby (for its country), otherwise the label alone
 * - a point: the nearest known place nearby, otherwise the point alone
 *
 * "Nearby" is measured in pixels on the screen (via `project`), so it follows the zoom.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { LOCALE } from "./locale.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/** radius (px) within which a spot snaps to a known place */
export const RADIUS = 24;

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

/** a known place; `id` if it is stored */
export interface Place {
    id?: string;
    name: string;
    country: string;
    latitude: number;
    longitude: number;
}

/** a spot on the map, or what it snapped to */
export type Spot = Partial<Place> & Pick<Place, "latitude" | "longitude">;

/** position on the screen (px) */
export type Project = (spot: Spot) => { x: number; y: number };

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * What a spot snaps to (see above); `places` by priority (earlier ones win ties, e.g. stored before sample).
 */
export function snap(spot: Spot, places: Place[], project: Project, radius = RADIUS): Spot {
    const near = nearby(spot, places, project, radius);

    if (spot.name === undefined) {
        return near[0] ?? point(spot);
    }

    const name = spot.name;
    const match = near.find((place) => same(place.name, name));

    return match ?? { name, ...point(spot) };
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Places within the radius, nearest first (stable, so priority decides ties).
 */
function nearby(spot: Spot, places: Place[], project: Project, radius: number): Place[] {
    const { x, y } = project(spot);

    return places
        .map((place) => {
            const other = project(place);
            return { place, distance: Math.hypot(other.x - x, other.y - y) };
        })
        .filter(({ distance }) => distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .map(({ place }) => place);
}

function point({ latitude, longitude }: Spot): Spot {
    return { latitude: round(latitude), longitude: round(longitude) };
}

/** 4 decimals (~10 m) are enough for a city */
function round(value: number): number {
    return Math.round(value * 1e4) / 1e4;
}

/** names compare case- and accent-insensitive */
function same(a: string, b: string): boolean {
    return a.localeCompare(b, LOCALE, { sensitivity: "base" }) === 0;
}
