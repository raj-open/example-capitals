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
lint_paths := "backend frontend tests db templates package.json tsconfig.base.json biome.json"

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
    @just _deps
    @just models

# generate TypeScript types from /models/api.yaml into /backend/@api and /frontend/@api (not committed)
[group('setup')]
models: _deps
    npx --no -- openapi-ts -i ./models/api.yaml -o ./backend/@api -p @hey-api/typescript --no-log-file
    npx --no -- openapi-ts -i ./models/api.yaml -o ./frontend/@api -p @hey-api/typescript --no-log-file

# upgrade dependencies within manifest ranges (rewrites the lock file)
[group('setup')]
upgrade:
    npm update

# follow the lock file; rewrite it only if a manifest changed
_deps:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f package-lock.json ] \
        || [ package.json -nt package-lock.json ] \
        || [ backend/package.json -nt package-lock.json ] \
        || [ frontend/package.json -nt package-lock.json ]; then
        npm install
    elif [ ! -d node_modules ]; then
        npm ci
    fi

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

# run backend and frontend with hot reload
[group('run')]
dev: _deps
    npx --no -- concurrently -n api,web -c blue,green "just dev-backend" "just dev-frontend"

# run the backend with hot reload
[group('run')]
dev-backend:
    node --watch backend/src/index.ts

# run the frontend with hot reload
[group('run')]
dev-frontend:
    npx --no -- vite --config frontend/vite.config.ts frontend

# ----------------------------------------------------------------
# BUILD
# ----------------------------------------------------------------

# type-check everything and bundle the frontend (backend runs from source)
[group('build')]
build: _deps check
    npx --no -- vite build --config frontend/vite.config.ts frontend

# ----------------------------------------------------------------
# TESTS
# ----------------------------------------------------------------

# all tests (integration and e2e need `just serve-db`)
[group('tests')]
tests: tests-unit tests-behave tests-integration tests-e2e

# unit tests in /backend/tests and /frontend/tests
[group('tests')]
tests-unit: _deps
    npx --no -- vitest run --root backend
    npx --no -- vitest run --root frontend

# behavioural tests (gherkin) in /tests/behave
[group('tests')]
tests-behave: _deps
    npx --no -- cucumber-js --import "tests/behave/steps/**/*.ts" "tests/behave/features/**/*.feature"

# integration tests (API + DB) in /tests/integration; need `just serve-db`
[group('tests')]
tests-integration: _deps
    npx --no -- vitest run --root tests/integration

# end-to-end tests (UI + API + DB) in /tests/e2e; need `just serve-db`
[group('tests')]
tests-e2e: _deps
    npx --no -- playwright install chromium
    npx --no -- playwright test --config tests/e2e/playwright.config.ts

# ----------------------------------------------------------------
# QUALITY
# ----------------------------------------------------------------

# type-check backend, frontend and /tests
[group('quality')]
check: _deps models
    npx --no -- tsc -p backend
    npx --no -- tsc -p frontend
    npx --no -- tsc -p tests

# format and lint, with auto-fixes where possible
[group('quality')]
prettify: _deps
    npx --no -- biome check --write {{lint_paths}}

# as prettify, but only reports; then type-checks
[group('quality')]
lint-check: _deps
    npx --no -- biome check {{lint_paths}}
    @just check

# ----------------------------------------------------------------
# MAINTENANCE
# ----------------------------------------------------------------

# set the version in all manifests and /dist/VERSION
[group('maintenance')]
version value:
    npm version "{{value}}" --no-git-tag-version --workspaces --include-workspace-root --allow-same-version
    echo "{{value}}" > dist/VERSION

# remove build artefacts and generated types (`just build` restores)
[group('maintenance')]
clean:
    rm -rf frontend/dist .cache backend/@api frontend/@api

# remove dependencies and playwright browsers (`just setup` and `just tests-e2e` restore)
[group('maintenance')]
clean-deps:
    @# before node_modules, as it needs playwright; `-` = skip if already gone
    -npx --no -- playwright uninstall
    rm -rf node_modules backend/node_modules frontend/node_modules

# remove docker container, network and volume (data) of this project (`just serve-db` restores)
[group('maintenance')]
clean-docker:
    @# `--rmi local` keeps shared images such as mongo:9; `-` = skip if docker is not running
    -docker compose down --volumes --rmi local

# all of the above
[group('maintenance')]
clean-all: clean clean-deps clean-docker
