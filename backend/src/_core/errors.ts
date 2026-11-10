/**
 * Errors with an HTTP status, and the express middleware which renders them.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { ErrorRequestHandler } from "express";

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

export class HttpError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export class BadRequestError extends HttpError {
    constructor(message = "bad request") {
        super(400, message);
    }
}

export class NotFoundError extends HttpError {
    constructor(message = "not found") {
        super(404, message);
    }
}

export class ConflictError extends HttpError {
    constructor(message = "conflict") {
        super(409, message);
    }
}

export class NotImplementedError extends HttpError {
    constructor(message = "not implemented") {
        super(501, message);
    }
}

// ----------------------------------------------------------------
// MIDDLEWARE
// ----------------------------------------------------------------

export const handleErrors: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
    }

    console.error(err);
    res.status(500).json({ error: "internal server error" });
};
