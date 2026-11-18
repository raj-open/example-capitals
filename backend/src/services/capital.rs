//! Business logic for cities, in a scope:
//! all cities (/city) or capitals only (/capital).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use futures_util::TryStreamExt;
use mongodb::bson::Document;
use mongodb::bson::doc;
use mongodb::error::Error;
use mongodb::error::ErrorKind;
use mongodb::error::WriteFailure;
use mongodb::options::ReturnDocument;

use crate::db::collections::capitals;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::ids::capital_id;
use crate::_core::ids::is_id;
use crate::_core::state::AppState;
use crate::models::api::Capital;
use crate::models::capital::CapitalData;
use crate::models::capital::CapitalDocument;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/// MongoDB: duplicate key
pub const DUPLICATE_KEY: i32 = 11000;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

#[derive(Debug, Clone, Copy)]
pub struct Scope {
    /// only capitals are visible, and created or updated cities must be capitals
    pub capitals_only: bool,
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

pub async fn list(state: &AppState, scope: Scope, country: Option<&str>) -> Result<Vec<Capital>> {
    let mut query = filter(scope);

    if let Some(country) = country {
        query.insert("country", country);
    }

    let cursor = capitals(state)?
        .find(query)
        .sort(doc! { "country": 1, "capital": -1, "name": 1 }) // capital first within a country
        .await?;

    let docs: Vec<CapitalDocument> = cursor.try_collect().await?;
    docs.into_iter().map(Capital::try_from).collect()
}

/// Looks up one city by id or, for any other key, by name (case-insensitive, via the collation of the collection).
/// Names are not unique across countries, so a lookup by name returns the first by country.
pub async fn get(state: &AppState, scope: Scope, key: &str) -> Result<Capital> {
    let mut query = filter(scope);
    query.insert(if is_id(key) { "_id" } else { "name" }, key);

    capitals(state)?
        .find_one(query)
        .sort(doc! { "country": 1 })
        .await?
        .ok_or_else(|| HttpError::not_found(format!(r#"no {} with id or name "{key}""#, noun(scope))))?
        .try_into()
}

pub async fn create(state: &AppState, scope: Scope, input: CapitalData) -> Result<Capital> {
    assert_scope(scope, &input)?;
    let doc = CapitalDocument {
        id: capital_id(&input.country, &input.name),
        data: input,
    };

    capitals(state)?.insert_one(&doc).await.map_err(as_conflict)?;
    doc.try_into()
}

/// Replaces all fields of a city (PUT semantics); the id stays.
pub async fn update(state: &AppState, scope: Scope, id: &str, input: CapitalData) -> Result<Capital> {
    assert_id(scope, id)?;
    assert_scope(scope, &input)?;

    let mut query = filter(scope);
    query.insert("_id", id);
    let doc = CapitalDocument {
        id: id.to_string(),
        data: input,
    };

    capitals(state)?
        .find_one_and_replace(query, &doc)
        .return_document(ReturnDocument::After)
        .await
        .map_err(as_conflict)?
        .ok_or_else(|| HttpError::not_found(format!(r#"no {} with id "{id}""#, noun(scope))))?
        .try_into()
}

pub async fn remove(state: &AppState, scope: Scope, id: &str) -> Result<()> {
    assert_id(scope, id)?;

    let mut query = filter(scope);
    query.insert("_id", id);

    if capitals(state)?.delete_one(query).await?.deleted_count == 0 {
        return Err(HttpError::not_found(format!(r#"no {} with id "{id}""#, noun(scope))));
    }

    Ok(())
}

/// Adds many cities at once (all scopes); cities which already exist (or a second capital of a country) are skipped.
/// Returns the number of cities added.
pub async fn insert_many(state: &AppState, items: Vec<CapitalData>) -> Result<u64> {
    if items.is_empty() {
        return Ok(0);
    }

    let total = items.len() as u64;
    let docs = items.into_iter().map(|data| CapitalDocument {
        id: capital_id(&data.country, &data.name),
        data,
    });

    match capitals(state)?.insert_many(docs).ordered(false).await {
        Ok(result) => Ok(result.inserted_ids.len() as u64),

        Err(err) => match &*err.kind {
            ErrorKind::InsertMany(failure)
                if failure.write_concern_error.is_none()
                    && failure
                        .write_errors
                        .iter()
                        .flatten()
                        .all(|error| error.code == DUPLICATE_KEY) =>
            {
                let skipped = failure.write_errors.as_ref().map_or(0, Vec::len) as u64;
                Ok(total - skipped)
            }

            _ => Err(err.into()),
        },
    }
}

/// Adds cities only if none are stored (e.g. the examples on start). Returns the number of cities added.
pub async fn insert_if_empty(state: &AppState, items: Vec<CapitalData>) -> Result<u64> {
    if capitals(state)?.estimated_document_count().await? > 0 {
        return Ok(0);
    }

    insert_many(state, items).await
}

/// Removes all cities (the collection with its schema and indexes stays). Returns the number removed.
pub async fn clear(state: &AppState) -> Result<u64> {
    Ok(capitals(state)?.delete_many(doc! {}).await?.deleted_count)
}

/// Name of the unique index a duplicate-key error was raised by; none for any other error.
pub fn duplicate_index(err: &Error) -> Option<&str> {
    let message = match &*err.kind {
        ErrorKind::Write(WriteFailure::WriteError(error)) if error.code == DUPLICATE_KEY => &error.message,
        ErrorKind::Command(error) if error.code == DUPLICATE_KEY => &error.message,
        _ => return None,
    };

    // e.g. `E11000 duplicate key error collection: capitals.capitals index: country_1 dup key: { … }`
    Some(
        message
            .split_once("index: ")
            .and_then(|(_, rest)| rest.split_whitespace().next())
            .unwrap_or_default(),
    )
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

fn filter(Scope { capitals_only }: Scope) -> Document {
    if capitals_only {
        doc! { "capital": true }
    } else {
        doc! {}
    }
}

fn noun(Scope { capitals_only }: Scope) -> &'static str {
    if capitals_only { "capital" } else { "city" }
}

/// Checks the format of an id; a malformed id cannot exist, so it counts as not found.
fn assert_id(scope: Scope, id: &str) -> Result<()> {
    if is_id(id) {
        return Ok(());
    }

    Err(HttpError::not_found(format!(r#"no {} with id "{id}""#, noun(scope))))
}

/// In the scope of capitals, a city must stay a capital (other cities belong to /city).
fn assert_scope(Scope { capitals_only }: Scope, input: &CapitalData) -> Result<()> {
    if capitals_only && !input.capital {
        return Err(HttpError::bad_request("only capitals here: use /city for other cities"));
    }

    Ok(())
}

/// Maps a duplicate-key error to 409:
/// either the country has a capital already (partial unique index on country, see /db/schema.js)
/// or the city exists (unique index on country + name, or the id derived from both);
/// any other error stays an internal error.
fn as_conflict(err: Error) -> HttpError {
    match duplicate_index(&err) {
        Some("country_1") => HttpError::conflict("this country already has a capital"),
        Some(_) => HttpError::conflict("this city already exists in this country"),
        None => err.into(),
    }
}
