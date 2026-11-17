//! City (capital or not): API shape, DB shape, and input parsing.
//!
//! The API shape (`Capital`, `CapitalInput`) is defined in /models/api.yaml.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::text::trim;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

/// A validated input, with defaults applied (`capital` = true); `colour` stays optional.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CapitalData {
    pub name: String,
    pub country: String,
    pub latitude: f64,
    pub longitude: f64,
    pub capital: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub colour: Option<String>,
}

/// `_id` is derived from country and name on creation (see /backend/src/_core/ids.rs)
/// and never changes afterwards, not even when country or name are edited.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CapitalDocument {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(flatten)]
    pub data: CapitalData,
}

/// A city as returned by the API.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Capital {
    pub id: String,
    #[serde(flatten)]
    pub data: CapitalData,
}

impl From<CapitalDocument> for Capital {
    fn from(CapitalDocument { id, data }: CapitalDocument) -> Self {
        Self { id, data }
    }
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Validates a request body; `capital` defaults to true (so a body without it creates a capital).
/// Only checks types and ranges, not uniqueness (enforced by the DB indexes).
pub fn parse_capital_input(body: &Value) -> Result<CapitalData> {
    let Some(body) = body.as_object() else {
        return Err(HttpError::bad_request("body must be an object"));
    };

    let (Some(name), Some(country)) = (text(body.get("name")), text(body.get("country"))) else {
        return Err(HttpError::bad_request("name and country must be non-empty strings"));
    };

    let (Some(latitude), Some(longitude)) = (
        in_range(body.get("latitude"), 90.0),
        in_range(body.get("longitude"), 180.0),
    ) else {
        return Err(HttpError::bad_request(
            "latitude must be in [-90, 90] and longitude in [-180, 180]",
        ));
    };

    let capital = match body.get("capital") {
        None => true,
        Some(Value::Bool(value)) => *value,
        Some(_) => return Err(HttpError::bad_request("capital must be a boolean")),
    };

    let colour = match body.get("colour") {
        None => None,
        Some(Value::String(value)) if is_colour(value) => Some(value.to_lowercase()),
        Some(_) => return Err(HttpError::bad_request("colour must be a hex colour #rrggbb")),
    };

    Ok(CapitalData {
        name,
        country,
        latitude,
        longitude,
        capital,
        colour,
    })
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// A non-empty string, trimmed.
fn text(value: Option<&Value>) -> Option<String> {
    let value = trim(value?.as_str()?);
    (!value.is_empty()).then(|| value.to_string())
}

fn in_range(value: Option<&Value>, bound: f64) -> Option<f64> {
    let value = value?.as_f64()?;
    (value.is_finite() && value.abs() <= bound).then_some(value)
}

/// `#rrggbb`
fn is_colour(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value[1..].bytes().all(|byte| byte.is_ascii_hexdigit())
}
