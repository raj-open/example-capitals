//! Log of the requests: one line each (method, path with query, status, duration, the message of an error), on stdout.
//! Bodies are not logged (they may contain personal data).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::time::Instant;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

use super::errors::ErrorMessage;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Middleware, e.g. `GET /capital?country=France 200 1.8 ms` or `POST /capital 409 2.1 ms: this country already has a capital`.
pub async fn log_request(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let start = Instant::now();

    let response = next.run(request).await;

    let millis = start.elapsed().as_secs_f64() * 1000.0;
    let status = response.status().as_u16();
    let error = response
        .extensions()
        .get::<ErrorMessage>()
        .map(|ErrorMessage(message)| format!(": {message}"))
        .unwrap_or_default();
    println!("{method} {uri} {status} {millis:.1} ms{error}");
    response
}
