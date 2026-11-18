//! Deterministic ids: UUIDv5 (RFC 9562, name-based, SHA-1),
//! encoded compactly as 22 base62 characters (the minimum for 128 bits), in groups: `xxxxxxx-xxxxxxx-xxxxxxxx`.
//!
//! NOTE: the key is the JSON array `[country, name]` (normalised), so the ids match those of earlier versions.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;

use super::text::trim;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ALPHABET: &[u8; 62] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const LENGTH: usize = 22;

const GROUPS: [usize; 3] = [7, 7, 8];

/// URN of this project; its UUIDv5 in the URL namespace is the namespace of the ids
const URN: &str = "urn:example-capitals:capital";

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Id of a city, derived from country and name
/// (case-insensitive like the unique indexes, so equal keys give equal ids).
pub fn capital_id(country: &str, name: &str) -> String {
    let key = serde_json::to_string(&[normalise(country), normalise(name)]).expect("strings serialise");
    group(&to_base62(uuid5(&key, &namespace()).as_u128()))
}

pub fn is_id(value: &str) -> bool {
    let parts: Vec<&str> = value.split('-').collect();

    parts.len() == GROUPS.len()
        && parts
            .iter()
            .zip(GROUPS)
            .all(|(part, size)| part.len() == size && part.bytes().all(|byte| byte.is_ascii_alphanumeric()))
}

/// UUIDv5 of a name in a namespace.
pub fn uuid5(name: &str, namespace: &Uuid) -> Uuid {
    Uuid::new_v5(namespace, name.as_bytes())
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

fn namespace() -> Uuid {
    uuid5(URN, &Uuid::NAMESPACE_URL)
}

/// Fixed-length base62 (left-padded with `0`).
fn to_base62(mut value: u128) -> String {
    let base = ALPHABET.len() as u128;
    let mut text = [b'0'; LENGTH];

    for byte in text.iter_mut().rev() {
        *byte = ALPHABET[(value % base) as usize];
        value /= base;
    }

    String::from_utf8(text.to_vec()).expect("ascii")
}

fn group(text: &str) -> String {
    let mut start = 0;

    GROUPS
        .iter()
        .map(|size| {
            let part = &text[start..start + size];
            start += size;
            part
        })
        .collect::<Vec<_>>()
        .join("-")
}

/// NFC, trimmed, lower case (Unicode default case mapping, as for `en-GB`).
fn normalise(text: &str) -> String {
    let text: String = text.nfc().collect();
    trim(&text).to_lowercase()
}
