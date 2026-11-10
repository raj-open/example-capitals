/**
 * A few well-known cities (capitals and others) as examples for manual tests, coloured by region.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { REGION_COLOURS, type Region } from "../_core/regions.ts";
import type { CapitalData } from "../models/capital.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/** [country, city, latitude, longitude, capital, region], sorted by country and city */
const ROWS: [string, string, number, number, boolean, Region][] = [
    ["Argentina", "Buenos Aires", -34.6, -58.38, true, "Americas"],
    ["Brazil", "Brasília", -15.79, -47.88, true, "Americas"],
    ["Canada", "Ottawa", 45.42, -75.7, true, "Americas"],
    ["Canada", "Toronto", 43.65, -79.38, false, "Americas"],
    ["Egypt", "Cairo", 30.04, 31.24, true, "Africa"],
    ["France", "Paris", 48.86, 2.35, true, "Europe"],
    ["Germany", "Berlin", 52.52, 13.4, true, "Europe"],
    ["Germany", "Frankfurt", 50.11, 8.68, false, "Europe"],
    ["Greenland", "Nuuk", 64.18, -51.72, true, "Americas"],
    ["Iceland", "Reykjavík", 64.15, -21.94, true, "Europe"],
    ["India", "New Delhi", 28.61, 77.21, true, "Asia"],
    ["Japan", "Osaka", 34.69, 135.5, false, "Asia"],
    ["Japan", "Tokyo", 35.68, 139.69, true, "Asia"],
    ["Kenya", "Nairobi", -1.29, 36.82, true, "Africa"],
    ["Mexico", "Mexico City", 19.43, -99.13, true, "Americas"],
    ["New Zealand", "Wellington", -41.29, 174.78, true, "Oceania"],
    ["Norway", "Oslo", 59.91, 10.75, true, "Europe"],
    ["Peru", "Lima", -12.05, -77.04, true, "Americas"],
    ["South Korea", "Busan", 35.18, 129.08, false, "Asia"],
    ["South Korea", "Seoul", 37.57, 126.98, true, "Asia"],
    ["Spain", "Madrid", 40.42, -3.7, true, "Europe"],
    ["United Kingdom", "Birmingham", 52.49, -1.89, false, "Europe"],
    ["United Kingdom", "London", 51.51, -0.13, true, "Europe"],
    ["United States", "Los Angeles", 34.05, -118.24, false, "Americas"],
    ["United States", "New York", 40.71, -74.01, false, "Americas"],
];

// ----------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------

export const EXAMPLES: CapitalData[] = ROWS.map(([country, name, latitude, longitude, capital, region]) => ({
    country,
    name,
    latitude,
    longitude,
    capital,
    colour: REGION_COLOURS[region],
}));
