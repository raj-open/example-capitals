//! Entrypoint: connect to the DB, serve the API; an empty DB gets the example cities.
//!
//! Nothing is imported from REST Countries on start (it costs requests of the monthly quota):
//! capitals and other cities are added on request (POST /data/capitals, /data/cities; settings panel or `just data-*`).

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

use std::net::Ipv6Addr;

use tokio::net::TcpListener;
use tracing::error;
use tracing::info;

use backend::_core::settings::Settings;
use backend::AppState;
use backend::app;
use backend::data::examples::examples;
use backend::db::client;
use backend::services::capital;

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

#[tokio::main]
async fn main() {
    // the repo-root .env (searched upwards from the working directory); variables already set take precedence
    dotenvy::dotenv().ok();

    // TLS for the REST Countries client (the MongoDB driver brings its own)
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("no other crypto provider installed");

    let settings = Settings::from_env();

    // log with time and level, up to LOG_LEVEL (see /backend/src/_core/log.rs)
    tracing_subscriber::fmt()
        .with_max_level(settings.log.level)
        .with_target(false)
        .init();

    let client = client::connect(&settings.database)
        .await
        .expect("invalid database settings");
    let state = AppState::new(settings, client);

    // all interfaces (dual stack), so `localhost` works with IPv4 and IPv6; PORT=0 picks a free port
    let listener = TcpListener::bind((Ipv6Addr::UNSPECIFIED, state.settings.port))
        .await
        .expect("port available");
    let port = listener.local_addr().expect("bound").port();
    info!("API on http://localhost:{port}");

    tokio::spawn(add_examples(state.clone()));
    axum::serve(listener, app(state)).await.expect("server runs");
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

async fn add_examples(state: AppState) {
    if state.client.is_none() {
        return;
    }

    match capital::insert_if_empty(&state, examples()).await {
        Ok(0) => info!("cities already stored"),
        Ok(count) => info!("empty DB: added {count} example cities"),
        Err(err) => error!("adding the examples failed: {err}"),
    }
}
