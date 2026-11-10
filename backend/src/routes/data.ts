/**
 * Endpoints: /data, to clear and fill the DB (for tests and demos); disabled with DATA_ACTIONS=false.
 *
 * - DELETE /data            removes all cities
 * - POST   /data/examples   adds the example cities (/backend/src/data/examples.ts)
 * - POST   /data/capitals   imports all capitals from REST Countries (costs requests of the monthly quota)
 * - POST   /data/cities     adds a large sample of ordinary cities (/backend/src/data/cities.ts)
 *
 * Each responds with `{ count }`: the number of cities removed or added.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { Router } from "express";

import { ForbiddenError } from "../_core/errors.ts";
import { settings } from "../_core/settings.ts";
import { cities } from "../data/cities.ts";
import { EXAMPLES } from "../data/examples.ts";
import * as service from "../services/capital.ts";
import { importCapitals } from "../services/countries.ts";

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

export const router = Router();

router.use((_req, _res, next) => {
    next(settings.data.enabled ? undefined : new ForbiddenError("data actions are disabled (DATA_ACTIONS=false)"));
});

router.delete("/", async (_req, res) => {
    res.json({ count: await service.clear() });
});

router.post("/examples", async (_req, res) => {
    res.json({ count: await service.insertMany(EXAMPLES) });
});

router.post("/capitals", async (_req, res) => {
    res.json({ count: await importCapitals() });
});

router.post("/cities", async (_req, res) => {
    res.json({ count: await service.insertMany(cities()) });
});
