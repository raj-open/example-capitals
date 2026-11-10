/**
 * Settings of the user, remembered in the browser (localStorage).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { LOCALE, type Locale } from "../utils/locale.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface Settings {
    /** locale for numbers (display and entry) */
    locale: Locale;

    /** show only capitals (list and map), or all cities */
    capitalsOnly: boolean;
}

export interface SettingsState extends Settings {
    set: (patch: Partial<Settings>) => void;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

export const useSettings = create<SettingsState>()(
    persist(
        (set) => ({
            locale: LOCALE,
            capitalsOnly: true,

            set: (patch) => {
                set(patch);
            },
        }),
        { name: "example-capitals:settings" },
    ),
);
