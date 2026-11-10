/**
 * Endpoints: /capital
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { Router } from "express";
import { parseCapitalInput } from "../models/capital.ts";
import * as service from "../services/capital.ts";

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

export const router = Router();

router.get("/", async (_req, res) => {
    res.json(await service.list());
});

router.get("/:name", async (req, res) => {
    res.json(await service.get(req.params.name));
});

router.post("/", async (req, res) => {
    res.status(201).json(await service.create(parseCapitalInput(req.body)));
});

router.put("/:id", async (req, res) => {
    res.json(await service.update(req.params.id, parseCapitalInput(req.body)));
});

router.delete("/:id", async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
});
