/**
 * Inline form to add or edit a capital (in the sidebar).
 * To add, it may come prefilled (a city proposed on the map), with any fields;
 * if it says whether the city is a capital, the choice is offered even with "Capitals only".
 *
 * The colour of the marker can be set here, too (as in the popup); unchanged, the city keeps its colour (or the default).
 *
 * Latitude and longitude are text fields (decimal keypad on phones), shown in the number format of the user;
 * native number fields would follow the browser instead. Both `.` and `,` are accepted as decimal mark.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { type FormEvent, useEffect, useRef, useState } from "react";

import type { CapitalInput } from "../../@api/types.gen.ts";
import { DEFAULT_COLOUR } from "../store/capital.ts";
import { useSettings } from "../store/settings.ts";
import type { Locale } from "../utils/locale.ts";
import { formatNumber, LOCALES, parseNumber } from "../utils/locale.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const EMPTY = { country: "", name: "", latitude: "", longitude: "" };

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function CapitalForm({
    initial,
    action,
    onSubmit,
    onCancel,
}: {
    initial?: Partial<CapitalInput>;
    action: "Add" | "Save";
    onSubmit: (input: CapitalInput) => Promise<unknown>;
    onCancel: () => void;
}) {
    const locale = useSettings((state) => state.locale);
    const [fields, setFields] = useState(() => text(initial, locale));
    const capitalsOnly = useSettings((state) => state.capitalsOnly);
    const [capital, setCapital] = useState(initial?.capital ?? true);
    const [colour, setColour] = useState(initial?.colour);
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const first = useRef<HTMLInputElement>(null);

    // the form opens on request (add, edit), so focusing its first field is expected
    useEffect(() => {
        first.current?.focus();
    }, []);

    const field = (key: keyof typeof EMPTY) => ({
        value: fields[key],
        onChange: (event: { target: { value: string } }) => setFields({ ...fields, [key]: event.target.value }),
    });

    async function submit(event: FormEvent) {
        event.preventDefault();

        const latitude = parseNumber(fields.latitude);
        const longitude = parseNumber(fields.longitude);

        if (latitude === undefined || Math.abs(latitude) > 90 || longitude === undefined || Math.abs(longitude) > 180) {
            setError(`Latitude must be in [-90, 90] and longitude in [-180, 180], e.g. ${LOCALES[locale]}`);
            return;
        }

        setBusy(true);

        try {
            await onSubmit({
                country: fields.country.trim(),
                name: fields.name.trim(),
                latitude,
                longitude,
                capital,
                ...(colour && { colour }),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
        }
    }

    return (
        <form
            className="capital-form"
            onSubmit={submit}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    onCancel();
                }
            }}
        >
            <input placeholder="Country" aria-label="Country" required ref={first} {...field("country")} />
            <input placeholder="City" aria-label="City" required {...field("name")} />
            <div className="capital-form-row">
                <input
                    inputMode="decimal"
                    placeholder={`Latitude (${LOCALES[locale]})`}
                    aria-label="Latitude"
                    required
                    {...field("latitude")}
                />
                <input
                    inputMode="decimal"
                    placeholder={`Longitude (${LOCALES[locale]})`}
                    aria-label="Longitude"
                    required
                    {...field("longitude")}
                />
            </div>
            <div className="capital-form-options">
                {(!capitalsOnly || initial?.capital === false) && (
                    <label className="capital-form-check">
                        <input
                            type="checkbox"
                            checked={capital}
                            onChange={(event) => setCapital(event.target.checked)}
                        />
                        Capital of the country
                    </label>
                )}
                <label className="capital-form-colour">
                    Colour
                    <input
                        type="color"
                        value={colour ?? DEFAULT_COLOUR}
                        onChange={(event) => setColour(event.target.value)}
                    />
                </label>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="capital-form-row">
                <button type="button" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="primary" disabled={busy}>
                    {action}
                </button>
            </div>
        </form>
    );
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * The text fields of the form (missing values stay empty).
 */
function text(initial: Partial<CapitalInput> | undefined, locale: Locale): typeof EMPTY {
    const number = (value?: number) => (value === undefined ? "" : formatNumber(value, locale));

    return {
        country: initial?.country ?? "",
        name: initial?.name ?? "",
        latitude: number(initial?.latitude),
        longitude: number(initial?.longitude),
    };
}
