//! Log (`tracing`, set up in /backend/src/main.rs, level by LOG_LEVEL) and the log of the requests:
//! one line each (method, path with query, status, duration, the message of an error),
//! at the level of its status (5xx `ERROR`, 4xx `WARN`, else `INFO`);
//! with LOG_BODIES (default) also the body of the request, shortened (bodies may contain personal data: switch off where so).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::time::Instant;

use axum::body::Body;
use axum::body::to_bytes;
use axum::extract::Request;
use axum::extract::State;
use axum::http::header::CONTENT_LENGTH;
use axum::middleware::Next;
use axum::response::Response;

use tracing::error;
use tracing::info;
use tracing::warn;

use super::errors::ErrorMessage;
use super::state::AppState;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/// at most this much of a body is read for the log (larger ones are not, by their declared size)
const LIMIT: usize = 1 << 20;

/// characters of a body shown in the log
const SHOWN: usize = 300;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Middleware, e.g. `GET /capital?country=France 200 1.8 ms` or `POST /capital 409 2.1 ms: this country already has a capital`.
pub async fn log_request(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let (request, body) = if state.settings.log.bodies {
        read_body(request).await
    } else {
        (request, None)
    };
    let start = Instant::now();

    let response = next.run(request).await;

    let millis = start.elapsed().as_secs_f64() * 1000.0;
    let status = response.status();
    let error = response
        .extensions()
        .get::<ErrorMessage>()
        .map(|ErrorMessage(message)| format!(": {message}"))
        .unwrap_or_default();
    let body = body.map(|text| format!(" | {text}")).unwrap_or_default();
    let line = format!("{method} {uri} {} {millis:.1} ms{error}{body}", status.as_u16());

    if status.is_server_error() {
        error!("{line}");
    } else if status.is_client_error() {
        warn!("{line}");
    } else {
        info!("{line}");
    }

    response
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Reads the body (to log it) and puts it back into the request;
/// only with a declared size up to LIMIT, so a body is never cut off for the handler.
async fn read_body(request: Request) -> (Request, Option<String>) {
    let size = request
        .headers()
        .get(CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok()?.parse::<usize>().ok());

    match size {
        None | Some(0) => return (request, None),
        Some(size) if size > LIMIT => return (request, Some(format!("(body of {size} bytes)"))),
        Some(_) => {}
    }

    let (parts, body) = request.into_parts();
    let bytes = match to_bytes(body, LIMIT).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return (
                Request::from_parts(parts, Body::empty()),
                Some("(body unreadable)".to_string()),
            );
        }
    };

    // on one line, shortened
    let text = String::from_utf8_lossy(&bytes)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let text = match text.char_indices().nth(SHOWN) {
        Some((end, _)) => format!("{}…", &text[..end]),
        None => text,
    };

    (
        Request::from_parts(parts, Body::from(bytes)),
        (!text.is_empty()).then_some(text),
    )
}
