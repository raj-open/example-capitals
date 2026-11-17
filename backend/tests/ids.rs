//! Unit tests: /backend/src/_core/ids.rs

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use uuid::Uuid;

use backend::_core::ids::capital_id;
use backend::_core::ids::is_id;
use backend::_core::ids::uuid5;

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

#[test]
fn uuid5_matches_the_reference_implementation() {
    // python: uuid.uuid5(uuid.NAMESPACE_DNS, "www.example.com")
    let id = uuid5("www.example.com", &Uuid::NAMESPACE_DNS);
    assert_eq!(id.hyphenated().to_string(), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
}

#[test]
fn capital_id_is_short_alphanumeric_in_groups_and_deterministic() {
    let id = capital_id("France", "Paris");
    assert!(is_id(&id));
    assert!(!is_id("123"));
    assert!(!is_id("5jx0wZI-VJsrzSo-EKUrjVk!"));
    assert_eq!(capital_id("France", "Paris"), id);
}

#[test]
fn capital_id_ignores_case_and_surrounding_spaces() {
    assert_eq!(capital_id(" FRANCE ", "paris"), capital_id("France", "Paris"));
}

#[test]
fn capital_id_separates_country_and_name_unambiguously() {
    assert_ne!(capital_id("a b", "c"), capital_id("a", "b c"));
}

/// ids of stored cities must not change with the implementation (values of the earlier TypeScript backend)
#[test]
fn capital_id_matches_earlier_versions() {
    let cases = [
        (("France", "Paris"), "5jx0wZI-VJsrzSo-EKUrjVkv"),
        (("Côte d’Ivoire", "Yamoussoukro"), "0gi7CUX-zshdeFJ-ybwY3ag5"),
        (("a\"b\\c", "x\ty"), "4QqSEDW-B06Tyvr-vKGBKpH6"),
        (("Iceland", "Reykjavík"), "4ecFtHJ-umqYbQo-mbD7GwD9"),
    ];

    for ((country, name), id) in cases {
        assert_eq!(capital_id(country, name), id, "{country}, {name}");
    }
}
