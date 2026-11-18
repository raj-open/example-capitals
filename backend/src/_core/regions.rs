//! Colours of the markers by region (as in REST Countries: `region`), used by the import and the seed.

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

pub const REGION_COLOURS: [(&str, &str); 6] = [
    ("Europe", "#1e88e5"),
    ("Americas", "#e53935"),
    ("Asia", "#43a047"),
    ("Africa", "#fb8c00"),
    ("Oceania", "#8e24aa"),
    ("Antarctic", "#00acc1"),
];

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Colour of a region; none for an unknown region (the UI then uses its default).
pub fn region_colour(region: Option<&str>) -> Option<String> {
    let region = region?;

    REGION_COLOURS
        .iter()
        .find(|(name, _)| *name == region)
        .map(|(_, colour)| colour.to_string())
}
