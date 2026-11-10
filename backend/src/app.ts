/**
 * Express app (without listening), so tests can mount it.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import cors from "cors";
import express, { type Express } from "express";

import { handleErrors } from "./_core/errors.ts";
import { router as capital } from "./routes/capital.ts";
import { router as health } from "./routes/health.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function createApp(): Express {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.use("/health", health);
    app.use("/capital", capital);

    app.use(handleErrors);
    return app;
}
