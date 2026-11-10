/**
 * Integration: API + database (requires `just serve-db`).
 *
 * The tests share the database with `just dev`,
 * so they only use made-up capitals, which are removed before and after each test.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { close, connect } from "../../backend/src/db/client.ts";
import { capitals } from "../../backend/src/db/collections.ts";

import { createApp } from "../../backend/src/app.ts";
import type { Capital, CapitalInput } from "../../backend/src/models/capital.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const FIRST: CapitalInput = { name: "Testopolis", country: "Testland", latitude: 10, longitude: 20 };
const SECOND: CapitalInput = { name: "Testburg", country: "Testonia", latitude: -10.5, longitude: -20.5 };

// ----------------------------------------------------------------
// LOCAL VARIABLES
// ----------------------------------------------------------------

let server: Server;
let base: string;

// ----------------------------------------------------------------
// HOOKS
// ----------------------------------------------------------------

beforeAll(async () => {
    await connect();
    server = createApp().listen(0);
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    server?.close();
    await close();
});

beforeEach(cleanUp);
afterEach(cleanUp);

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

describe("/health", () => {
    it("responds ok", async () => {
        const response = await fetch(`${base}/health`);
        expect(await response.json()).toEqual({ ok: true });
    });
});

describe("/capital", () => {
    it("lists all capitals, sorted by country", async () => {
        const first = await create(FIRST);
        const second = await create(SECOND);

        const response = await send("GET", "/capital");
        expect(response.status).toBe(200);

        const items: Capital[] = await response.json();
        expect(items).toContainEqual(first);
        expect(items).toContainEqual(second);

        // same ordering as the collation of the collection (locale en, strength 2)
        const countries = items.map(({ country }) => country);
        const collator = new Intl.Collator("en", { sensitivity: "accent" });
        expect(countries).toEqual([...countries].sort(collator.compare));
    });

    it("finds a capital by name, case-insensitively", async () => {
        const created = await create(FIRST);

        for (const name of [FIRST.name, FIRST.name.toUpperCase(), FIRST.name.toLowerCase()]) {
            const response = await send("GET", `/capital/${encodeURIComponent(name)}`);
            expect(response.status).toBe(200);
            expect(await response.json()).toEqual(created);
        }

        const response = await send("GET", `/capital/${encodeURIComponent(SECOND.name)}`);
        expect(response.status).toBe(404);
    });

    it("creates, updates and deletes a capital", async () => {
        const created = await create(FIRST);
        expect(created).toEqual({ id: expect.any(String), ...FIRST });

        const changes: CapitalInput = { ...FIRST, name: "Testopolis Nova", latitude: 11.5 };
        let response = await send("PUT", `/capital/${created.id}`, changes);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ id: created.id, ...changes });

        response = await send("GET", `/capital/${encodeURIComponent(changes.name)}`);
        expect(await response.json()).toEqual({ id: created.id, ...changes });

        response = await send("DELETE", `/capital/${created.id}`);
        expect(response.status).toBe(204);

        response = await send("GET", `/capital/${encodeURIComponent(changes.name)}`);
        expect(response.status).toBe(404);

        response = await send("PUT", `/capital/${created.id}`, changes);
        expect(response.status).toBe(404);

        response = await send("DELETE", `/capital/${created.id}`);
        expect(response.status).toBe(404);
    });

    it("rejects duplicate names and countries with 409", async () => {
        await create(FIRST);

        // case-insensitive, via the collation of the unique indexes
        let response = await send("POST", "/capital", { ...SECOND, name: FIRST.name.toLowerCase() });
        expect(response.status).toBe(409);

        response = await send("POST", "/capital", { ...SECOND, country: FIRST.country.toUpperCase() });
        expect(response.status).toBe(409);

        const second = await create(SECOND);

        response = await send("PUT", `/capital/${second.id}`, { ...SECOND, name: FIRST.name });
        expect(response.status).toBe(409);

        response = await send("PUT", `/capital/${second.id}`, { ...SECOND, country: FIRST.country });
        expect(response.status).toBe(409);
    });

    it("rejects an invalid body with 400", async () => {
        const response = await send("POST", "/capital", { ...FIRST, longitude: 181 });
        expect(response.status).toBe(400);
    });
});

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

async function send(method: string, path: string, body?: unknown): Promise<Response> {
    if (body === undefined) {
        return fetch(`${base}${path}`, { method });
    }

    return fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function create(input: CapitalInput): Promise<Capital> {
    const response = await send("POST", "/capital", input);
    expect(response.status).toBe(201);
    return response.json();
}

/**
 * Removes the made-up capitals (incl. renamed ones), leaving all other data untouched.
 */
async function cleanUp(): Promise<void> {
    const countries = [FIRST.country, SECOND.country];
    await capitals().deleteMany({ country: { $in: countries } });
}
