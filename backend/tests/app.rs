//! Unit tests: the app without a database (only requests that fail before the DB is reached).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::body::Body;
use axum::http::Request;
use axum::http::StatusCode;
use http_body_util::BodyExt;
use serde_json::Value;
use serde_json::json;
use tower::ServiceExt;

use backend::_core::settings::Settings;
use backend::AppState;
use backend::app;

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

#[tokio::test]
async fn health_reports_the_database_as_unreachable() {
    let (status, body) = send("GET", "/health", None).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body, json!({ "ok": false }));
}

#[tokio::test]
async fn places_lists_the_sample_without_a_database() {
    let (status, body) = send("GET", "/places", None).await;
    assert_eq!(status, StatusCode::OK);

    let items = body.as_array().expect("array");
    assert_eq!(items.len(), 300);

    let mut keys: Vec<_> = items[0].as_object().expect("object").keys().cloned().collect();
    keys.sort();
    assert_eq!(keys, ["country", "latitude", "longitude", "name"]);
}

#[tokio::test]
async fn capital_rejects_several_countries() {
    let (status, body) = send("GET", "/capital?country=Land1&country=Land2", None).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(body["error"].is_string());
}

#[tokio::test]
async fn capital_rejects_an_invalid_body() {
    let (status, _) = send("POST", "/capital", Some(json!({ "name": "" }))).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let body = json!({ "name": "Paris", "country": "France", "latitude": 91, "longitude": 0 });
    let (status, _) = send("PUT", "/capital/0123456-789abcd-ef012345", Some(body)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn capital_rejects_other_cities() {
    let body = json!({ "name": "Osaka", "country": "Japan", "latitude": 34.69, "longitude": 135.5, "capital": false });
    let (status, _) = send("POST", "/capital", Some(body)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn capital_treats_an_invalid_id_as_not_found() {
    let body = json!({ "name": "Paris", "country": "France", "latitude": 48.86, "longitude": 2.35 });

    for method in ["PUT", "DELETE"] {
        let (status, _) = send(method, "/capital/not-an-id", Some(body.clone())).await;
        assert_eq!(status, StatusCode::NOT_FOUND, "{method}");
    }
}

#[tokio::test]
async fn unknown_paths_are_not_found() {
    let (status, body) = send("GET", "/nowhere", None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(body["error"].is_string());
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Sends a request to the app without a database; returns status and JSON body (null if empty).
async fn send(method: &str, path: &str, body: Option<Value>) -> (StatusCode, Value) {
    let state = AppState::new(Settings::from_env(), None);
    let request = Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json")
        .body(body.map_or_else(Body::empty, |body| Body::from(body.to_string())))
        .expect("valid request");

    let response = app(state).oneshot(request).await.expect("infallible");
    let status = response.status();
    let bytes = response.into_body().collect().await.expect("body").to_bytes();
    let body = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).expect("JSON")
    };
    (status, body)
}
