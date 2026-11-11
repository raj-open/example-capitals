/**
 * View of the map on Earth (centre, zoom, bearing, pitch), remembered in the browser (localStorage),
 * so a reload (or a return from another world) keeps it.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface View {
    /** [longitude, latitude] */
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
}

export interface ViewState extends View {
    set: (view: View) => void;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

export const useView = create<ViewState>()(
    persist(
        (set) => ({
            center: [10, 30],
            zoom: 1.5,
            bearing: 0,
            pitch: 0,

            set: (view) => {
                set(view);
            },
        }),
        { name: "example-capitals:view" },
    ),
);
