//! Settings, read once from the environment.
//!
//! For the full list of variables see /templates/template.env.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::env;
use std::fmt::Debug;
use std::str::FromStr;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct Settings {
    pub port: u16,
    pub log: Log,
    pub database: Database,
    pub data: Data,
    pub restcountries: RestCountries,
}

/// Log of the requests (see /backend/src/_core/log.rs).
#[derive(Debug, Clone)]
pub struct Log {
    /// also the bodies (shortened); set LOG_BODIES=false where they may contain personal data
    pub bodies: bool,
}

#[derive(Debug, Clone)]
pub struct Database {
    /// empty = no database (e.g. for tests of the API alone)
    pub host: String,
    pub port: u16,
    pub name: String,
    pub user: String,
    pub password: String,
}

/// Buttons in the UI to clear and fill the DB (for tests); set DATA_ACTIONS=false where data must be kept.
#[derive(Debug, Clone)]
pub struct Data {
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub struct RestCountries {
    pub url: String,
    pub key: String,
    /// page size: at most 100 on the free plan, 500 on paid plans
    pub limit: usize,
    pub selection: Selection,
}

/// Selection of countries (applied locally, as the API can neither filter nor sort by population).
#[derive(Debug, Clone)]
pub struct Selection {
    pub population_min: f64,
    /// none = all
    pub top: Option<usize>,
}

impl Settings {
    pub fn from_env() -> Self {
        Self {
            port: number("PORT", 3001),
            log: Log {
                bodies: text("LOG_BODIES", "true") != "false",
            },
            database: Database {
                host: text("DATABASE_HOST", "localhost"),
                port: number("DATABASE_PORT", 27017),
                name: text("DATABASE_NAME", "capitals"),
                user: text("DATABASE_USER", ""),
                password: text("DATABASE_PASSWORD", ""),
            },
            data: Data {
                enabled: text("DATA_ACTIONS", "true") != "false",
            },
            restcountries: RestCountries {
                url: text("RESTCOUNTRIES_URL", "https://api.restcountries.com/countries/v5"),
                key: text("RESTCOUNTRIES_API_KEY", ""),
                limit: number("RESTCOUNTRIES_LIMIT", 100),
                selection: Selection {
                    population_min: number("RESTCOUNTRIES_POPULATION_MIN", 0.0),
                    top: optional("RESTCOUNTRIES_TOP"),
                },
            },
        }
    }
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// A text variable; unset falls back to the default (set but empty stays empty).
fn text(name: &str, fallback: &str) -> String {
    env::var(name).unwrap_or_else(|_| fallback.to_string())
}

/// A numeric variable; unset or empty values fall back to the default.
fn number<T: FromStr>(name: &str, fallback: T) -> T
where
    T::Err: Debug,
{
    optional(name).unwrap_or(fallback)
}

/// A numeric variable; none if unset or empty.
fn optional<T: FromStr>(name: &str) -> Option<T>
where
    T::Err: Debug,
{
    let value = env::var(name).ok()?;
    let value = value.trim();

    if value.is_empty() {
        return None;
    }

    Some(
        value
            .parse()
            .unwrap_or_else(|err| panic!("{name}={value:?} is not a valid number: {err:?}")),
    )
}
