/**
 * Endpoints: /places
 *
 * - GET /places   the sample of ordinary cities (/backend/assets/cities.json), for snap-to in the UI
 *
 * Read only and independent of the DB, so not affected by DATA_ACTIONS.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { Router } from "express";

import { places } from "../data/cities.ts";

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

export const router = Router();

router.get("/", (_req, res) => {
    res.json(places());
});
