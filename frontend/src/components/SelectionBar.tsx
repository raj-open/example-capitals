/**
 * Bulk actions for several selected cities (in the sidebar): one colour for all, delete, clear the selection.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { useState } from "react";

import { DEFAULT_COLOUR, useCapitals } from "../store/capital.ts";
import { Trash } from "./icons.tsx";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function SelectionBar() {
    const { items, selection, select, setColour, removeMany } = useCapitals();
    const [problem, setProblem] = useState<string>();
    const colour = items.find(({ id }) => id === selection[0])?.colour ?? DEFAULT_COLOUR;

    if (selection.length < 2) {
        return null;
    }

    async function onDelete() {
        if (!window.confirm(`Delete ${selection.length} cities?`)) {
            return;
        }

        try {
            setProblem(undefined);
            await removeMany(selection);
        } catch (err) {
            setProblem(err instanceof Error ? err.message : String(err));
        }
    }

    return (
        <div className="selection-bar" role="toolbar" aria-label="Selected cities">
            <span>{selection.length} selected</span>
            <label title="Colour of all">
                Colour
                <input
                    type="color"
                    value={colour}
                    onChange={(event) => {
                        for (const id of selection) {
                            setColour(id, event.target.value);
                        }
                    }}
                />
            </label>
            <button type="button" title="Delete all" aria-label="Delete selected" onClick={onDelete}>
                <Trash />
            </button>
            <button type="button" onClick={() => select()}>
                Clear
            </button>
            {problem && <p className="error">{problem}</p>}
        </div>
    );
}
