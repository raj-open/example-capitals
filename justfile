# Task runner. `just` lists recipes; `just menu` picks one.

# ----------------------------------------------------------------
# SETTINGS
# ----------------------------------------------------------------

set dotenv-load := true
set positional-arguments := true
set shell := ["bash", "-euo", "pipefail", "-c"]

# ----------------------------------------------------------------
# LOCAL VARIABLES
# ----------------------------------------------------------------

# explicit paths, so biome never scans local-only folders (which may contain other biome configs)
lint_paths := "frontend tests db templates package.json tsconfig.base.json biome.json"

# cargo from rustup (`~/.cargo/bin`) also where the shell profile is not loaded (e.g. GUI apps)
export PATH := env("CARGO_HOME", env("HOME", "") / ".cargo") / "bin" + ":" + env("PATH")

# the backend (Rust): cargo with its manifest; `--locked` never rewrites /backend/Cargo.lock
manifest := "--manifest-path backend/Cargo.toml"

# the backend (for the data recipes)
api := "http://localhost:" + env("PORT", "3001")

# ----------------------------------------------------------------
# MENU
# ----------------------------------------------------------------

_default:
    @- just --unsorted --list

menu:
    @- just --unsorted --choose

# ----------------------------------------------------------------
# SETUP
# ----------------------------------------------------------------

# create .env (if missing) and .devcontainer from /templates; install dependencies
[group('setup')]
setup:
    @[ -f .env ] || { cp templates/template.env .env; echo "created .env: fill in the values"; }
    mkdir -p .devcontainer
    cp templates/template-devcontainer.json .devcontainer/devcontainer.json
    cp templates/template-devcontainer-compose.yaml .devcontainer/devcontainer-compose.yaml
    cp templates/template-devcontainer.Dockerfile .devcontainer/Dockerfile
    @just _deps
    @just models

# generate TypeScript types from /models/api.yaml into /frontend/@api (not committed);
# the backend (Rust) mirrors them in /backend/src/models
[group('setup')]
models: _deps
    npx --no -- openapi-ts -i ./models/api.yaml -o ./frontend/@api -p @hey-api/typescript --no-log-file

# install exactly as the lock file says (`npm ci`); never rewrite an existing lock file.
# a lock file is created (from scratch) only if missing: to upgrade, delete /package-lock.json, then run `just build`.
# reinstall if an install did not finish (npm writes node_modules/.package-lock.json last)
# or a manifest/the lock file changed since (`npm ci` fails if they disagree);
# npm and node versions are pinned via `devEngines` in /package.json
_deps:
    #!/usr/bin/env bash
    set -euo pipefail
    marker="node_modules/.package-lock.json"
    manifests="package-lock.json package.json frontend/package.json"
    if [ ! -f package-lock.json ]; then
        # resolve from scratch: from an existing node_modules, npm writes no `resolved`/`integrity`
        rm -rf node_modules frontend/node_modules
        npm install

    elif [ ! -f "${marker}" ]; then
        npm ci

    elif [ -n "$(find ${manifests} -newer "${marker}")" ]; then
        npm ci

    fi

# as `_deps`, for the backend: create /backend/Cargo.lock only if missing (to upgrade: delete it, then `just build`)
_crates:
    @[ -f backend/Cargo.lock ] || cargo generate-lockfile {{manifest}}

# build the backend (debug, fast) for dev and tests
_backend: _crates
    cargo build --locked {{manifest}}

# ----------------------------------------------------------------
# RUN
# ----------------------------------------------------------------

# start the database (docker)
[group('run')]
serve-db:
    docker compose up -d db

# stop the database (data is kept in the docker volume; `just clean-docker` removes it)
[group('run')]
stop-db:
    docker compose stop db

# clear the database: remove its volume and start it again (/db/schema.js runs on the empty volume)
[group('run')]
clear-db:
    -docker compose down --volumes
    docker compose up -d db

# run backend and frontend (hot reload for the frontend)
[group('run')]
dev: _deps
    npx --no -- concurrently -n api,web -c blue,green "just dev-backend" "just dev-frontend"

# run the backend (no hot reload: restart after changes)
[group('run')]
dev-backend: _crates
    cargo run --locked {{manifest}}

# run the frontend with hot reload
[group('run')]
dev-frontend:
    npx --no -- vite --config frontend/vite.config.ts frontend

# ----------------------------------------------------------------
# DATA (via the running backend, as the settings panel; 403 with DATA_ACTIONS=false)
# ----------------------------------------------------------------

# remove all cities (the DB itself stays, unlike `just clear-db`)
[group('data')]
data-clear:
    @just _data DELETE /data

