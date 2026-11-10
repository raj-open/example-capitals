/**
 * Content of the map popup of the selected capital: details, colour of its marker, delete.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { useState } from "react";

import type { Capital } from "../../@api/types.gen.ts";
import { DEFAULT_COLOUR, useCapitals } from "../store/capital.ts";
import { useSettings } from "../store/settings.ts";
import { coordinates } from "../utils/format.ts";
import { Trash } from "./icons.tsx";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function CapitalPopup({ capital }: { capital: Capital }) {
    const colour = capital.colour ?? DEFAULT_COLOUR;
    const setColour = useCapitals((state) => state.setColour);
    const remove = useCapitals((state) => state.remove);
    const locale = useSettings((state) => state.locale);
    const [problem, setProblem] = useState<string>();

    // as in the list; deleting deselects, which closes the popup
    async function onDelete() {
        if (!window.confirm(`Delete ${capital.name}, ${capital.country}?`)) {
            return;
        }

        try {
            setProblem(undefined);
            await remove(capital.id);
        } catch (err) {
            setProblem(err instanceof Error ? err.message : String(err));
        }
    }

    return (
        <div className="popup">
            <strong>{capital.name}</strong>, {capital.country}
            <div>{coordinates(capital, locale)}</div>
            <div className="popup-actions">
                <label>
                    Colour
                    <input
                        type="color"
                        value={colour}
                        onChange={(event) => setColour(capital.id, event.target.value)}
                    />
                </label>
                <button type="button" title="Delete" aria-label={`Delete ${capital.name}`} onClick={onDelete}>
                    <Trash />
                </button>
            </div>
            {problem && <p className="error">{problem}</p>}
        </div>
    );
}
