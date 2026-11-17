//! HTTP layer: the app with all endpoints.

// ----------------------------------------------------------------
// MODULES
// ----------------------------------------------------------------

pub mod capital;
pub mod data;
pub mod health;
pub mod places;

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::Router;
use tower_http::cors::CorsLayer;

use crate::_core::errors::HttpError;
use crate::_core::state::AppState;
use crate::services::capital::Scope;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// The app (without listening), so tests can call it directly.
pub fn app(state: AppState) -> Router {
    Router::new()
        .nest("/health", health::router())
        .nest("/capital", capital::router(Scope { capitals_only: true }))
        .nest("/city", capital::router(Scope { capitals_only: false }))
        .nest("/data", data::router(state.clone()))
        .nest("/places", places::router())
        .fallback(|| async { HttpError::not_found("not found") })
        .layer(CorsLayer::permissive())
        .with_state(state)
}
