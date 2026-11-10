/**
 * Endpoints: /capital
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Capital, CapitalInput } from "../../@api/types.gen.ts";
import { request } from "./client.ts";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export const list = () => request<Capital[]>("GET", "/capital");

export const get = (name: string) => request<Capital>("GET", `/capital/${encodeURIComponent(name)}`);

export const create = (input: CapitalInput) => request<Capital>("POST", "/capital", input);

export const update = (id: string, input: CapitalInput) => request<Capital>("PUT", `/capital/${id}`, input);

export const remove = (id: string) => request<void>("DELETE", `/capital/${id}`);
