/**
 * Integration: API + database (requires `just serve-db`).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../backend/src/app.ts";
import { close, connect } from "../../backend/src/db/client.ts";

// ----------------------------------------------------------------
// LOCAL VARIABLES
// ----------------------------------------------------------------

let server: Server;
let base: string;

// ----------------------------------------------------------------
// TESTS
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

describe("/health", () => {
    it("responds ok", async () => {
        const response = await fetch(`${base}/health`);
        expect(await response.json()).toEqual({ ok: true });
    });
});

describe("/capital", () => {
    it.todo("lists the imported capitals");
    it.todo("finds a capital by name, case-insensitively");
    it.todo("creates, updates and deletes a capital");
    it.todo("rejects duplicate names and countries with 409");
});
