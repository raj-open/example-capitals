# ----------------------------------------------------------------
# DEV CONTAINER (workspace)
# ----------------------------------------------------------------
# small on purpose: plain Node, Rust (for the backend) + just (from the official images), nothing else;
# copied to /.devcontainer/Dockerfile by `just setup` or `npm run setup:devcontainer`

FROM node:26-trixie-slim

COPY --from=ghcr.io/casey/just:1.59.0 /just /usr/local/bin/

# Rust as in the official image; owned by the workspace user, so cargo can fetch crates
COPY --from=rust:1-slim-trixie --chown=node:node /usr/local/rustup /usr/local/rustup
COPY --from=rust:1-slim-trixie --chown=node:node /usr/local/cargo /usr/local/cargo
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

# a C toolchain for linking; CA certificates for cargo (node brings its own); clippy and rustfmt for `just lint-check`
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        gcc \
        libc6-dev \
    && rm -rf /var/lib/apt/lists/* \
    && rustup component add clippy rustfmt

# npm as pinned in /package.json (`devEngines`), else installs fail
RUN npm install --global npm@^12.2.2 \
    && npm cache clean --force

# system libraries of the browser for the e2e tests (`just tests-e2e` downloads the browser itself);
# NOTE: the version of Playwright as in /package.json
RUN npx --yes playwright@1.65.1 install-deps chromium \
    && rm -rf /var/lib/apt/lists/* \
    && npm cache clean --force
