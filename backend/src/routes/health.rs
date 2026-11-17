//! Endpoints: /health
//!
//! 200 `{"ok": true}` if the API runs and the database answers (ping), else 503 `{"ok": false}`.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::Json;
use axum::Router;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::get;
use serde_json::Value;
use serde_json::json;

use crate::db::client::ping;

use crate::_core::state::AppState;

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(health))
}

async fn health(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    let ok = ping(state.client.as_ref()).await;
    let status = if ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (status, Json(json!({ "ok": ok })))
}
