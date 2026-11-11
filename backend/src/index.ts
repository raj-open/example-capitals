/**
 * Entrypoint: connect to the DB, serve the API; an empty DB gets the example cities.
 *
 * Nothing is imported from REST Countries on start (it costs requests of the monthly quota):
 * capitals and other cities are added on request (POST /data/capitals, /data/cities; settings panel or `just data-*`).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { connect } from "./db/client.ts";

import { settings } from "./_core/settings.ts";
import { createApp } from "./app.ts";
import { EXAMPLES } from "./data/examples.ts";
import { insertIfEmpty } from "./services/capital.ts";

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

await connect();

createApp().listen(settings.port, async () => {
    console.log(`API on http://localhost:${settings.port}`);

    try {
        const count = await insertIfEmpty(EXAMPLES);
        console.log(count > 0 ? `empty DB: added ${count} example cities` : "cities already stored");
    } catch (err) {
        console.error("adding the examples failed:", err);
    }
});
