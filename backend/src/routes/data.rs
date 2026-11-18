//! Endpoints: /data, to clear and fill the DB (for tests and demos); disabled with DATA_ACTIONS=false.
//!
//! - DELETE /data            removes all cities
//! - POST   /data/examples   adds the example cities (/backend/src/data/examples.rs)
//! - POST   /data/capitals   imports all capitals from REST Countries (costs requests of the monthly quota)
//! - POST   /data/cities     adds a large sample of ordinary cities (/backend/src/data/cities.rs)
//!
//! Each responds with `{ count }`: the number of cities removed or added.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::Json;
use axum::Router;
use axum::extract::Request;
use axum::extract::State;
use axum::middleware::Next;
use axum::middleware::from_fn_with_state;
use axum::response::Response;
use axum::routing::delete;
use axum::routing::post;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::state::AppState;
use crate::data::cities::cities;
use crate::data::examples::examples;
use crate::models::api::Count;
use crate::services::capital as service;
use crate::services::countries::import_capitals;

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

/// The router, guarded as a whole (also unknown paths), so nothing passes with DATA_ACTIONS=false.
pub fn router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", delete(clear))
        .route("/examples", post(add_examples))
        .route("/capitals", post(add_capitals))
        .route("/cities", post(add_cities))
        .layer(from_fn_with_state(state, guard))
}

async fn guard(State(state): State<AppState>, request: Request, next: Next) -> Result<Response> {
    if !state.settings.data.enabled {
        return Err(HttpError::forbidden("data actions are disabled (DATA_ACTIONS=false)"));
    }

    Ok(next.run(request).await)
}

async fn clear(State(state): State<AppState>) -> Result<Json<Count>> {
    count(service::clear(&state).await?)
}

async fn add_examples(State(state): State<AppState>) -> Result<Json<Count>> {
    count(service::insert_many(&state, examples()).await?)
}

async fn add_capitals(State(state): State<AppState>) -> Result<Json<Count>> {
    count(import_capitals(&state).await?)
}

async fn add_cities(State(state): State<AppState>) -> Result<Json<Count>> {
    count(service::insert_many(&state, cities()).await?)
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

fn count(value: u64) -> Result<Json<Count>> {
    let count = i64::try_from(value).map_err(HttpError::internal)?;
    Ok(Json(Count { count }))
}
