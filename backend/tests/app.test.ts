// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.ts";

// ----------------------------------------------------------------
// LOCAL VARIABLES
// ----------------------------------------------------------------

let server: Server;
let base: string;

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

beforeAll(() => {
    server = createApp().listen(0);
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
    server.close();
});

describe("/health", () => {
    it("reports the database as unreachable (none here)", async () => {
        const response = await fetch(`${base}/health`);
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ ok: false });
    });
});

describe("/places", () => {
    it("lists the sample of cities (no database needed)", async () => {
        const response = await fetch(`${base}/places`);
        expect(response.status).toBe(200);

        const items = await response.json();
        expect(items).toHaveLength(300);
        expect(Object.keys(items[0]).sort()).toEqual(["country", "latitude", "longitude", "name"]);
    });
});

// NOTE: no database here, so only requests that fail before the DB is reached
describe("/capital", () => {
    it("gets", async () => {
        const response = await fetch(`${base}/capital?country=Land1&country=Land2`);
        expect(response.status).toBe(400);
    });

    it("rejects an invalid body before touching the DB", async () => {
        const response = await fetch(`${base}/capital`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "" }),
        });
        expect(response.status).toBe(400);
    });

    it("rejects an invalid body on update", async () => {
        const response = await fetch(`${base}/capital/0123456789abcdef01234567`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Paris", country: "France", latitude: 91, longitude: 0 }),
        });
        expect(response.status).toBe(400);
    });

    it.each(["PUT", "DELETE"])("treats an invalid id as not found (%s)", async (method) => {
        const response = await fetch(`${base}/capital/not-an-id`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Paris", country: "France", latitude: 48.86, longitude: 2.35 }),
        });
        expect(response.status).toBe(404);
    });
});
