//! Errors with an HTTP status, rendered as `{"error": message}`.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::fmt;

use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::Response;
use serde_json::json;

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

pub type Result<T> = std::result::Result<T, HttpError>;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HttpError {
    pub status: StatusCode,
    pub message: String,
}

impl HttpError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(StatusCode::FORBIDDEN, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(StatusCode::CONFLICT, message)
    }

    pub fn unavailable(message: impl Into<String>) -> Self {
        Self::new(StatusCode::SERVICE_UNAVAILABLE, message)
    }

    /// An unexpected error: logged, but not exposed to the client.
    pub fn internal(err: impl fmt::Display) -> Self {
        eprintln!("{err}");
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
    }
}

impl fmt::Display for HttpError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}", self.status.as_u16(), self.message)
    }
}

impl std::error::Error for HttpError {}

impl IntoResponse for HttpError {
    fn into_response(self) -> Response {
        (self.status, Json(json!({ "error": self.message }))).into_response()
    }
}

impl From<mongodb::error::Error> for HttpError {
    fn from(err: mongodb::error::Error) -> Self {
        Self::internal(err)
    }
}

impl From<reqwest::Error> for HttpError {
    fn from(err: reqwest::Error) -> Self {
        Self::internal(err)
    }
}
