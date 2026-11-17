/**
 * The backend binary (Rust, built by `just` before the tests: /backend/target/debug/backend),
 * started on a free port for tests over HTTP.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const SUFFIX = process.platform === "win32" ? ".exe" : "";

export const BINARY = fileURLToPath(new URL(`../backend/target/debug/backend${SUFFIX}`, import.meta.url));

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export interface Server {
    /** e.g. `http://localhost:54321` */
    base: string;
    stop: () => void;
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Starts the backend (with the environment of this process, plus `env`) and waits until it listens.
 * `DATABASE_HOST: ""` runs it without a database.
 */
export async function start(env: Record<string, string> = {}): Promise<Server> {
    const child = spawn(BINARY, [], {
        env: { ...process.env, PORT: "0", ...env },
        stdio: ["ignore", "pipe", "inherit"],
    });

    const base = await new Promise<string>((resolve, reject) => {
        let output = "";
        child.stdout.setEncoding("utf8");

        // the backend prints `API on http://localhost:{port}` once it listens; later output is consumed and dropped
        child.stdout.on("data", (chunk: string) => {
            output += chunk;
            const match = output.match(/API on (http:\/\/\S+)/);

            if (match) {
                resolve(match[1]);
            }
        });

        child.on("error", reject);
        child.on("exit", (code) => reject(new Error(`backend exited with code ${code} (built? ${BINARY})`)));
    });

    return { base, stop: () => child.kill() };
}
