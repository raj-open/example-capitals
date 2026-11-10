/**
 * Deterministic ids: UUIDv5 (RFC 9562, name-based, SHA-1),
 * encoded compactly as 22 base62 characters (the minimum for 128 bits), in groups: `xxxxxxx-xxxxxxx-xxxxxxxx`.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { createHash } from "node:crypto";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const LENGTH = 22;

const GROUPS = [7, 7, 8];

const PATTERN = new RegExp(`^${GROUPS.map((size) => `[0-9A-Za-z]{${size}}`).join("-")}$`);

/** namespace for URLs, as per RFC 9562 */
export const NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

/** namespace of this project = UUIDv5 of its URN in the URL namespace */
const NAMESPACE = toHex(uuid5("urn:example-capitals:capital", NAMESPACE_URL));

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/**
 * Id of a capital, derived from country and name
 * (case-insensitive like the unique indexes, so equal keys give equal ids).
 */
export function capitalId(country: string, name: string): string {
    const key = JSON.stringify([normalise(country), normalise(name)]);
    return group(toBase62(uuid5(key, NAMESPACE)));
}

export function isId(value: string): boolean {
    return PATTERN.test(value);
}

/**
 * UUIDv5 of a name in a namespace (16 bytes).
 */
export function uuid5(name: string, namespace: string): Buffer {
    const bytes = createHash("sha1")
        .update(Buffer.from(namespace.replaceAll("-", ""), "hex"))
        .update(name, "utf8")
        .digest()
        .subarray(0, 16);

    bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 9562
    return bytes;
}

/**
 * Canonical form `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.
 */
export function toHex(bytes: Buffer): string {
    const hex = bytes.toString("hex");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * Fixed-length base62 (left-padded with `0`).
 */
function toBase62(bytes: Buffer): string {
    const base = BigInt(ALPHABET.length);
    let value = BigInt(`0x${bytes.toString("hex")}`);
    let text = "";

    for (let i = 0; i < LENGTH; i++) {
        text = ALPHABET[Number(value % base)] + text;
        value /= base;
    }

    return text;
}

function group(text: string): string {
    let start = 0;

    return GROUPS.map((size) => {
        const part = text.slice(start, start + size);
        start += size;
        return part;
    }).join("-");
}

function normalise(text: string): string {
    return text.normalize("NFC").trim().toLocaleLowerCase("en");
}
