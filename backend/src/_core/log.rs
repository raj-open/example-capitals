//! Log of the requests: one line each (method, path with query, status, duration), on stdout.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::time::Instant;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Middleware, e.g. `GET /capital?country=France 200 1.8 ms`.
pub async fn log_request(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let start = Instant::now();

    let response = next.run(request).await;

    let millis = start.elapsed().as_secs_f64() * 1000.0;
    println!("{method} {uri} {} {millis:.1} ms", response.status().as_u16());
    response
}
