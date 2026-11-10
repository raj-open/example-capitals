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
    it("responds ok", async () => {
        const response = await fetch(`${base}/health`);
        expect(await response.json()).toEqual({ ok: true });
    });
});

describe("/capital", () => {
    it("is not implemented yet", async () => {
        const response = await fetch(`${base}/capital`);
        expect(response.status).toBe(501);
    });

    it("rejects an invalid body before touching the DB", async () => {
        const response = await fetch(`${base}/capital`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "" }),
        });
        expect(response.status).toBe(400);
    });
});
