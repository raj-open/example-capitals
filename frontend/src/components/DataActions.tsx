/**
 * Buttons to clear and fill the DB (for tests and demos), in their own panel on the map (database icon).
 * After each action, the list is reloaded and the result shown below the buttons.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { useState } from "react";

import { type Action, run } from "../api/data.ts";
import { useCapitals } from "../store/capital.ts";
import { Database } from "./icons.tsx";
import { MapPanel } from "./MapPanel.tsx";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ACTIONS: { action: Action; label: string; title: string; done: (count: number) => string }[] = [
    {
        action: "examples",
        label: "Examples",
        title: "Add 25 example cities",
        done: (count) => `added ${count} example cities`,
    },
    {
        action: "capitals",
        label: "All capitals",
        title: "Import all capitals from REST Countries (uses about 3 API requests)",
        done: (count) => `imported ${count} capitals`,
    },
    {
        action: "cities",
        label: "300 cities",
        title: "Add 300 ordinary cities (no capitals)",
        done: (count) => `added ${count} cities`,
    },
    {
        action: "clear",
        label: "Clear",
        title: "Remove all cities",
        done: (count) => `removed ${count} cities`,
    },
];

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function DataActions() {
    const [busy, setBusy] = useState<Action>();
    const [message, setMessage] = useState<string>();

    async function onClick({ action, done }: (typeof ACTIONS)[number]) {
        if (action === "clear" && !window.confirm("Remove all cities?")) {
            return;
        }

        setBusy(action);
        setMessage(undefined);

        try {
            const { count } = await run(action);
            setMessage(done(count));
            await useCapitals.getState().load();
        } catch (err) {
            setMessage(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <MapPanel label="Data" icon={<Database />}>
            <fieldset>
                <legend>Data</legend>
                <div className="data-actions">
                    {ACTIONS.map((item) => (
                        <button
                            key={item.action}
                            type="button"
                            title={item.title}
                            className={item.action === "clear" ? "danger" : undefined}
                            disabled={busy !== undefined}
                            onClick={() => onClick(item)}
                        >
                            {busy === item.action ? "…" : item.label}
                        </button>
                    ))}
                </div>
                {message && <small className="data-message">{message}</small>}
            </fieldset>
        </MapPanel>
    );
}
