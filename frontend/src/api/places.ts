/**
 * Endpoints: /places (known cities, for snap-to).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Place } from "../../@api/types.gen.ts";
import { request } from "./client.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export const list = () => request<Place[]>("GET", "/places");
