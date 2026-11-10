/**
 * Adds the example cities (see /backend/src/data/examples.ts) via POST /data/examples, for manual tests.
 *
 * Usage (with the backend running): node backend/src/seed.ts [base url]
 * Cities that already exist are skipped, so it can be run any number of times.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { settings } from "./_core/settings.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const BASE = process.argv[2] ?? `http://localhost:${settings.port}`;

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

const response = await fetch(`${BASE}/data/examples`, { method: "POST" });

if (!response.ok) {
    throw new Error(`POST /data/examples: ${response.status} ${await response.text()}`);
}

const { count } = (await response.json()) as { count: number };
console.log(`added ${count} cities (${BASE})`);
