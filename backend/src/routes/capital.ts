/**
 * Endpoints: /capital (capitals only) and /city (all cities), same shape.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { Router } from "express";

import { BadRequestError } from "../_core/errors.ts";
import { parseCapitalInput } from "../models/capital.ts";
import type { Scope } from "../services/capital.ts";
import * as service from "../services/capital.ts";

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

export function createRouter(scope: Scope): Router {
    const router = Router();

    router.get("/", async (req, res) => {
        const { country } = req.query;
        if (country !== undefined && typeof country !== "string") {
            throw new BadRequestError(
                `expected single query parameter of type string for country, got ${typeof country} instead`,
            );
        }
        res.json(await service.list(scope, country));
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
