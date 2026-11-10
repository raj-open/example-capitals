/**
 * Locales of the app.
 *
 * - `LOCALE` (en-GB) is the default and is always used for sorting and search (like the backend)
 * - the user may choose another locale for numbers (display and entry), see /frontend/src/store/settings.ts
 */

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

export const LOCALE = "en-GB";

/** locales the user can choose, with a sample of their number format */
export const LOCALES = {
    "en-GB": "12.34",
    "de-DE": "12,34",
} as const;

export type Locale = keyof typeof LOCALES;

/** a decimal number with `.` or `,` as decimal mark (no grouping, which coordinates never need) */
const NUMBER = /^[-+−]?\d+(?:[.,]\d+)?$/;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Formats a number in a locale, without grouping, e.g. `48.8566` (en-GB) or `48,8566` (de-DE).
 */
export function formatNumber(value: number, locale: Locale, digits?: number): string {
    return new Intl.NumberFormat(locale, {
        useGrouping: false,
        minimumFractionDigits: digits ?? 0,
        maximumFractionDigits: digits ?? 6,
    }).format(value);
}

/**
 * Parses a number typed in by the user, accepting both `.` and `,` as decimal mark (whatever the locale);
 * returns undefined for anything else.
 */
export function parseNumber(text: string): number | undefined {
    const value = text.trim();

    if (!NUMBER.test(value)) {
        return undefined;
    }

    return Number(value.replace(",", ".").replace("−", "-"));
}
