//! Endpoints: /capital (capitals only) and /city (all cities), same shape.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::Extension;
use axum::Json;
use axum::Router;
use axum::body::Bytes;
use axum::extract::Path;
use axum::extract::Query;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::get;
use serde_json::Value;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::state::AppState;
use crate::models::api::Capital;
use crate::models::capital::parse_capital_input;
use crate::services::capital as service;
use crate::services::capital::Scope;

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------

pub fn router(scope: Scope) -> Router<AppState> {
    Router::new()
        .route("/", get(list).post(create))
        .route("/{key}", get(one).put(update).delete(remove))
        .layer(Extension(scope))
}

async fn list(
    State(state): State<AppState>,
    Extension(scope): Extension<Scope>,
    Query(query): Query<Vec<(String, String)>>,
) -> Result<Json<Vec<Capital>>> {
    let countries: Vec<&str> = query
        .iter()
        .filter(|(key, _)| key == "country")
        .map(|(_, value)| value.as_str())
        .collect();

    if countries.len() > 1 {
        return Err(HttpError::bad_request(format!(
            "expected single query parameter of type string for country, got {} instead",
            countries.len()
        )));
    }

    let country = countries.first().copied().filter(|country| !country.is_empty());
    Ok(Json(service::list(&state, scope, country).await?))
}

async fn one(
    State(state): State<AppState>,
    Extension(scope): Extension<Scope>,
    Path(key): Path<String>,
) -> Result<Json<Capital>> {
    Ok(Json(service::get(&state, scope, &key).await?))
}

async fn create(
    State(state): State<AppState>,
    Extension(scope): Extension<Scope>,
    body: Bytes,
) -> Result<(StatusCode, Json<Capital>)> {
    let input = parse_capital_input(&parse_body(&body)?)?;
    Ok((StatusCode::CREATED, Json(service::create(&state, scope, input).await?)))
}

async fn update(
    State(state): State<AppState>,
    Extension(scope): Extension<Scope>,
    Path(id): Path<String>,
    body: Bytes,
) -> Result<Json<Capital>> {
    let input = parse_capital_input(&parse_body(&body)?)?;
    Ok(Json(service::update(&state, scope, &id, input).await?))
}

async fn remove(
    State(state): State<AppState>,
    Extension(scope): Extension<Scope>,
    Path(id): Path<String>,
) -> Result<StatusCode> {
    service::remove(&state, scope, &id).await?;
    Ok(StatusCode::NO_CONTENT)
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Parses a JSON body; an empty body counts as none (and fails validation as not an object).
fn parse_body(body: &Bytes) -> Result<Value> {
    if body.is_empty() {
        return Ok(Value::Null);
    }

    serde_json::from_slice(body).map_err(|err| HttpError::bad_request(format!("body must be valid JSON: {err}")))
}
