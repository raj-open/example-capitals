/**
 * Minimal JSON client for the API.
 *
 * Requests go to /api, which the vite dev server proxies to the backend (see /frontend/vite.config.ts).
 */

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const BASE = "/api";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`${method} ${path}: ${response.status} ${error}`);
    }

    return response.status === 204 ? (undefined as T) : response.json();
}
