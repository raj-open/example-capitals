# Task runner of the repo. `just` lists recipes; `just menu` picks one.
# NOTE: /backend and /frontend have their own justfiles (same recipe names) and dependencies, called from here;
# what spans both (setup, database, /tests, demos, version) lives here.

# ----------------------------------------------------------------
# SETTINGS
# ----------------------------------------------------------------

set dotenv-load := true
set positional-arguments := true
set shell := ["bash", "-euo", "pipefail", "-c"]

# ----------------------------------------------------------------
# LOCAL VARIABLES
# ----------------------------------------------------------------

# explicit paths, so biome never scans local-only folders (which may contain other biome configs); /frontend lints itself
lint_paths := "tests db templates package.json tsconfig.base.json biome.json"

# the parts: `{{backend}} <recipe>` runs a recipe of /backend/justfile in /backend (likewise /frontend)
backend := 'just --justfile "backend/justfile"'
frontend := 'just --justfile "frontend/justfile"'

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
# BUILD
# ----------------------------------------------------------------

# create .env (if missing) and .devcontainer from /templates; install dependencies
[group('build')]
setup:
    @[ -f ".env" ] || { cp "templates/template.env" ".env"; echo "created .env: fill in the values"; }
    mkdir -p ".devcontainer"
    cp "templates/template-devcontainer.json"         ".devcontainer/devcontainer.json"
    cp "templates/template-devcontainer-compose.yaml" ".devcontainer/devcontainer-compose.yaml"
    cp "templates/template-devcontainer.Dockerfile"   ".devcontainer/Dockerfile"
    @just _deps
    @just build-models

# build frontend (bundle) and backend (optimised), after type-checking everything
[group('build')]
build: _deps check
    {{frontend}} build
    {{backend}} build

# copy /models into frontend and backend (not committed), then generate the types of the API there
[group('build')]
build-models: _deps
    mkdir -p "frontend/models" "backend/models"
    cp "models/api.yaml" "frontend/models/api.yaml"
    cp "models/api.yaml" "backend/models/api.yaml"
    {{frontend}} build-models
    {{backend}} build-models

# fast build of the backend (debug), for the tests in /tests
_backend: build-models
    {{backend}} build-dev

# install the tooling of the repo (/tests, biome, playwright) as the lock file says (`npm ci`), when needed;
# a missing lock file is created (to upgrade: delete it); /frontend installs its own
_deps:
    #!/usr/bin/env bash
    set -euo pipefail
    marker="node_modules/.package-lock.json"
    manifests="package-lock.json package.json"
    if [ ! -f "package-lock.json" ]; then
        # resolve from scratch: from an existing node_modules, npm writes no `resolved`/`integrity`
        rm -rf "node_modules"
        npm install --no-audit --no-fund

    elif [ ! -f "${marker}" ]; then
        npm ci --no-audit --no-fund

    elif [ -n "$(find ${manifests} -newer "${marker}")" ]; then
        npm ci --no-audit --no-fund

    fi

# ----------------------------------------------------------------
# RUN
# ----------------------------------------------------------------

# start the database (docker)
[group('run')]
serve-db:
    docker compose up -d "db"

# stop the database (data is kept in the docker volume; `just clean-docker` removes it)
[group('run')]
stop-db:
    docker compose stop "db"

# clear the database: remove its volume and start it again (/db/schema.js runs on the empty volume)
[group('run')]
clear-db:
    -docker compose down --volumes
    docker compose up -d "db"

# run backend and frontend (hot reload for the frontend)
[group('run')]
dev: build-models
    npx --no -- concurrently \
        -n "api,web" -c "blue,green" \
        "just dev-backend" "just dev-frontend"

# run the backend (no hot reload: restart after changes)
[group('run')]
dev-backend:
    {{backend}} dev

# run the frontend with hot reload
[group('run')]
dev-frontend:
    {{frontend}} dev

# ----------------------------------------------------------------
# DATA (via the running backend, as the settings panel; 403 with DATA_ACTIONS=false)
# ----------------------------------------------------------------

# remove all cities (the DB itself stays, unlike `just clear-db`)
[group('data')]
data-clear:
    @just _data "DELETE" "/data"

# add the example cities (existing ones are skipped)
[group('data')]
data-examples:
    @just _data "POST" "/data/examples"

