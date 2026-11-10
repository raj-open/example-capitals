/**
 * Capital city: API shape, DB shape, and input parsing.
 *
 * API types are generated from /models/api.yaml into /backend/@api (`just models`).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { ObjectId } from "mongodb";
import type { Capital, CapitalInput } from "../../@api/types.gen.ts";
import { BadRequestError } from "../_core/errors.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export type { Capital, CapitalInput };

export interface CapitalDocument extends CapitalInput {
    _id: ObjectId;
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function toCapital({ _id, ...rest }: CapitalDocument): Capital {
    return { id: _id.toHexString(), ...rest };
}

/**
 * Validates a request body.
 * Only checks types and ranges, not uniqueness (enforced by the DB indexes).
 */
export function parseCapitalInput(body: unknown): CapitalInput {
    if (typeof body !== "object" || body === null) {
        throw new BadRequestError("body must be an object");
    }

    const { name, country, latitude, longitude } = body as Record<string, unknown>;

    if (!isText(name) || !isText(country)) {
        throw new BadRequestError("name and country must be non-empty strings");
    }

    if (!isInRange(latitude, 90) || !isInRange(longitude, 180)) {
        throw new BadRequestError("latitude must be in [-90, 90] and longitude in [-180, 180]");
    }

    return { name: name.trim(), country: country.trim(), latitude, longitude };
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

function isText(value: unknown): value is string {
    return typeof value === "string" && value.trim() !== "";
}

function isInRange(value: unknown, bound: number): value is number {
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= bound;
}
