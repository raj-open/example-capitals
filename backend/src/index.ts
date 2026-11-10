/**
 * Entrypoint: connect to the DB, import data, serve the API.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { settings } from "./_core/settings.ts";
import { createApp } from "./app.ts";
import { connect } from "./db/client.ts";
import { importAll } from "./services/restcountries.ts";

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

await connect();

try {
    const count = await importAll();
    console.log(`imported ${count} capitals`);
} catch (err) {
    console.error("import failed:", err);
}

createApp().listen(settings.port, () => {
    console.log(`API on http://localhost:${settings.port}`);
});
