//! A large sample of ordinary cities (no capitals):
//! coloured by region for the DB (POST /data/cities), plain for snap-to in the UI (GET /places).
//!
//! Source: Natural Earth (public domain), https://www.naturalearthdata.com
//! - /backend/assets/cities.json was generated once from `ne_50m_populated_places_simple`:
//!   the 300 most populous places which are not capitals (at most 8 per country), sorted by country and city
//! - country names are those of REST Countries (e.g. "United States", not "United States of America")
//! - regions (UN) from `ne_110m_admin_0_countries`, as REST Countries uses them

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use serde::Deserialize;

use crate::_core::regions::region_colour;
use crate::models::api::Place;
use crate::models::capital::CapitalData;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/// embedded at compile time, so the binary runs from any directory
const DATA: &str = include_str!("../../assets/cities.json");

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

#[derive(Deserialize)]
struct City {
    country: String,
    name: String,
    latitude: f64,
    longitude: f64,
    region: String,
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// The sample as cities for the DB: not capitals, coloured by region.
pub fn cities() -> Vec<CapitalData> {
    read()
        .into_iter()
        .map(|city| CapitalData {
            colour: region_colour(Some(&city.region)),
            name: city.name,
            country: city.country,
            latitude: city.latitude,
            longitude: city.longitude,
            capital: false,
        })
        .collect()
}

/// The sample as places (without the region).
pub fn places() -> Vec<Place> {
    read()
        .into_iter()
        .map(|city| Place {
            name: city.name,
            country: city.country,
            latitude: city.latitude,
            longitude: city.longitude,
        })
        .collect()
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Parses the sample (on demand, so it costs no memory unless used).
fn read() -> Vec<City> {
    serde_json::from_str(DATA).expect("valid /backend/assets/cities.json")
}
