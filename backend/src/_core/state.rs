//! State shared by all requests: settings and the database client.

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::sync::Arc;

use mongodb::Client;

use super::settings::Settings;

// ----------------------------------------------------------------
// CLASSES
// ----------------------------------------------------------------

#[derive(Clone)]
pub struct AppState {
    pub settings: Arc<Settings>,
    /// none without a database (`DATABASE_HOST` empty): /health then reports 503
    pub client: Option<Client>,
}

impl AppState {
    pub fn new(settings: Settings, client: Option<Client>) -> Self {
        Self {
            settings: Arc::new(settings),
            client,
        }
    }
}
