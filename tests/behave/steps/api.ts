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
    const [method, path] = request.split(" ");
    this.response = await fetch(`${this.base}${path}`, { method });
});

Then("the response status is {int}", function (this: State, status: number) {
    assert.equal(this.response.status, status);
});

Then("the response body is {}", async function (this: State, body: string) {
    assert.deepEqual(await this.response.json(), JSON.parse(body));
});
