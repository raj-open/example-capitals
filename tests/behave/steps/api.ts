/**
 * Steps for requests against the API (the backend binary, without database).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import assert from "node:assert/strict";
import { AfterAll, BeforeAll, Then, When, type World } from "@cucumber/cucumber";

import { type Server, start } from "../../server.ts";

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

interface State extends World {
    response: Response;
}

// ----------------------------------------------------------------
// LOCAL VARIABLES
// ----------------------------------------------------------------

/** one backend for all scenarios */
let server: Server;

// ----------------------------------------------------------------
// HOOKS
// ----------------------------------------------------------------

BeforeAll(async () => {
    server = await start({ DATABASE_HOST: "" });
});

AfterAll(() => {
    server?.stop();
});

// ----------------------------------------------------------------
// STEPS
// ----------------------------------------------------------------

When("I request {string}", async function (this: State, request: string) {
    this.response = await send(server.base, request);
});

When("I send {string} with body {}", async function (this: State, request: string, body: string) {
    this.response = await send(server.base, request, JSON.parse(body));
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
