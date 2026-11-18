//! Unit tests: /backend/src/data

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::collections::HashSet;

use backend::data::cities::cities;
use backend::data::cities::places;
use backend::data::examples::examples;
use backend::models::capital::CapitalData;
use backend::models::capital::parse_capital_input;

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

#[test]
fn are_valid_and_coloured() {
    for item in examples().into_iter().chain(cities()) {
        let colour = item.colour.clone().expect("coloured");
        assert!(colour.len() == 7 && colour == colour.to_lowercase(), "{colour}");
        assert_eq!(parse_capital_input(&serde_json::to_value(&item).unwrap()), Ok(item));
    }
}

#[test]
fn are_unique_per_country_and_name_with_at_most_one_capital_per_country() {
    for items in [examples(), cities()] {
        let keys: Vec<_> = items
            .iter()
            .map(|CapitalData { country, name, .. }| format!("{country}|{name}").to_lowercase())
            .collect();
        assert_eq!(keys.iter().collect::<HashSet<_>>().len(), keys.len());

        let capitals: Vec<_> = items
            .iter()
            .filter(|item| item.capital)
            .map(|item| &item.country)
            .collect();
        assert_eq!(capitals.iter().collect::<HashSet<_>>().len(), capitals.len());
    }
}

#[test]
fn cities_are_a_few_hundred_ordinary_cities() {
    let items = cities();
    assert_eq!(items.len(), 300);
    assert!(items.iter().all(|item| !item.capital));
}

#[test]
fn places_are_the_cities_without_region_capital_or_colour() {
    let items = places();
    assert_eq!(items.len(), 300);

    for (place, city) in items.iter().zip(cities()) {
        assert_eq!(
            (&place.name, &place.country, place.latitude, place.longitude),
            (&city.name, &city.country, city.latitude, city.longitude)
        );
    }
}
