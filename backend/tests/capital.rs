//! Unit tests: /backend/src/models/capital.rs

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use axum::http::StatusCode;
use serde_json::Value;
use serde_json::json;

use backend::models::capital::CapitalData;
use backend::models::capital::parse_capital_input;

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

#[test]
fn accepts_a_valid_body() {
    let body = json!({ "name": " Paris ", "country": "France", "latitude": 48.86, "longitude": 2.35 });
    assert_eq!(
        parse_capital_input(&body),
        Ok(city("Paris", "France", 48.86, 2.35, true, None))
    );
}

#[test]
fn accepts_a_colour_in_lower_case() {
    let body =
        json!({ "name": "Paris", "country": "France", "latitude": 48.86, "longitude": 2.35, "colour": "#1E88E5" });
    let expected = city("Paris", "France", 48.86, 2.35, true, Some("#1e88e5"));
    assert_eq!(parse_capital_input(&body), Ok(expected));
}

#[test]
fn keeps_an_explicit_capital_flag() {
    let body = json!({ "name": "Osaka", "country": "Japan", "latitude": 34.69, "longitude": 135.5, "capital": false });
    assert_eq!(
        parse_capital_input(&body),
        Ok(city("Osaka", "Japan", 34.69, 135.5, false, None))
    );
}

#[test]
fn rejects_invalid_bodies() {
    let bodies: [Value; 9] = [
        Value::Null,
        json!({}),
        json!({ "name": "", "country": "France", "latitude": 0, "longitude": 0 }),
        json!({ "name": "Paris", "country": "France", "latitude": 91, "longitude": 0 }),
        json!({ "name": "Paris", "country": "France", "latitude": 0, "longitude": "2" }),
        json!({ "name": "Paris", "country": "France", "latitude": 0, "longitude": 2, "capital": "yes" }),
        json!({ "name": "Paris", "country": "France", "latitude": 0, "longitude": 2, "colour": "blue" }),
        json!({ "name": "  ", "country": "France", "latitude": 0, "longitude": 2 }),
        json!({ "country": "France", "latitude": 0, "longitude": 2 }),
    ];

    for body in bodies {
        let err = parse_capital_input(&body).expect_err(&body.to_string());
        assert_eq!(err.status, StatusCode::BAD_REQUEST, "{body}");
    }
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

fn city(name: &str, country: &str, latitude: f64, longitude: f64, capital: bool, colour: Option<&str>) -> CapitalData {
    CapitalData {
        name: name.to_string(),
        country: country.to_string(),
        latitude,
        longitude,
        capital,
        colour: colour.map(str::to_string),
    }
}