# import all capitals from REST Countries (costs requests of the monthly quota)
[group('data')]
data-capitals:
    @just _data "POST" "/data/capitals"

# add the large sample of ordinary cities (existing ones are skipped)
[group('data')]
data-cities:
    @just _data "POST" "/data/cities"

_data method path:
    curl \
        --silent --show-error --fail-with-body \
        -X "$1" "{{api}}$2" \
        && echo

# ----------------------------------------------------------------
# TESTS
# ----------------------------------------------------------------

# all tests (integration and e2e need `just serve-db`)
[group('tests')]
tests: tests-unit tests-behave tests-integration tests-e2e

# unit tests of the parts: /backend/tests (cargo), /frontend/tests (vitest)
[group('tests')]
tests-unit: build-models
    {{backend}} tests-unit
    {{frontend}} tests-unit

# behavioural tests (gherkin) in /tests/behave, against the backend binary without a database
[group('tests')]
tests-behave: _deps _backend
    npx --no -- cucumber-js \
        --import "tests/behave/steps/**/*.ts" \
        "tests/behave/features/**/*.feature"

# integration tests (API + DB) in /tests/integration; need `just serve-db`
[group('tests')]
tests-integration: _deps _backend
    npx --no -- vitest run --root "tests/integration"

# end-to-end tests (UI + API + DB) in /tests/e2e; need `just serve-db`
[group('tests')]
tests-e2e: _deps _backend
    npx --no -- playwright install "chromium"
    npx --no -- playwright test --config "tests/e2e/playwright.config.ts"

# ----------------------------------------------------------------
# DOCS
# ----------------------------------------------------------------

# screenshots for /demos (WebP) and the social preview of the repo (UI + API + DB); needs `just serve-db` and capitals in the DB
[group('docs')]
demos: _deps _backend
    npx --no -- playwright install "chromium"
    npx --no -- playwright test --config "tests/demos/playwright.config.ts"

# ----------------------------------------------------------------
# QUALITY
# ----------------------------------------------------------------

# type-check backend, frontend and /tests
[group('quality')]
check: build-models
    {{backend}} check
    {{frontend}} check
    npx --no -- tsc -p "tests"

# format and lint, with auto-fixes where possible
[group('quality')]
prettify: build-models
    npx --no -- biome check --write {{lint_paths}}
    {{backend}} prettify
    {{frontend}} prettify

# as prettify, but only reports; then type-checks
[group('quality')]
lint-check: build-models
    npx --no -- biome check {{lint_paths}}
    {{backend}} lint-check
    {{frontend}} lint-check
    npx --no -- tsc -p "tests"

# known vulnerabilities of the dependencies, of the repo and of /frontend (installs are quiet about them)
[group('quality')]
audit: _deps
    #!/usr/bin/env bash
    set -uo pipefail
    # both, even if the first reports findings; fails if either does
    status=0
    npm audit || status=1
    {{frontend}} audit || status=1
    exit "${status}"

# ----------------------------------------------------------------
# MAINTENANCE
# ----------------------------------------------------------------

# set the version of the repo, /frontend and /backend, and in /dist/VERSION
[group('maintenance')]
version value:
    npm version "{{value}}" --no-git-tag-version --allow-same-version
    {{frontend}} version "{{value}}"
    {{backend}} version "{{value}}"
    echo "{{value}}" > "dist/VERSION"

# remove build artefacts (incl. the backend's, which are large) and generated types (`just build` restores)
[group('maintenance')]
clean:
    {{backend}} clean
    {{frontend}} clean
    rm -rf ".cache"

# remove dependencies and playwright browsers (`just setup` and `just tests-e2e` restore)
[group('maintenance')]
clean-deps:
    @# before node_modules, as it needs playwright; `-` = skip if already gone
    -npx --no -- playwright uninstall
    rm -rf "node_modules"
    {{frontend}} clean-deps

# remove docker container, network and volume (data) of this project (`just serve-db` restores)
[group('maintenance')]
clean-docker:
    @# `--rmi local` keeps shared images such as mongo:9; `-` = skip if docker is not running
    -docker compose down --volumes --rmi "local"

# all of the above
[group('maintenance')]
clean-all: clean clean-deps clean-docker
