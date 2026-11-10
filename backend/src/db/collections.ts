/**
 * Typed access to the collections.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Collection } from "mongodb";

import type { CapitalDocument } from "../models/capital.ts";
import { db } from "./client.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function capitals(): Collection<CapitalDocument> {
    return db().collection<CapitalDocument>("capitals");
}
