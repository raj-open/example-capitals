//! Unit tests: /backend/src/services/countries.rs

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use backend::_core::settings::Selection;
use backend::services::countries::CapitalInfo;
use backend::services::countries::Coordinates;
use backend::services::countries::Country;
use backend::services::countries::Names;
use backend::services::countries::to_capitals;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const ALL: Selection = Selection {
    population_min: 0.0,
    top: None,
};

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

#[test]
fn maps_common_name_and_first_capital_most_populous_first() {
    let data = vec![
        country("Malta", "Valletta", 500_000.0, 35.9, 14.5),
        country("France", "Paris", 68_000_000.0, 48.9, 2.4),
    ];

    let items = to_capitals(data, &ALL);
    let keys: Vec<_> = items
        .iter()
        .map(|item| {
            (
                item.country.as_str(),
                item.name.as_str(),
                item.latitude,
                item.longitude,
                item.capital,
            )
        })
        .collect();
    assert_eq!(
        keys,
        [
            ("France", "Paris", 48.9, 2.4, true),
            ("Malta", "Valletta", 35.9, 14.5, true)
        ]
    );
    assert!(items.iter().all(|item| item.colour.is_none()));
}

#[test]
fn colours_by_region() {
    let data = vec![
        Country {
            region: Some("Europe".into()),
            ..country("France", "Paris", 2.0, 1.0, 2.0)
        },
        Country {
            region: Some("Atlantis".into()),
            ..country("Nowhere", "Void", 1.0, 1.0, 2.0)
        },
    ];

    let colours: Vec<_> = to_capitals(data, &ALL).into_iter().map(|item| item.colour).collect();
    assert_eq!(colours, [Some("#1e88e5".to_string()), None]);
}

#[test]
fn skips_countries_without_a_capital_or_coordinates() {
    let data = vec![
        Country {
            names: Some(Names {
                common: Some("Antarctica".into()),
            }),
            capitals: Some(vec![]),
            population: Some(0.0),
            ..Default::default()
        },
        Country {
            names: Some(Names {
                common: Some("Nowhere".into()),
            }),
            capitals: Some(vec![CapitalInfo {
                name: Some("Void".into()),
                coordinates: None,
            }]),
            population: Some(1.0),
            ..Default::default()
        },
        country("France", "Paris", 1.0, 1.0, 2.0),
    ];

    assert_eq!(countries(to_capitals(data, &ALL)), ["France"]);
}

#[test]
fn keeps_capitals_sharing_a_name_in_different_countries() {
    let data = vec![
        country("Norfolk Island", "Kingston", 2_000.0, 1.0, 2.0),
        country("Jamaica", "Kingston", 2_800_000.0, 1.0, 2.0),
    ];

    assert_eq!(countries(to_capitals(data, &ALL)), ["Jamaica", "Norfolk Island"]);
}

#[test]
fn selects_by_minimum_population_and_top_count() {
    let data = vec![
        country("A", "a", 10.0, 1.0, 2.0),
        country("B", "b", 30.0, 1.0, 2.0),
        country("C", "c", 20.0, 1.0, 2.0),
        country("D", "d", 5.0, 1.0, 2.0),
    ];
    let selection = Selection {
        population_min: 10.0,
        top: Some(2),
    };

    assert_eq!(countries(to_capitals(data, &selection)), ["B", "C"]);
}

#[test]
fn parses_a_response() {
    let data: Vec<Country> = serde_json::from_str(
        r#"[{"names": {"common": "France", "official": "French Republic"},
             "capitals": [{"name": "Paris", "coordinates": {"lat": 48.87, "lng": 2.33}}],
             "population": 68000000, "region": "Europe", "other": null}]"#,
    )
    .expect("valid response");

    assert_eq!(countries(to_capitals(data, &ALL)), ["France"]);
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

fn country(common: &str, capital: &str, population: f64, lat: f64, lng: f64) -> Country {
    Country {
        names: Some(Names {
            common: Some(common.into()),
        }),
        capitals: Some(vec![CapitalInfo {
            name: Some(capital.into()),
            coordinates: Some(Coordinates {
                lat: Some(lat),
                lng: Some(lng),
            }),
        }]),
        population: Some(population),
        region: None,
    }
}

fn countries(items: Vec<backend::models::capital::CapitalData>) -> Vec<String> {
    items.into_iter().map(|item| item.country).collect()
}
