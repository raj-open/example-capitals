/**
 * Endpoints: /data (clear and fill the DB, for tests and demos).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Count } from "../../@api/types.gen.ts";
import { request } from "./client.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export type Action = "clear" | "examples" | "capitals" | "cities";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export function run(action: Action): Promise<Count> {
    return action === "clear" ? request<Count>("DELETE", "/data") : request<Count>("POST", `/data/${action}`);
}