# add the example cities (existing ones are skipped)
[group('data')]
data-examples:
    @just _data POST /data/examples

# import all capitals from REST Countries (costs requests of the monthly quota)
[group('data')]
data-capitals:
    @just _data POST /data/capitals

# add the large sample of ordinary cities (existing ones are skipped)
[group('data')]
data-cities:
    @just _data POST /data/cities

_data method path:
    curl --silent --show-error --fail-with-body -X "$1" "{{api}}$2" && echo

# ----------------------------------------------------------------
# BUILD
# ----------------------------------------------------------------

# type-check everything, bundle the frontend and build the backend (release: /backend/target/release/backend)
[group('build')]
build: _deps check
    npx --no -- vite build --config frontend/vite.config.ts frontend
    cargo build --locked --release {{manifest}}

# ----------------------------------------------------------------
# TESTS
# ----------------------------------------------------------------

# all tests (integration and e2e need `just serve-db`)
[group('tests')]
tests: tests-unit tests-behave tests-integration tests-e2e

# unit tests in /backend/tests (cargo) and /frontend/tests (vitest)
[group('tests')]
tests-unit: _deps _crates
    cargo test --locked {{manifest}}
    npx --no -- vitest run --root frontend

# behavioural tests (gherkin) in /tests/behave, against the backend binary without a database
[group('tests')]
tests-behave: _deps _backend
    npx --no -- cucumber-js --import "tests/behave/steps/**/*.ts" "tests/behave/features/**/*.feature"

# integration tests (API + DB) in /tests/integration; need `just serve-db`
[group('tests')]
tests-integration: _deps _backend
    npx --no -- vitest run --root tests/integration

# end-to-end tests (UI + API + DB) in /tests/e2e; need `just serve-db`
[group('tests')]
tests-e2e: _deps _backend
    npx --no -- playwright install chromium
    npx --no -- playwright test --config tests/e2e/playwright.config.ts

# ----------------------------------------------------------------
# DOCS
# ----------------------------------------------------------------

# screenshots for /demos (WebP) and the social preview of the repo (UI + API + DB); needs `just serve-db` and capitals in the DB
[group('docs')]
demos: _deps _backend
    npx --no -- playwright install chromium
    npx --no -- playwright test --config tests/demos/playwright.config.ts

# ----------------------------------------------------------------
# QUALITY
# ----------------------------------------------------------------

# type-check backend, frontend and /tests
[group('quality')]
check: _deps _crates models
    cargo check --locked --all-targets {{manifest}}
    npx --no -- tsc -p frontend
    npx --no -- tsc -p tests

# format and lint, with auto-fixes where possible
[group('quality')]
prettify: _deps _crates
    npx --no -- biome check --write {{lint_paths}}
    cargo clippy --locked --all-targets --fix --allow-dirty --allow-staged {{manifest}}
    cargo fmt {{manifest}}

# as prettify, but only reports; then type-checks
[group('quality')]
lint-check: _deps _crates
    npx --no -- biome check {{lint_paths}}
    cargo fmt --check {{manifest}}
    cargo clippy --locked --all-targets {{manifest}} -- -D warnings
    @just check

# ----------------------------------------------------------------
# MAINTENANCE
# ----------------------------------------------------------------

# set the version in all manifests (incl. /backend/Cargo.toml and its entry in Cargo.lock) and /dist/VERSION
[group('maintenance')]
version value: _crates
    npm version "{{value}}" --no-git-tag-version --workspaces --include-workspace-root --allow-same-version
    node -e 'const fs = require("node:fs"); const path = "backend/Cargo.toml"; fs.writeFileSync(path, fs.readFileSync(path, "utf8").replace(/^version = ".*"$/m, `version = "${process.argv[1]}"`))' "{{value}}"
    cargo update --workspace {{manifest}}
    echo "{{value}}" > dist/VERSION

# remove build artefacts (incl. the backend's, which are large) and generated types (`just build` restores)
[group('maintenance')]
clean:
    rm -rf frontend/dist .cache frontend/@api backend/target

# remove dependencies and playwright browsers (`just setup` and `just tests-e2e` restore)
[group('maintenance')]
clean-deps:
    @# before node_modules, as it needs playwright; `-` = skip if already gone
    -npx --no -- playwright uninstall
    rm -rf node_modules frontend/node_modules

# remove docker container, network and volume (data) of this project (`just serve-db` restores)
[group('maintenance')]
clean-docker:
    @# `--rmi local` keeps shared images such as mongo:9; `-` = skip if docker is not running
    -docker compose down --volumes --rmi local

# all of the above
[group('maintenance')]
clean-all: clean clean-deps clean-docker
