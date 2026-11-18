//! Endpoints: /places
//!
//! - GET /places   the sample of ordinary cities (/backend/assets/cities.json), for snap-to in the UI
//!
//! Read only and independent of the DB, so not affected by DATA_ACTIONS.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::Json;
use axum::Router;
use axum::routing::get;

use crate::_core::state::AppState;
use crate::data::cities::places;
use crate::models::api::Place;

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list))
}

async fn list() -> Json<Vec<Place>> {
    Json(places())
}
