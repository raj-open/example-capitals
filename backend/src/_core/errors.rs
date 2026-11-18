//! Errors with an HTTP status, rendered as `{"error": message}`.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::fmt;

use axum::Json;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::Response;

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

pub type Result<T> = std::result::Result<T, HttpError>;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

/// The message of an error response, attached to it for the log of the requests (see /backend/src/_core/log.rs).
#[derive(Debug, Clone)]
pub struct ErrorMessage(pub String);

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
        tracing::error!("{err}");
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
        let body = crate::models::api::Error {
            error: Some(self.message.clone()),
        };
        let mut response = (self.status, Json(body)).into_response();
        response.extensions_mut().insert(ErrorMessage(self.message));
        response
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
