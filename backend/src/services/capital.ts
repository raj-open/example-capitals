/**
 * Business logic for capital cities.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { NotImplementedError } from "../_core/errors.ts";
import type { Capital, CapitalInput } from "../models/capital.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export async function list(): Promise<Capital[]> {
    // TODO: capitals().find().sort({ country: 1 }), mapped via toCapital
    throw new NotImplementedError();
}

/**
 * Looks up one capital by name (case-insensitive).
 */
export async function get(_name: string): Promise<Capital> {
    // TODO: findOne({ name }); the collection collation makes it case-insensitive; 404 if missing
    throw new NotImplementedError();
}

export async function create(_input: CapitalInput): Promise<Capital> {
    // TODO: insert; map duplicate key (code 11000) to ConflictError
    throw new NotImplementedError();
}

export async function update(_id: string, _input: CapitalInput): Promise<Capital> {
    // TODO: validate id (ObjectId.isValid), findOneAndUpdate; 404 if missing, 409 on duplicate key
    throw new NotImplementedError();
}

export async function remove(_id: string): Promise<void> {
    // TODO: validate id, deleteOne; 404 if nothing deleted
    throw new NotImplementedError();
}
