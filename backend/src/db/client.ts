/**
 * Connection to MongoDB.
 *
 * The collection (validator, collation, unique indexes) is created by /db/schema.js
 * when the database container starts for the first time.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { type Db, MongoClient } from "mongodb";

import { settings } from "../_core/settings.ts";

// ----------------------------------------------------------------
// LOCAL VARIABLES
// ----------------------------------------------------------------

let client: MongoClient | undefined;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function url(): string {
    const { host, port, name, user, password } = settings.database;
    const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : "";
    const options = user ? "?authSource=admin" : "";
    return `mongodb://${auth}${host}:${port}/${name}${options}`;
}

export async function connect(): Promise<Db> {
    client ??= new MongoClient(url(), { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    return client.db(settings.database.name);
}

export function db(): Db {
    if (!client) {
        throw new Error("database not connected");
    }

    return client.db(settings.database.name);
}

export async function close(): Promise<void> {
    await client?.close();
    client = undefined;
}
