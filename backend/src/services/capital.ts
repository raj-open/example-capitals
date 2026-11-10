/**
 * Business logic for capital cities.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { MongoServerError, ObjectId } from "mongodb";

import { capitals } from "../db/collections.ts";

import { ConflictError, NotFoundError } from "../_core/errors.ts";
import type { Capital, CapitalDocument, CapitalInput } from "../models/capital.ts";
import { toCapital } from "../models/capital.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export async function list(): Promise<Capital[]> {
    return capitals() //
        .find()
        .sort({ country: 1 })
        .map(toCapital)
        .toArray();
}

/**
 * Looks up one capital by name (case-insensitive, via the collation of the collection).
 */
export async function get(name: string): Promise<Capital> {
    const doc = await capitals().findOne({ name });

    if (doc === null) {
        throw new NotFoundError(`no capital named "${name}"`);
    }

    return toCapital(doc);
}

export async function create(input: CapitalInput): Promise<Capital> {
    const doc: CapitalDocument = { _id: new ObjectId(), ...input };

    try {
        await capitals().insertOne(doc);
    } catch (err) {
        throw asConflict(err);
    }

    return toCapital(doc);
}

/**
 * Replaces all fields of a capital (PUT semantics).
 */
export async function update(id: string, input: CapitalInput): Promise<Capital> {
    const _id = toObjectId(id);
    let doc: CapitalDocument | null;

    try {
        doc = await capitals().findOneAndReplace({ _id }, input, { returnDocument: "after" });
    } catch (err) {
        throw asConflict(err);
    }

    if (doc === null) {
        throw new NotFoundError(`no capital with id "${id}"`);
    }

    return toCapital(doc);
}

export async function remove(id: string): Promise<void> {
    const _id = toObjectId(id);
    const { deletedCount } = await capitals().deleteOne({ _id });

    if (deletedCount === 0) {
        throw new NotFoundError(`no capital with id "${id}"`);
    }
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Parses an id; an invalid id cannot exist, so it counts as not found.
 */
function toObjectId(id: string): ObjectId {
    if (!ObjectId.isValid(id)) {
        throw new NotFoundError(`no capital with id "${id}"`);
    }

    return new ObjectId(id);
}

/**
 * Maps a duplicate-key error (unique indexes on name and country) to 409;
 * returns any other error unchanged.
 */
function asConflict(err: unknown): unknown {
    if (err instanceof MongoServerError && err.code === 11000) {
        const fields = Object.keys(err.keyPattern ?? {}).join(", ");
        return new ConflictError(`a capital with this ${fields || "key"} already exists`);
    }

    return err;
}
