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

const FIRST: CapitalInput = {
    name: "Testopolis",
    country: "Testland",
    latitude: 10,
    longitude: 20,
    capital: true,
};
const SECOND: CapitalInput = {
    country: "Testonia",
    name: "Testburg",
    latitude: -10.5,
    longitude: -20.5,
    capital: true,
};
const COUNTRIES: CapitalInput[] = [
    {
        country: "Goldonia",
        name: "Goldstein",
        latitude: 50.78,
        longitude: 60.14,
        capital: true,
    },
    {
        country: "Silvania",
        name: "Silverford",
        latitude: -85.78,
        longitude: 160.14,
        capital: true,
    },
    {
        country: "Copernia",
        name: "Coppergrad",
        latitude: -21.08,
        longitude: -137.14,
        capital: true,
    },
];

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

        // same ordering as the collation of the collection (locale en, strength 2): by country, capital first, then name
        const collator = new Intl.Collator("en", { sensitivity: "accent" });
        const keys = items.map(({ country, capital, name }) => [country, capital, name] as const);
        const sorted = [...keys].sort(
            (a, b) => collator.compare(a[0], b[0]) || Number(b[1]) - Number(a[1]) || collator.compare(a[2], b[2]),
        );
        expect(keys).toEqual(sorted);
    });

    it("finds a capital by id", async () => {
        const created = await create(FIRST);

        const response = await send("GET", `/capital/${created.id}`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(created);
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

    it("allows several cities per country and a name in several countries", async () => {
        await create(FIRST);
        await createCity({ ...FIRST, name: SECOND.name, latitude: 1, capital: false });
        await create({ ...SECOND, name: FIRST.name });
    });

    it("keeps other cities out of /capital, but lists them in /city", async () => {
        const capital = await create(FIRST);
        const other = await createCity({ ...FIRST, name: SECOND.name, capital: false });

        let items: Capital[] = await (await send("GET", "/capital")).json();
        expect(items).toContainEqual(capital);
        expect(items).not.toContainEqual(other);

        items = await (await send("GET", "/city")).json();
        expect(items).toContainEqual(capital);
        expect(items).toContainEqual(other);

        expect((await send("GET", `/capital/${other.id}`)).status).toBe(404);
        expect((await send("GET", `/city/${other.id}`)).status).toBe(200);
        expect((await send("POST", "/capital", { ...SECOND, capital: false })).status).toBe(400);
        expect((await send("DELETE", `/capital/${other.id}`)).status).toBe(404);
        expect((await send("DELETE", `/city/${other.id}`)).status).toBe(204);
    });

    it("defaults to a capital and rejects a second capital of a country with 409", async () => {
        const { capital: _, ...body } = FIRST;
        expect(await create(body)).toMatchObject({ capital: true });

        const response = await send("POST", "/capital", { ...FIRST, name: SECOND.name });
        expect(response.status).toBe(409);
    });

    it("rejects a duplicate (country, name) with 409", async () => {
        await create(FIRST);

        // case-insensitive, via the collation of the unique index
        let response = await send("POST", "/capital", {
            ...FIRST,
            country: FIRST.country.toUpperCase(),
            name: FIRST.name.toLowerCase(),
        });
        expect(response.status).toBe(409);

        const second = await create(SECOND);

        response = await send("PUT", `/capital/${second.id}`, { ...SECOND, country: FIRST.country, name: FIRST.name });
        expect(response.status).toBe(409);
    });

    it("rejects an invalid body with 400", async () => {
        const response = await send("POST", "/capital", { ...FIRST, longitude: 181 });
        expect(response.status).toBe(400);
    });
});

describe("/capital?country", () => {
    const ids: string[] = [];

    beforeAll(async () => {
        for (const country of COUNTRIES) {
            const city = await create(country);
            ids.push(city.id);
        }
    });

    afterAll(async () => {
        console.log(ids);
        for (const id of ids) {
            await deleteCity(id);
        }
    });

    it("does not filter by country if no query provided", async () => {
        const response = await send("GET", "/capital");
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBeGreaterThan(1);
    });

    it("does not filter by country query with empty country provided", async () => {
        const response = await send("GET", "/capital?country=");
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBeGreaterThan(1);
    });

    it("filters by country if one provided", async () => {
        const response = await send("GET", `/capital?country=Silvania`);
        const body = await response.json();
        expect(body).toBeInstanceOf(Array);
        expect(body).toHaveLength(1);
    });

    it("filters by country if unknown provided", async () => {
        const response = await send("GET", `/capital?country=Coalland`);
        const body = await response.json();
        expect(body).toBeInstanceOf(Array);
        expect(body).toEqual([]);
    });

    it.each(["country=Silvania&country=Goldonia", "country=Silvania&country=Goldonia&country=Coalland"])(
        "rejects ?%s with desired 400 error code",
        async (query) => {
            const response = await send("GET", `/capital?${query}`);
            const body = await response.json();
            expect(body.error).toBeDefined();
        },
    );
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

async function create(input: CapitalInput, resource = "capital"): Promise<Capital> {
    const response = await send("POST", `/${resource}`, input);
    expect(response.status).toBe(201);
    return response.json();
}

async function deleteCity(id: string, resource = "capital"): Promise<void> {
    const response = await send("DELETE", `/${resource}/${id}`);
    expect(response.status).toBe(204);
}

async function createCity(input: CapitalInput): Promise<Capital> {
    return create(input, "city");
}

/**
 * Removes the made-up capitals (incl. renamed ones), leaving all other data untouched.
 */
async function cleanUp(): Promise<void> {
    const countries = [FIRST.country, SECOND.country];
    await capitals().deleteMany({ country: { $in: countries } });
}
