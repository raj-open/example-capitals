/**
 * Settings (gear on the map): the world (Earth or another body of the solar system, an easter egg),
 * appearance of the map on Earth (basemap, light preset, theme) and the number format.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { BODIES, type Body, LIGHT_PRESETS, STYLES, TEXTURE_CREDIT, THEMES, useMapStyle } from "../store/map.ts";
import { useSettings } from "../store/settings.ts";
import { LOCALE, LOCALES, type Locale } from "../utils/locale.ts";
import { Gear } from "./icons.tsx";
import { MapPanel } from "./MapPanel.tsx";

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function MapSettings() {
    const { body, style, lightPreset, theme, set } = useMapStyle();
    const earth = body === "earth";
    const locale = useSettings((state) => state.locale);
    const setSettings = useSettings((state) => state.set);

    return (
        <MapPanel label="Settings" icon={<Gear />} spin>
            <fieldset>
                <select
                    className="map-settings-select"
                    aria-label="World"
                    value={body}
                    onChange={(event) => set({ body: event.target.value as Body })}
                >
                    {(Object.keys(BODIES) as Body[]).map((item) => (
                        <option key={item} value={item}>
                            {item.charAt(0).toLocaleUpperCase(LOCALE) + item.slice(1)}
                        </option>
                    ))}
                </select>
                {!earth && <small className="map-settings-credit">{TEXTURE_CREDIT}</small>}
            </fieldset>
            <Options
                label="Map"
                disabled={!earth}
                values={Object.keys(STYLES) as (keyof typeof STYLES)[]}
                value={style}
                onChange={(value) => set({ style: value })}
            />
            <Options
                label="Light"
                disabled={!earth}
                values={LIGHT_PRESETS}
                value={lightPreset}
                onChange={(value) => set({ lightPreset: value })}
            />
            <Options
                label="Theme"
                disabled={!earth}
                values={THEMES}
                value={theme}
                onChange={(value) => set({ theme: value })}
            />
            <Options
                label="Numbers"
                values={Object.keys(LOCALES) as Locale[]}
                labels={LOCALES}
                value={locale}
                onChange={(value) => setSettings({ locale: value })}
            />
        </MapPanel>
    );
}

// ----------------------------------------------------------------
// AUXILIARY COMPONENTS
// ----------------------------------------------------------------

/**
 * Segmented buttons for one option.
 */
function Options<T extends string>({
    label,
    values,
    labels,
    value,
    disabled = false,
    onChange,
}: {
    label: string;
    values: readonly T[];
    labels?: Record<T, string>;
    disabled?: boolean;
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <fieldset disabled={disabled}>
            <legend>{label}</legend>
            <div className="map-settings-options">
                {values.map((item) => (
                    <button
                        key={item}
                        type="button"
                        title={labels ? item : undefined}
                        aria-pressed={item === value}
                        onClick={() => onChange(item)}
                    >
                        {labels?.[item] ?? item}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}
