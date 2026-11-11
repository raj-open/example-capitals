/**
 * Country names from ISO 3166-1 alpha-2 codes (as on the place labels of the map), without data files or requests:
 * the browser's own region names (Intl.DisplayNames), matched to the names already known (REST Countries style),
 * e.g. "St. Kitts & Nevis" → "Saint Kitts and Nevis"; a few differ beyond spelling and are named here.
 */

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const REGIONS = new Intl.DisplayNames(["en-GB"], { type: "region" });

/** names of REST Countries which differ from those of the browser beyond spelling */
const NAMES: Record<string, string> = {
    CD: "DR Congo",
    CG: "Republic of the Congo",
    CI: "Ivory Coast",
    CV: "Cabo Verde",
    FK: "Falkland Islands",
    GS: "South Georgia",
    MM: "Myanmar",
    MO: "Macau",
    SH: "Saint Helena, Ascension and Tristan da Cunha",
    TF: "French Southern and Antarctic Lands",
    TR: "Turkey",
    VI: "United States Virgin Islands",
};

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * The name of a country by its code, as among `known` names if it is there; undefined for an unknown code.
 */
export function countryName(code: string, known: Iterable<string> = []): string | undefined {
    const name = NAMES[code] ?? region(code);

    if (name === undefined) {
        return undefined;
    }

    const key = normalise(name);

    for (const other of known) {
        if (normalise(other) === key) {
            return other;
        }
    }

    return name;
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

function region(code: string): string | undefined {
    try {
        const name = REGIONS.of(code.toUpperCase());
        return name && name !== code.toUpperCase() ? name : undefined;
    } catch {
        return undefined;
    }
}

/** for comparing: lower case, "&" = "and", "St." = "Saint", only letters and digits */
function normalise(name: string): string {
    return name
        .toLocaleLowerCase("en-GB")
        .replace(/&/g, " and ")
        .replace(/\bst\.?\s/g, "saint ")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}
