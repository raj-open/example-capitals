/**
 * Capital city: API shape, DB shape, and input parsing.
 *
 * API types are generated from /models/api.yaml into /backend/@api (`just models`).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Capital, CapitalInput } from "../../@api/types.gen.ts";
import { BadRequestError } from "../_core/errors.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export type { Capital, CapitalInput };

/**
 * A validated input, with defaults applied (`capital` = true); `colour` stays optional.
 */
export type CapitalData = Required<Omit<CapitalInput, "colour">> & Pick<CapitalInput, "colour">;

/**
 * `_id` is derived from country and name on creation (see /backend/src/_core/ids.ts)
 * and never changes afterwards, not even when country or name are edited.
 */
export interface CapitalDocument extends CapitalData {
    _id: string;
}

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const COLOUR = /^#[0-9a-fA-F]{6}$/;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function toCapital({ _id, ...rest }: CapitalDocument): Capital {
    return { id: _id, ...rest };
}

/**
 * Validates a request body; `capital` defaults to true (so a body without it creates a capital).
 * Only checks types and ranges, not uniqueness (enforced by the DB indexes).
 */
export function parseCapitalInput(body: unknown): CapitalData {
    if (typeof body !== "object" || body === null) {
        throw new BadRequestError("body must be an object");
    }

    const { name, country, latitude, longitude, capital = true, colour } = body as Record<string, unknown>;

    if (!isText(name) || !isText(country)) {
        throw new BadRequestError("name and country must be non-empty strings");
    }

    if (!isInRange(latitude, 90) || !isInRange(longitude, 180)) {
        throw new BadRequestError("latitude must be in [-90, 90] and longitude in [-180, 180]");
    }

    if (typeof capital !== "boolean") {
        throw new BadRequestError("capital must be a boolean");
    }

    if (colour !== undefined && !(typeof colour === "string" && COLOUR.test(colour))) {
        throw new BadRequestError("colour must be a hex colour #rrggbb");
    }

    const data: CapitalData = { name: name.trim(), country: country.trim(), latitude, longitude, capital };
    return colour === undefined ? data : { ...data, colour: colour.toLowerCase() };
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
