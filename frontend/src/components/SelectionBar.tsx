/**
 * Actions for the selected cities (in the sidebar):
 * - always: show only their countries (list and map), clear the selection
 * - with several: one colour for all (undoable while the selection stays), delete all
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { useEffect, useState } from "react";

import { DEFAULT_COLOUR, useCapitals } from "../store/capital.ts";
import { Trash } from "./icons.tsx";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function SelectionBar() {
    const { items, selection, select, setColour, removeMany, showCountries } = useCapitals();
    const [problem, setProblem] = useState<string>();
    /** colours before the first change here (by id; undefined: none set), for undo */
    const [before, setBefore] = useState<Map<string, string | undefined>>();
    const chosen = items.filter(({ id }) => selection.includes(id));
    const countries = [...new Set(chosen.map(({ country }) => country))];
    const colour = chosen[0]?.colour ?? DEFAULT_COLOUR;
    const several = selection.length > 1;

    // another selection: nothing to undo
    // biome-ignore lint/correctness/useExhaustiveDependencies: the selection triggers the reset
    useEffect(() => {
        setBefore(undefined);
        setProblem(undefined);
    }, [selection]);

    if (selection.length === 0) {
        return null;
    }

    function onColour(value: string) {
        setBefore((previous) => previous ?? new Map(chosen.map(({ id, colour }) => [id, colour])));

        for (const id of selection) {
            setColour(id, value);
        }
    }

    function onUndo() {
        for (const [id, colour] of before ?? []) {
            setColour(id, colour);
        }

        setBefore(undefined);
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
            <button type="button" onClick={() => showCountries(countries)}>
                {countries.length === 1 ? "Only this country" : "Only these countries"}
            </button>
            {several && (
                <>
                    <label title="Colour of all">
                        Colour
                        <input type="color" value={colour} onChange={(event) => onColour(event.target.value)} />
                    </label>
                    {before && (
                        <button type="button" title="Back to the colours before" onClick={onUndo}>
                            Undo
                        </button>
                    )}
                    <button type="button" title="Delete all" aria-label="Delete selected" onClick={onDelete}>
                        <Trash />
                    </button>
                </>
            )}
            <button type="button" onClick={() => select()}>
                Clear
            </button>
            {problem && <p className="error">{problem}</p>}
        </div>
    );
}
