//! Import of countries and their capitals from REST Countries (v5).
//!
//! Docs: https://restcountries.com/docs/countries
//!
//! The API pages via `limit` + `offset` (envelope `data.objects`, `data.meta.more`),
//! but can neither filter nor sort by population,
//! so all countries are fetched and the selection (`population_min`, `top`) happens here.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use mongodb::bson::doc;
use reqwest::Url;
use serde::Deserialize;

use crate::db::collections::capitals;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::ids::capital_id;
use crate::_core::regions::region_colour;
use crate::_core::settings::Selection;
use crate::_core::state::AppState;
use crate::_core::text::trim;
use crate::models::capital::CapitalData;
use crate::services::capital::duplicate_index;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const FIELDS: &str = "names.common,capitals,population,region";

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

/// Country as returned by the API (only the fields requested via `response_fields`).
#[derive(Debug, Clone, Default, Deserialize)]
pub struct Country {
    pub names: Option<Names>,
    pub capitals: Option<Vec<CapitalInfo>>,
    pub population: Option<f64>,
    pub region: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct Names {
    pub common: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct CapitalInfo {
    pub name: Option<String>,
    /// NOTE: inner keys not documented, verified against a live response
    pub coordinates: Option<Coordinates>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct Coordinates {
    pub lat: Option<f64>,
    pub lng: Option<f64>,
}

#[derive(Deserialize)]
struct Page {
    data: PageData,
}

#[derive(Deserialize)]
struct PageData {
    objects: Vec<Country>,
    meta: Meta,
}

#[derive(Deserialize)]
struct Meta {
    count: usize,
    more: bool,
}

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/// Fetches all countries and upserts the capitals of the selection (by country and name, so it is idempotent).
/// Costs ⌈total / limit⌉ requests of the monthly quota. Returns the number of capitals stored.
pub async fn import_capitals(state: &AppState) -> Result<u64> {
    let settings = &state.settings.restcountries;

    if settings.key.is_empty() {
        return Err(HttpError::unavailable("RESTCOUNTRIES_API_KEY is not set"));
    }

    let items = to_capitals(fetch_all(state).await?, &settings.selection);
    upsert(state, items).await
}

/// Maps countries to capitals (`country` = common name, `name` = first capital).
///
/// - skips countries without a capital or coordinates
/// - keeps countries with population ≥ `population_min`, then the `top` most populous
pub fn to_capitals(data: Vec<Country>, selection: &Selection) -> Vec<CapitalData> {
    let mut data: Vec<Country> = data
        .into_iter()
        .filter(|item| item.population.unwrap_or(0.0) >= selection.population_min)
        .collect();

    // stable, so equal populations keep their order
    data.sort_by(|a, b| b.population.unwrap_or(0.0).total_cmp(&a.population.unwrap_or(0.0)));

    data.into_iter()
        .filter_map(to_capital)
        .take(selection.top.unwrap_or(usize::MAX))
        .collect()
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Fetches all pages (⌈total / limit⌉ requests, sequential to respect the rate limit).
async fn fetch_all(state: &AppState) -> Result<Vec<Country>> {
    let settings = &state.settings.restcountries;
    let client = reqwest::Client::new();
    let mut items = Vec::new();
    let mut offset = 0;

    loop {
        let mut url = Url::parse(&settings.url).map_err(HttpError::internal)?;
        url.query_pairs_mut()
            .append_pair("limit", &settings.limit.to_string())
            .append_pair("offset", &offset.to_string())
            .append_pair("response_fields", FIELDS);

        let response = client.get(url).bearer_auth(&settings.key).send().await?;

        if !response.status().is_success() {
            return Err(HttpError::internal(format!(
                "REST Countries responded with {}",
                response.status().as_u16()
            )));
        }

        let PageData { objects, meta } = response.json::<Page>().await?.data;
        items.extend(objects);
        offset += meta.count;

        if !meta.more || meta.count == 0 {
            return Ok(items);
        }
    }
}

fn to_capital(
    Country {
        names,
        capitals,
        region,
        ..
    }: Country,
) -> Option<CapitalData> {
    let country = trim(&names?.common?).to_string();
    let capital = capitals?.into_iter().next()?;
    let name = trim(&capital.name?).to_string();
    let Coordinates { lat, lng } = capital.coordinates?;
    let (latitude, longitude) = (lat.filter(|x| x.is_finite())?, lng.filter(|x| x.is_finite())?);

    if country.is_empty() || name.is_empty() {
        return None;
    }

    Some(CapitalData {
        name,
        country,
        latitude,
        longitude,
        capital: true,
        colour: region_colour(region.as_deref()),
    })
}

/// Upserts by (country, name), the unique key; conflicts (e.g. with an id taken by an edited capital) are logged and skipped.
async fn upsert(state: &AppState, items: Vec<CapitalData>) -> Result<u64> {
    let collection = capitals(state)?;
    let mut count = 0;
    let mut skipped = Vec::new();

    for CapitalData {
        name,
        country,
        latitude,
        longitude,
        capital,
        colour,
    } in items
    {
        // the colour (by region) only for new cities, so colours chosen by the user survive a re-import
        let mut insert = doc! { "_id": capital_id(&country, &name) };
        if let Some(colour) = colour {
            insert.insert("colour", colour);
        }

        let update = doc! {
            "$set": { "name": &name, "country": &country, "latitude": latitude, "longitude": longitude, "capital": capital },
            "$setOnInsert": insert,
        };

        match collection
            .update_one(doc! { "country": &country, "name": &name }, update)
            .upsert(true)
            .await
        {
            Ok(_) => count += 1,
            Err(err) if duplicate_index(&err).is_some() => skipped.push(format!("{name}, {country}")),
            Err(err) => return Err(err.into()),
        }
    }

    if !skipped.is_empty() {
        tracing::warn!("skipped {} conflicting capitals: {skipped:?}", skipped.len());
    }

    Ok(count)
}
