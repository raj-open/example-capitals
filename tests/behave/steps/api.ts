/**
 * Steps for requests against the API (in-process, without database).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { After, Before, Then, When, type World } from "@cucumber/cucumber";

import { createApp } from "../../../backend/src/app.ts";

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

interface State extends World {
    server: Server;
    base: string;
    response: Response;
}

// ----------------------------------------------------------------
// HOOKS
// ----------------------------------------------------------------

Before(function (this: State) {
    this.server = createApp().listen(0);
    this.base = `http://localhost:${(this.server.address() as AddressInfo).port}`;
});

After(function (this: State) {
    this.server.close();
});

// ----------------------------------------------------------------
// STEPS
// ----------------------------------------------------------------

When("I request {string}", async function (this: State, request: string) {
    this.response = await send(this.base, request);
});

When("I send {string} with body {}", async function (this: State, request: string, body: string) {
    this.response = await send(this.base, request, JSON.parse(body));
});

Then("the response status is {int}", function (this: State, status: number) {
    assert.equal(this.response.status, status);
});

Then("the response body is {}", async function (this: State, body: string) {
    assert.deepEqual(await this.response.json(), JSON.parse(body));
});

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Sends a request given as `"{METHOD} {path}"`, with an optional JSON body.
 */
async function send(base: string, request: string, body?: unknown): Promise<Response> {
    const [method, path] = request.split(" ");

    if (body === undefined) {
        return fetch(`${base}${path}`, { method });
    }

    return fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
