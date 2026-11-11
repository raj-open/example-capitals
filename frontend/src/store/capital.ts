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

/** value of `editing` for the form of a new city */
export const NEW = "new";

/** delay before a colour change is saved, so dragging in the colour picker sends one request */
const SAVE_DELAY = 400;

/** pending saves of colours, by id */
const pending = new Map<string, ReturnType<typeof setTimeout>>();

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

/** how a click selects: only this city, toggled (Ctrl/Cmd), or the range from the last click without Shift (Shift) */
export type Selecting = "only" | "toggle" | "range";

export interface CapitalState {
    items: Capital[];
    /** the city in focus (last clicked; the map shows its popup) */
    selected?: Capital;
    /** ids of all selected cities (several via Ctrl/Cmd or Shift), for bulk actions */
    selection: string[];
    /** where a range (Shift) starts */
    anchor?: string;
    /** a city to add, proposed on the map (for the form, prefilled) */
    draft?: Spot;
    /** the open form in the sidebar: NEW (to add, with the draft if any) or the id of a city (to edit) */
    editing?: string;
    error?: string;

    load: () => Promise<void>;
    select: (id?: string, how?: Selecting, order?: string[]) => Promise<void>;
    selectAll: (ids: string[]) => void;
    blur: () => void;
    add: (input: CapitalInput) => Promise<Capital>;
    edit: (id: string, input: CapitalInput) => Promise<Capital>;
    remove: (id: string) => Promise<void>;
    removeMany: (ids: string[]) => Promise<void>;
    setColour: (id: string, colour: string) => void;
    propose: (draft?: Spot) => void;
    setEditing: (editing?: string) => void;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

/**
 * NOTE: add, edit and remove throw on failure (e.g. 409), so forms can show the error where it happened.
 */
export const useCapitals = create<CapitalState>()((set, get) => ({
    items: [],
    selection: [],

    /**
     * Loads all cities of the current resource; selected cities which are no longer listed are deselected.
     */
    load: async () => {
        try {
            const items = await api.list(resource());
            const ids = new Set(items.map(({ id }) => id));

            set((state) => ({
                items,
                selected: state.selected && ids.has(state.selected.id) ? state.selected : undefined,
                selection: state.selection.filter((id) => ids.has(id)),
                error: undefined,
            }));
        } catch (err) {
            set({ error: String(err) });
        }
    },

    /**
     * Selects a city (see `Selecting`; a range follows `order`, by default the list) and focuses it
     * via GET /capital/{id} or /city/{id}; a city toggled off loses the focus. No id clears the selection.
     */
    select: async (id, how = "only", order = get().items.map((item) => item.id)) => {
        if (id === undefined) {
            set({ selected: undefined, selection: [], anchor: undefined });
            return;
        }

        const { selection, anchor } = get();
        const next = selecting(selection, anchor, id, how, order);
        set({ selection: next, anchor: how === "range" ? (anchor ?? id) : id });

        if (!next.includes(id)) {
            set((state) => ({ selected: state.selected?.id === id ? undefined : state.selected }));
            return;
        }

        try {
            const item = await api.get(resource(), id);

            // still selected (a quick toggle may have removed it meanwhile)
            if (get().selection.includes(id)) {
                set({ selected: item, error: undefined });
            }
        } catch (err) {
            set({ error: String(err) });
        }
    },

    /**
     * Selects several cities at once (e.g. all matches of a search), without focus.
     */
    selectAll: (ids) => {
        set({ selection: [...ids], anchor: ids[0], selected: undefined });
    },

    /**
     * Drops the focus (e.g. the popup was closed), keeps the selection.
     */
    blur: () => {
        set({ selected: undefined });
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
        await get().removeMany([id]);
    },

    /**
     * Deletes cities (one request each, as the API has no bulk delete);
     * those deleted are gone even if others fail, then the first failure is thrown.
     */
    removeMany: async (ids) => {
        const target = resource();
        const results = await Promise.allSettled(ids.map((id) => api.remove(target, id)));
        const gone = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));

        set((state) => ({
            items: state.items.filter((item) => !gone.has(item.id)),
            selected: state.selected && gone.has(state.selected.id) ? undefined : state.selected,
            selection: state.selection.filter((id) => !gone.has(id)),
            editing: state.editing !== undefined && gone.has(state.editing) ? undefined : state.editing,
        }));

        const failure = results.find((result) => result.status === "rejected");

        if (failure) {
            throw failure.reason;
        }
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
     * Proposes a city to add (opens the form to add); a stored one is selected and opened to edit instead.
     * No draft withdraws the proposal (and closes its form).
     */
    propose: (draft) => {
        if (draft?.id !== undefined) {
            set({ draft: undefined, editing: draft.id });
            get().select(draft.id);
            return;
        }

        set((state) => ({ draft, editing: draft ? NEW : state.editing === NEW ? undefined : state.editing }));
    },

    /**
     * Opens a form (or closes it, without argument); a draft is dropped.
     */
    setEditing: (editing) => {
        set({ editing, draft: undefined });
    },
}));

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * How a click selects, by its modifier keys: Ctrl/Cmd toggles, Shift selects a range.
 */
export function selectingOf({
    ctrlKey,
    metaKey,
    shiftKey,
}: Pick<MouseEvent, "ctrlKey" | "metaKey" | "shiftKey">): Selecting {
    if (ctrlKey || metaKey) {
        return "toggle";
    }

    return shiftKey ? "range" : "only";
}

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
 * The next selection after a click on `id` (see `Selecting`).
 */
function selecting(selection: string[], anchor: string | undefined, id: string, how: Selecting, order: string[]) {
    switch (how) {
        case "toggle":
            return selection.includes(id) ? selection.filter((other) => other !== id) : [...selection, id];

        case "range": {
            const start = order.indexOf(anchor ?? id);
            const end = order.indexOf(id);

            if (start < 0 || end < 0) {
                return [id];
            }

            return order.slice(Math.min(start, end), Math.max(start, end) + 1);
        }

        default:
            return [id];
    }
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
