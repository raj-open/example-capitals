//! A known city (not stored), e.g. to snap to on the map (`Place` in /models/api.yaml).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use serde::Deserialize;
use serde::Serialize;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Place {
    pub name: String,
    pub country: String,
    pub latitude: f64,
    pub longitude: f64,
}
