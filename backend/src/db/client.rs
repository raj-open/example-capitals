//! Connection to MongoDB.
//!
//! The collection (validator, collation, unique indexes) is created by /db/schema.js
//! when the database container starts for the first time.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::time::Duration;

use mongodb::Client;
use mongodb::bson::doc;
use mongodb::error::Result;
use mongodb::options::ClientOptions;

use crate::_core::settings::Database;

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const SELECTION_TIMEOUT: Duration = Duration::from_secs(5);

const PING_TIMEOUT: Duration = Duration::from_secs(2);

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

pub fn url(settings: &Database) -> String {
    let Database {
        host,
        port,
        name,
        user,
        password,
    } = settings;

    if user.is_empty() {
        return format!("mongodb://{host}:{port}/{name}");
    }

    let (user, password) = (encode(user), encode(password));
    format!("mongodb://{user}:{password}@{host}:{port}/{name}?authSource=admin")
}

/// Client for the database (connects lazily, on the first operation); none if no host is set.
pub async fn connect(settings: &Database) -> Result<Option<Client>> {
    if settings.host.is_empty() {
        return Ok(None);
    }

    let mut options = ClientOptions::parse(url(settings)).await?;
    options.server_selection_timeout = Some(SELECTION_TIMEOUT);
    Ok(Some(Client::with_options(options)?))
}

/// Whether the database answers (ping); false without a database.
pub async fn ping(client: Option<&Client>) -> bool {
    let Some(client) = client else {
        return false;
    };

    let admin = client.database("admin");
    let command = admin.run_command(doc! { "ping": 1 });
    matches!(tokio::time::timeout(PING_TIMEOUT, command).await, Ok(Ok(_)))
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/// Percent-encoding as `encodeURIComponent` (for user and password in the URL).
fn encode(text: &str) -> String {
    text.bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'!' | b'~' | b'*' | b'\'' | b'(' | b')' => {
                (byte as char).to_string()
            }
            _ => format!("%{byte:02X}"),
        })
        .collect()
}
