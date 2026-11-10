/**
 * Inline form to add or edit a capital (in the sidebar).
 *
 * Latitude and longitude are text fields (decimal keypad on phones), shown in the number format of the user;
 * native number fields would follow the browser instead. Both `.` and `,` are accepted as decimal mark.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { type FormEvent, useEffect, useRef, useState } from "react";

import type { CapitalInput } from "../../@api/types.gen.ts";
import { useSettings } from "../store/settings.ts";
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
    onSubmit,
    onCancel,
}: {
    initial?: CapitalInput;
    onSubmit: (input: CapitalInput) => Promise<unknown>;
    onCancel: () => void;
}) {
    const locale = useSettings((state) => state.locale);
    const [fields, setFields] = useState(
        initial
            ? {
                  ...initial,
                  latitude: formatNumber(initial.latitude, locale),
                  longitude: formatNumber(initial.longitude, locale),
              }
            : EMPTY,
    );
    const capitalsOnly = useSettings((state) => state.capitalsOnly);
    const [capital, setCapital] = useState(initial?.capital ?? true);
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
                // in capitals mode (/capital), every city is a capital
                capital: capitalsOnly || capital,
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
            {!capitalsOnly && (
                <label className="capital-form-check">
                    <input type="checkbox" checked={capital} onChange={(event) => setCapital(event.target.checked)} />
                    Capital of the country
                </label>
            )}
            {error && <p className="error">{error}</p>}
            <div className="capital-form-row">
                <button type="button" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="primary" disabled={busy}>
                    {initial ? "Save" : "Add"}
                </button>
            </div>
        </form>
    );
}
