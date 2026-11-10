/**
 * Business logic for cities, in a scope:
 * all cities (/city) or capitals only (/capital).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { MongoBulkWriteError, MongoServerError } from "mongodb";

import { capitals } from "../db/collections.ts";

import { BadRequestError, ConflictError, NotFoundError } from "../_core/errors.ts";
import { capitalId, isId } from "../_core/ids.ts";
import type { Capital, CapitalData, CapitalDocument } from "../models/capital.ts";
import { toCapital } from "../models/capital.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface Scope {
    /** only capitals are visible, and created or updated cities must be capitals */
    capitalsOnly: boolean;
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export async function list(scope: Scope): Promise<Capital[]> {
    return capitals() //
        .find(filter(scope))
        .sort({ country: 1, capital: -1, name: 1 }) // capital first within a country
        .map(toCapital)
        .toArray();
}

/**
 * Looks up one capital by id or, for any other key, by name (case-insensitive, via the collation of the collection).
 * Names are not unique across countries, so a lookup by name returns the first by country.
 */
export async function get(scope: Scope, key: string): Promise<Capital> {
    const doc = isId(key)
        ? await capitals().findOne({ _id: key, ...filter(scope) })
        : await capitals().findOne({ name: key, ...filter(scope) }, { sort: { country: 1 } });

    if (doc === null) {
        throw new NotFoundError(`no ${noun(scope)} with id or name "${key}"`);
    }

    return toCapital(doc);
}

export async function create(scope: Scope, input: CapitalData): Promise<Capital> {
    assertScope(scope, input);
    const doc: CapitalDocument = { _id: capitalId(input.country, input.name), ...input };

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
export async function update(scope: Scope, id: string, input: CapitalData): Promise<Capital> {
    assertId(scope, id);
    assertScope(scope, input);
    let doc: CapitalDocument | null;

    try {
        doc = await capitals().findOneAndReplace({ _id: id, ...filter(scope) }, input, { returnDocument: "after" });
    } catch (err) {
        throw asConflict(err);
    }

    if (doc === null) {
        throw new NotFoundError(`no ${noun(scope)} with id "${id}"`);
    }

    return toCapital(doc);
}

export async function remove(scope: Scope, id: string): Promise<void> {
    assertId(scope, id);
    const { deletedCount } = await capitals().deleteOne({ _id: id, ...filter(scope) });

    if (deletedCount === 0) {
        throw new NotFoundError(`no ${noun(scope)} with id "${id}"`);
    }
}

/**
 * Adds many cities at once (all scopes); cities which already exist (or a second capital of a country) are skipped.
 * Returns the number of cities added.
 */
export async function insertMany(items: CapitalData[]): Promise<number> {
    if (items.length === 0) {
        return 0;
    }

    const docs: CapitalDocument[] = items.map((item) => ({ _id: capitalId(item.country, item.name), ...item }));

    try {
        return (await capitals().insertMany(docs, { ordered: false })).insertedCount;
    } catch (err) {
        if (err instanceof MongoBulkWriteError && [err.writeErrors].flat().every(({ code }) => code === 11000)) {
            return err.insertedCount;
        }

        throw err;
    }
}

/**
 * Removes all cities (the collection with its schema and indexes stays). Returns the number removed.
 */
export async function clear(): Promise<number> {
    return (await capitals().deleteMany({})).deletedCount;
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

function filter({ capitalsOnly }: Scope) {
    return capitalsOnly ? { capital: true } : {};
}

function noun({ capitalsOnly }: Scope): string {
    return capitalsOnly ? "capital" : "city";
}

/**
 * Checks the format of an id; a malformed id cannot exist, so it counts as not found.
 */
function assertId(scope: Scope, id: string): void {
    if (!isId(id)) {
        throw new NotFoundError(`no ${noun(scope)} with id "${id}"`);
    }
}

/**
 * In the scope of capitals, a city must stay a capital (other cities belong to /city).
 */
function assertScope({ capitalsOnly }: Scope, input: CapitalData): void {
    if (capitalsOnly && !input.capital) {
        throw new BadRequestError("only capitals here: use /city for other cities");
    }
}

/**
 * Maps a duplicate-key error to 409:
 * either the city exists (unique index on country + name, or the id derived from both)
 * or the country has a capital already (partial unique index on country);
 * returns any other error unchanged.
 */
function asConflict(err: unknown): unknown {
    if (err instanceof MongoServerError && err.code === 11000) {
        const fields = Object.keys(err.keyPattern ?? {});

        return new ConflictError(
            fields.length === 1 && fields[0] === "country"
                ? "this country already has a capital"
                : "this city already exists in this country",
        );
    }

    return err;
}
