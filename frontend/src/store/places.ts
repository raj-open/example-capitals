/**
 * Known places for snap-to (see /frontend/src/utils/snap.ts):
 * the stored cities first, then a sample of ordinary cities from the API (GET /places),
 * so a city can be added on the map even if it is not stored yet (or not shown, e.g. with "Capitals only").
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { create } from "zustand";

import type { Capital } from "../../@api/types.gen.ts";
import * as api from "../api/places.ts";
import type { Place } from "../utils/snap.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface PlacesState {
    /** the sample of the API; empty until loaded */
    sample: Place[];

    load: () => Promise<void>;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

export const usePlaces = create<PlacesState>()((set) => ({
    sample: [],

    /**
     * Loads the sample; on failure snap-to simply works with the stored cities only.
     */
    load: async () => {
        try {
            set({ sample: await api.list() });
        } catch (err) {
            console.warn(`places not loaded: ${err}`);
        }
    },
}));

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * The stored cities, then the sample (earlier ones win ties in snap-to).
 */
export function places(items: Capital[]): Place[] {
    return [...items, ...usePlaces.getState().sample];
}
