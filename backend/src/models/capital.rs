//! City (capital or not): DB shape, conversion to the API shape, and input parsing.
//!
//! The API shapes (`Capital`, `CapitalInput`) are generated from /models/api.yaml (see /backend/src/models/api.rs).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use serde::Deserialize;
use serde::Serialize;
use serde_json::Value;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::text::trim;
use crate::models::api;

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

impl TryFrom<CapitalDocument> for api::Capital {
    type Error = HttpError;

    /// Fails only for a document which does not fit the schema of the API (an internal error).
    fn try_from(CapitalDocument { id, data }: CapitalDocument) -> Result<Self> {
        Ok(Self {
            id: id.try_into().map_err(HttpError::internal)?,
            name: data.name.try_into().map_err(HttpError::internal)?,
            country: data.country.try_into().map_err(HttpError::internal)?,
            latitude: data.latitude,
            longitude: data.longitude,
            capital: data.capital,
            colour: data
                .colour
                .map(TryInto::try_into)
                .transpose()
                .map_err(HttpError::internal)?,
        })
    }
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Validates a request body: first against the schema (`CapitalInput`: types, lengths, pattern),
/// then what the schema does not express: names trimmed and non-empty, coordinates in range,
/// `capital` defaulting to true, the colour in lower case.
/// Uniqueness is enforced by the DB indexes.
pub fn parse_capital_input(body: &Value) -> Result<CapitalData> {
    if !body.is_object() {
        return Err(HttpError::bad_request("body must be an object"));
    }

    let input: api::CapitalInput =
        serde_json::from_value(body.clone()).map_err(|err| HttpError::bad_request(err.to_string()))?;

    let (name, country) = (trim(&input.name), trim(&input.country));

    if name.is_empty() || country.is_empty() {
        return Err(HttpError::bad_request("name and country must be non-empty strings"));
    }

    if !in_range(input.latitude, 90.0) || !in_range(input.longitude, 180.0) {
        return Err(HttpError::bad_request(
            "latitude must be in [-90, 90] and longitude in [-180, 180]",
        ));
    }

    Ok(CapitalData {
        name: name.to_string(),
        country: country.to_string(),
        latitude: input.latitude,
        longitude: input.longitude,
        capital: input.capital.unwrap_or(true),
        colour: input.colour.map(|colour| colour.to_lowercase()),
    })
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

fn in_range(value: f64, bound: f64) -> bool {
    value.is_finite() && value.abs() <= bound
}
