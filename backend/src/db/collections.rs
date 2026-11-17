//! Typed access to the collections.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use mongodb::Collection;

use crate::_core::errors::HttpError;
use crate::_core::errors::Result;
use crate::_core::state::AppState;
use crate::models::capital::CapitalDocument;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

pub fn capitals(state: &AppState) -> Result<Collection<CapitalDocument>> {
    let client = state
        .client
        .as_ref()
        .ok_or_else(|| HttpError::internal("database not connected"))?;

    Ok(client.database(&state.settings.database.name).collection("capitals"))
}
