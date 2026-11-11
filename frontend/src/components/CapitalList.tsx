/**
 * Sidebar: countries with their capitals; collapsible to a thin bar.
 *
 * - search by country and by city (separately, both narrow down): only matches are shown;
 *   ↑/↓ cycle through matches, Enter selects, Esc clears
 * - selecting an entry selects the city (GET /capital/{id}), which moves the map there
 * - per entry: colour dot (= marker colour), edit and delete; add via + in the header,
 *   or via the map: a click on a city, or right-click / long-press anywhere (the form opens prefilled, see /frontend/src/components/MapView.tsx)
 * - grouped by country (name only on the first entry of a group), the capital first
 * - "Capitals only" (default, remembered): /capital; otherwise /city (all cities, capitals marked with a star)
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { useCapitals } from "../store/capital.ts";
import { useSettings } from "../store/settings.ts";
import { LOCALE } from "../utils/locale.ts";
import { type Query, search } from "../utils/search.ts";
import { CapitalForm } from "./CapitalForm.tsx";
import { CapitalItem } from "./CapitalItem.tsx";
import { Chevron, Plus } from "./icons.tsx";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/** value of `editing` for the form of a new capital */
const NEW = "new";

const EMPTY: Query = { country: "", name: "" };

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function CapitalList() {
    const { items, selected, draft, error, select, add, edit, remove, propose } = useCapitals();
    const capitalsOnly = useSettings((state) => state.capitalsOnly);
    const setSettings = useSettings((state) => state.set);
    const title = capitalsOnly ? "Capitals" : "Cities";

    const [collapsed, setCollapsed] = useState(false);
    const [editing, setEditing] = useState<string>(); // id, or NEW
    const [problem, setProblem] = useState<string>();
    const [query, setQuery] = useState<Query>(EMPTY);
    const [index, setIndex] = useState(0);
    const nodes = useRef(new Map<string, HTMLLIElement>());

    const searching = query.country.trim() !== "" || query.name.trim() !== "";
    const matches = useMemo(() => search(items, query), [items, query]);
    const active = matches.length > 0 ? matches[index % matches.length] : undefined;

    // while searching, only matches are shown (in list order)
    const shown = useMemo(() => {
        const ids = new Set(matches);
        return searching ? items.filter(({ id }) => ids.has(id)) : items;
    }, [items, matches, searching]);
    const noun = capitalsOnly ? "capital" : "city";

    // ---- draft (proposed on the map) ----

    useEffect(() => {
        if (draft) {
            setCollapsed(false);
            setEditing(NEW);
        }
    }, [draft]);

    /** opens a form (to add or edit) without a draft */
    function open(id: string) {
        propose();
        setEditing(id);
    }

    function close() {
        setEditing(undefined);
        propose();
    }

    // ---- scrolling ----

    useEffect(() => {
        const id = active ?? selected?.id;

        if (id !== undefined) {
            nodes.current.get(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [active, selected]);

    // ---- keyboard ----

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];

        if (step !== undefined && matches.length > 0) {
            event.preventDefault();
            setIndex((value) => (value + step + matches.length) % matches.length);
        } else if (event.key === "Enter" && active !== undefined) {
            select(active);
        } else if (event.key === "Escape") {
            setQuery(EMPTY);
        }
    }

    /** props of a search field */
    const field = (key: keyof Query, label: string) => ({
        type: "search",
        placeholder: label,
        "aria-label": `Search by ${label.toLocaleLowerCase(LOCALE)}`,
        value: query[key],
        onKeyDown,
        onChange: (event: { target: { value: string } }) => {
            setQuery({ ...query, [key]: event.target.value });
            setIndex(0);
        },
    });

    // ---- actions ----

    async function onDelete(id: string, label: string) {
        if (!window.confirm(`Delete ${label}?`)) {
            return;
        }

        try {
            setProblem(undefined);
            await remove(id);
        } catch (err) {
            setProblem(String(err));
        }
    }

    // ---- render ----

    if (collapsed) {
        return (
            <button
                type="button"
                className="sidebar-handle sidebar-toggle"
                title="Show list"
                aria-label="Show list"
                onClick={() => setCollapsed(false)}
            >
                <Chevron flip />
                <span>{title}</span>
            </button>
        );
    }

    return (
        <aside className="sidebar">
            <header>
                <div className="sidebar-title">
                    <h2>{title}</h2>
                    <button type="button" title="Add" aria-label="Add capital" onClick={() => open(NEW)}>
                        <Plus />
                    </button>
                    <button
                        type="button"
                        className="sidebar-toggle"
                        title="Hide list"
                        aria-label="Hide list"
                        onClick={() => setCollapsed(true)}
                    >
                        <Chevron />
                    </button>
                </div>
                <div className="sidebar-search">
                    <input {...field("country", "Country")} />
                    <input {...field("name", capitalsOnly ? "Capital" : "City")} />
                </div>
                <div className="sidebar-meta">
                    <small>
                        {searching
                            ? `${matches.length === 0 ? 0 : (index % matches.length) + 1} / ${count(matches.length, "match", "matches")}`
                            : count(items.length, noun, capitalsOnly ? "capitals" : "cities")}
                    </small>
                    <label className="sidebar-switch">
                        <input
                            type="checkbox"
                            role="switch"
                            aria-checked={capitalsOnly}
                            checked={capitalsOnly}
                            onChange={(event) => setSettings({ capitalsOnly: event.target.checked })}
                        />
                        Capitals only
                    </label>
                </div>
                {(problem ?? error) && <p className="error">{problem ?? error}</p>}
                {editing === NEW && (
                    <CapitalForm
                        // a new draft (another spot on the map) refills the form
                        key={draft ? `${draft.latitude},${draft.longitude}` : NEW}
                        initial={draft}
                        action="Add"
                        onCancel={close}
                        onSubmit={async (input) => {
                            const item = await add(input);
                            close();
                            await select(item.id);
                        }}
                    />
                )}
            </header>
            <ul>
                {shown.map((item, i) =>
                    editing === item.id ? (
                        <li key={item.id}>
                            <CapitalForm
                                initial={item}
                                action="Save"
                                onCancel={() => setEditing(undefined)}
                                onSubmit={async (input) => {
                                    await edit(item.id, input);
                                    setEditing(undefined);
                                }}
                            />
                        </li>
                    ) : (
                        <CapitalItem
                            key={item.id}
                            item={item}
                            first={i === 0 || shown[i - 1].country !== item.country}
                            current={item.id === selected?.id}
                            className={classes({
                                selected: item.id === selected?.id,
                                active: searching && item.id === active,
                            })}
                            ref={(node) => {
                                if (node) {
                                    nodes.current.set(item.id, node);
                                } else {
                                    nodes.current.delete(item.id);
                                }
                            }}
                            onSelect={() => select(item.id)}
                            onEdit={() => open(item.id)}
                            onDelete={() => onDelete(item.id, `${item.name}, ${item.country}`)}
                        />
                    ),
                )}
            </ul>
        </aside>
    );
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

function count(value: number, singular: string, plural: string): string {
    return `${value} ${value === 1 ? singular : plural}`;
}

function classes(flags: Record<string, boolean>): string | undefined {
    const names = Object.keys(flags).filter((name) => flags[name]);
    return names.length > 0 ? names.join(" ") : undefined;
}
