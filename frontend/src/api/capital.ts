/**
 * Endpoints: /capital (capitals only) and /city (all cities), same shape.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import type { Capital, CapitalInput } from "../../@api/types.gen.ts";
import { request } from "./client.ts";

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export type Resource = "capital" | "city";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export const list = (resource: Resource, query: { country?: string }) =>
    request<Capital[]>("GET", `/${resource}?${new URLSearchParams(query)}`);

export const get = (resource: Resource, key: string) =>
    request<Capital>("GET", `/${resource}/${encodeURIComponent(key)}`);

export const create = (resource: Resource, input: CapitalInput) => request<Capital>("POST", `/${resource}`, input);

export const update = (resource: Resource, id: string, input: CapitalInput) =>
    request<Capital>("PUT", `/${resource}/${id}`, input);

export const remove = (resource: Resource, id: string) => request<void>("DELETE", `/${resource}/${id}`);
