/**
 * Formatting for display.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { formatNumber, type Locale } from "./locale.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Coordinates rounded to 2 decimals (≈ 1 km) in the locale, e.g. `48.86° · 2.35°` or `48,86° · 2,35°`
 * (`·` as separator, since `,` is the decimal mark in some locales).
 */
export function coordinates({ latitude, longitude }: { latitude: number; longitude: number }, locale: Locale): string {
    return `${formatNumber(latitude, locale, 2)}° · ${formatNumber(longitude, locale, 2)}°`;
}
