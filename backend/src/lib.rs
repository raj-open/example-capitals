//! REST API for capitals and other cities (axum + MongoDB).
//!
//! Layers: `routes` (HTTP) → `services` (logic) → `db` (MongoDB);
//! errors are returned as `HttpError` (/backend/src/_core/errors.rs) and rendered as `{"error": …}`.
//! The shape of the API is defined in /models/api.yaml (mirrored by /backend/src/models).

// ----------------------------------------------------------------
// MODULES
// ----------------------------------------------------------------

pub mod _core;
pub mod data;
pub mod db;
pub mod models;
pub mod routes;
pub mod services;

// ----------------------------------------------------------------
// EXPORTS
// ----------------------------------------------------------------

pub use _core::state::AppState;
pub use routes::app;
