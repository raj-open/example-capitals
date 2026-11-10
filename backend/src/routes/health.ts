/**
 * Endpoints: /health
 *
 * 200 `{"ok": true}` if the API runs and the database answers (ping), else 503 `{"ok": false}`.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { Router } from "express";

import { ping } from "../db/client.ts";

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

export const router = Router();

router.get("/", async (_req, res) => {
    const ok = await ping();
    res.status(ok ? 200 : 503).json({ ok });
});
