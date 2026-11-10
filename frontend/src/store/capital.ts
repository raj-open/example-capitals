/**
 * Global state for capitals.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { create } from "zustand";
import type { Capital, CapitalInput } from "../../@api/types.gen.ts";
import * as api from "../api/capital.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface CapitalState {
    items: Capital[];
    colours: Record<string, string>;
    error?: string;

    load: () => Promise<void>;
    add: (input: CapitalInput) => Promise<void>;
    edit: (id: string, input: CapitalInput) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setColour: (id: string, colour: string) => void;
}

// ----------------------------------------------------------------
// STORE
// ----------------------------------------------------------------

export const useCapitals = create<CapitalState>()((set) => ({
    items: [],
    colours: {},

    load: async () => {
        try {
            set({ items: await api.list(), error: undefined });
        } catch (err) {
            set({ error: String(err) });
        }
    },

    add: async (_input) => {
        // TODO: api.create, then append to items
    },

    edit: async (_id, _input) => {
        // TODO: api.update, then replace in items
    },

    remove: async (_id) => {
        // TODO: api.remove, then drop from items (and colours)
    },

    setColour: (id, colour) => {
        set((state) => ({ colours: { ...state.colours, [id]: colour } }));
    },
}));
