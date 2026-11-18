//! Types of the API, generated from /models/api.yaml (`components.schemas`) into /backend/@api (not committed)
//! by `just build-models-backend` (/backend/src/bin/codegen):
//! one struct per schema; constrained strings (length, pattern) as newtypes, checked on deserialisation.

#[allow(clippy::all, clippy::pedantic, dead_code, unused_imports)]
mod generated {
    include!(concat!(env!("CARGO_MANIFEST_DIR"), "/@api/api.rs"));
}

pub use generated::*;
