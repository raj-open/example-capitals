/**
 * Endpoints: /capital (capitals only, as in the brief) and /city (all cities), same shape.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { Router } from "express";

import { parseCapitalInput } from "../models/capital.ts";
import type { Scope } from "../services/capital.ts";
import * as service from "../services/capital.ts";

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

export function createRouter(scope: Scope): Router {
    const router = Router();

    router.get("/", async (_req, res) => {
        res.json(await service.list(scope));
    });

    router.get("/:key", async (req, res) => {
        res.json(await service.get(scope, req.params.key));
    });

    router.post("/", async (req, res) => {
        res.status(201).json(await service.create(scope, parseCapitalInput(req.body)));
    });

    router.put("/:id", async (req, res) => {
        res.json(await service.update(scope, req.params.id, parseCapitalInput(req.body)));
    });

    router.delete("/:id", async (req, res) => {
        await service.remove(scope, req.params.id);
        res.status(204).end();
    });

    return router;
}
