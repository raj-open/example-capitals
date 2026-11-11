/**
 * One entry of the sidebar: [colour dot] [star if capital] [country] [city, coordinates below] [edit, delete].
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { MouseEvent, Ref } from "react";

import type { Capital } from "../../@api/types.gen.ts";
import { DEFAULT_COLOUR, useCapitals } from "../store/capital.ts";
import { useSettings } from "../store/settings.ts";
import { coordinates } from "../utils/format.ts";
import { Pencil, Star, Trash } from "./icons.tsx";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function CapitalItem({
    item,
    first,
    className,
    current,
    ref,
    onSelect,
    onEdit,
    onDelete,
}: {
    item: Capital;
    /** first entry of its country (only this one shows the country) */
    first: boolean;
    className?: string;
    current: boolean;
    ref: Ref<HTMLLIElement>;
    onSelect: (event: MouseEvent) => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const colour = item.colour ?? DEFAULT_COLOUR;
    const setColour = useCapitals((state) => state.setColour);
    const locale = useSettings((state) => state.locale);

    return (
        <li ref={ref} className={[className, first && "first"].filter(Boolean).join(" ") || undefined}>
            <label className="dot" style={{ background: colour }} title="Marker colour">
                <input type="color" value={colour} onChange={(event) => setColour(item.id, event.target.value)} />
            </label>
            <button type="button" className="entry" aria-current={current} onClick={onSelect}>
                <span className="mark" title={item.capital ? "Capital" : undefined}>
                    {item.capital && <Star />}
                </span>
                <span className="country">{first && item.country}</span>
                <span className="city">
                    <span className="name">{item.name}</span>
                    <small className="coordinates">{coordinates(item, locale)}</small>
                </span>
            </button>
            <span className="actions">
                <button type="button" title="Edit" aria-label={`Edit ${item.name}`} onClick={onEdit}>
                    <Pencil />
                </button>
                <button type="button" title="Delete" aria-label={`Delete ${item.name}`} onClick={onDelete}>
                    <Trash />
                </button>
            </span>
        </li>
    );
}
