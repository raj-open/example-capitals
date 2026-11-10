/**
 * Content of the map popup of the selected capital: details and colour of its marker.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Capital } from "../../@api/types.gen.ts";
import { DEFAULT_COLOUR, useCapitals } from "../store/capital.ts";
import { useSettings } from "../store/settings.ts";
import { coordinates } from "../utils/format.ts";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function CapitalPopup({ capital }: { capital: Capital }) {
    const colour = capital.colour ?? DEFAULT_COLOUR;
    const setColour = useCapitals((state) => state.setColour);
    const locale = useSettings((state) => state.locale);

    return (
        <div className="popup">
            <strong>{capital.name}</strong>, {capital.country}
            <div>{coordinates(capital, locale)}</div>
            <label>
                Colour
                <input type="color" value={colour} onChange={(event) => setColour(capital.id, event.target.value)} />
            </label>
        </div>
    );
}
