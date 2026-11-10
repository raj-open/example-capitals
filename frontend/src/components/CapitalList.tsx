/**
 * Sidebar: countries with their capitals.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { useCapitals } from "../store/capital.ts";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function CapitalList() {
    const items = useCapitals((state) => state.items);
    const error = useCapitals((state) => state.error);

    // TODO: add / edit / delete controls
    return (
        <aside className="sidebar">
            <h2>Capitals</h2>
            {error && <p className="error">{error}</p>}
            <ul>
                {items.map((item) => (
                    <li key={item.id}>
                        <strong>{item.country}</strong>: {item.name}
                    </li>
                ))}
            </ul>
        </aside>
    );
}
