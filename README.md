# Example – Capitals #

[![qa (main)](../../actions/workflows/qa-manual.yaml/badge.svg?branch=main)](../../actions/workflows/qa-manual.yaml?query=branch%3Amain)
[![qa (staging)](../../actions/workflows/qa-auto.yaml/badge.svg?branch=staging)](../../actions/workflows/qa-auto.yaml?query=branch%3Astaging)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2022.18-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/DB-MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![licence](https://img.shields.io/badge/licence-MPL--2.0-orange)](LICENCE)

An API + UI with a MongoDB database, via which one can create, edit, view, and delete capital cities.

<!-- TODO: preview image, once available -->
<!-- ![List of capitals next to the map, with a marker per capital](demos/img/preview.webp) -->

## Demonstration ##

See the [demos](demos/README.md).

## Stack ##

- [frontend](frontend): React + TypeScript, Zustand, Mapbox (Vite)

- [backend](backend): Node.js + TypeScript (run natively, no build step), Express, MongoDB driver

- [db](db/schema.js): MongoDB in Docker; the schema runs automatically on the first start

- [models](models/api.yaml): OpenAPI description of the endpoints; TypeScript types are generated from it via `@hey-api/openapi-ts` into `backend/@api` and `frontend/@api` (`just models`)

## Requirements ##

- Node.js ≥ 22.18 and npm

- Docker (for the database)

- [just](https://github.com/casey/just) as task runner

- a [REST Countries](https://restcountries.com) API key and a [Mapbox](https://account.mapbox.com) public token

## Usage ##

```bash
just setup      # creates .env from templates/template.env (fill in the values), installs dependencies
just serve-db   # starts MongoDB on localhost:${DATABASE_PORT}
just dev        # UI on http://localhost:5173, API on http://localhost:${PORT} (GET /health -> {"ok":true})
```

`PORT` and `DATABASE_PORT` are the values from `.env` (3001 and 27017 in [the template](templates/template.env)).

When done:

```bash
just stop-db     # stops MongoDB (data is kept)
just clean       # removes build artefacts and generated types
just clean-all   # also removes dependencies, playwright browsers and the docker container, network and volume
```

Run `just` for all recipes.

No Docker or Node on the host? Run `npm run setup:devcontainer` (needs only Node and npm, no just), then open the repo in a dev container (MongoDB included). The dev container config is copied from [templates](templates), so for a GitHub Codespace commit the generated `.devcontainer` folder to a fork first.

## Tests ##

Run everything at once with `just tests` (start the database first with `just serve-db`), or each kind on its own as below.

### Unit tests ###

Test single functions and the store, without database or browser.
They live in [backend/tests](backend/tests) and [frontend/tests](frontend/tests).

```bash
just tests-unit
```

### Behavioural tests ###

Describe the API's behaviour in plain sentences (Gherkin), in [tests/behave/features](tests/behave/features).
They run the API in-process, without database.

```bash
just tests-behave
```

### End-to-end tests ###

Open the UI in a browser against the real API and database, in [tests/e2e](tests/e2e).
The API and UI are started automatically; the first run downloads a browser (Chromium).

```bash
just serve-db
just tests-e2e
```

### Integration tests ###

Test the API against the real database, in [tests/integration](tests/integration).

```bash
just serve-db
just tests-integration
```

### Explorative tests ###

Start the app and try things out by hand:

```bash
just serve-db
just dev
```

Then open the UI at <http://localhost:5173>, or call the API (3001 is just the example value of `PORT` in `.env`):

```bash
curl -s localhost:3001/health
curl -s localhost:3001/capital
```

All endpoints and their payloads are described in [models/api.yaml](models/api.yaml).

> [!NOTE]
> The `/capital` endpoints are stubs for now and answer `501`.

## Linting ##

```bash
just prettify     # formats and fixes what it can
just lint-check   # only reports; also type-checks
```

The same checks and tests run on GitHub via [qa-auto](.github/workflows/qa-auto.yaml) (pull requests) and [qa-manual](.github/workflows/qa-manual.yaml) (on demand).
