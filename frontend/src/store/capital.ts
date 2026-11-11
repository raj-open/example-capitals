/**
 * Global state for capitals.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { create } from "zustand";

import type { Capital, CapitalInput } from "../../@api/types.gen.ts";
import type { Resource } from "../api/capital.ts";
import * as api from "../api/capital.ts";
import { LOCALE } from "../utils/locale.ts";
import type { Spot } from "../utils/snap.ts";
import { useSettings } from "./settings.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

export const DEFAULT_COLOUR = "#d32f2f";

/** delay before a colour change is saved, so dragging in the colour picker sends one request */
const SAVE_DELAY = 400;

/** pending saves of colours, by id */
const pending = new Map<string, ReturnType<typeof setTimeout>>();

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface CapitalState {
    items: Capital[];
    selected?: Capital;
    /** a city to add, proposed on the map (opens the form, prefilled) */
    draft?: Spot;
    error?: string;

    load: () => Promise<void>;
    select: (id?: string) => Promise<void>;
    add: (input: CapitalInput) => Promise<Capital>;
    edit: (id: string, input: CapitalInput) => Promise<Capital>;
    remove: (id: string) => Promise<void>;
    setColour: (id: string, colour: string) => void;
    propose: (draft?: Spot) => void;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

/**
 * NOTE: add, edit and remove throw on failure (e.g. 409), so forms can show the error where it happened.
 */
export const useCapitals = create<CapitalState>()((set, get) => ({
    items: [],

    /**
     * Loads all cities of the current resource; a selected city which is no longer listed is deselected.
     */
    load: async () => {
        try {
            const items = await api.list(resource());

            set((state) => ({
                items,
                selected: items.some(({ id }) => id === state.selected?.id) ? state.selected : undefined,
                error: undefined,
            }));
        } catch (err) {
            set({ error: String(err) });
        }
    },

    /**
     * Selects a city via GET /capital/{id} or /city/{id}; no id clears the selection.
     */
    select: async (id) => {
        if (id === undefined) {
            set({ selected: undefined });
            return;
        }

        try {
            set({ selected: await api.get(resource(), id), error: undefined });
        } catch (err) {
            set({ error: String(err) });
        }
    },

    /**
     * Adds a city; one which is not a capital goes to /city even with "Capitals only" (and is then not listed).
     */
    add: async (input) => {
        const target = input.capital ? resource() : "city";
        const item = await api.create(target, input);

        if (target === resource()) {
            set((state) => ({ items: sort([...state.items, item]) }));
        }

        return item;
    },

    /**
     * Replaces a city (PUT); keeps its colour unless the input sets one.
     */
    edit: async (id, input) => {
        const colour = get().items.find((item) => item.id === id)?.colour;
        const item = await api.update(resource(), id, { colour, ...input });

        set((state) => ({
            items: sort(state.items.map((other) => (other.id === id ? item : other))),
            selected: state.selected?.id === id ? item : state.selected,
        }));

        return item;
    },

    remove: async (id) => {
        await api.remove(resource(), id);

        set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            selected: state.selected?.id === id ? undefined : state.selected,
        }));
    },

    /**
     * Shows a colour at once and saves it (PUT) after a short delay; a failed save is reported as error.
     */
    setColour: (id, colour) => {
        const paint = (item: Capital) => (item.id === id ? { ...item, colour } : item);

        set((state) => ({
            items: state.items.map(paint),
            selected: state.selected && paint(state.selected),
        }));

        clearTimeout(pending.get(id));
        pending.set(
            id,
            setTimeout(async () => {
                pending.delete(id);
                const item = get().items.find((other) => other.id === id);

                if (!item) {
                    return;
                }

                const { id: _, ...input } = item;

                try {
                    await api.update(resource(), id, input);
                } catch (err) {
                    set({ error: String(err) });
                }
            }, SAVE_DELAY),
        );
    },

    /**
     * Proposes a city to add; a stored one is selected instead. No draft withdraws the proposal.
     */
    propose: (draft) => {
        if (draft?.id !== undefined) {
            set({ draft: undefined });
            get().select(draft.id);
            return;
        }

        set({ draft });
    },
}));

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * The resource of the current mode: /capital (capitals only) or /city (all cities).
 */
function resource(): Resource {
    return useSettings.getState().capitalsOnly ? "capital" : "city";
}

/**
 * By country, the capital first, then by name, case-insensitive (like GET /city).
 */
function sort(items: Capital[]): Capital[] {
    const compare = (a: string, b: string) => a.localeCompare(b, LOCALE, { sensitivity: "base" });

    return [...items].sort(
        (a, b) => compare(a.country, b.country) || Number(b.capital) - Number(a.capital) || compare(a.name, b.name),
    );
}
