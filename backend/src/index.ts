/**
 * Entrypoint: connect to the DB, serve the API, then import data.
 *
 * NOTE: the API listens before the import (which takes seconds), so a client started at the same time
 * (e.g. the UI's dev server) is not refused; until the import is done, the DB may still be empty
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { connect } from "./db/client.ts";

import { settings } from "./_core/settings.ts";
import { createApp } from "./app.ts";
import { importOnStart } from "./services/countries.ts";

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

await connect();

createApp().listen(settings.port, async () => {
    console.log(`API on http://localhost:${settings.port}`);

    try {
        const count = await importOnStart();
        console.log(`imported ${count} capitals`);
    } catch (err) {
        console.error("import failed:", err);
    }
});
