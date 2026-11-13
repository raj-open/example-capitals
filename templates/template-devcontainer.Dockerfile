# ----------------------------------------------------------------
# DEV CONTAINER (workspace)
# ----------------------------------------------------------------
# small on purpose: plain Node + just (from the official just image), nothing else;
# copied to /.devcontainer/Dockerfile by `just setup` or `npm run setup:devcontainer`

FROM node:26-trixie-slim

COPY --from=ghcr.io/casey/just:1.59.0 /just /usr/local/bin/

# npm as pinned in /package.json (`devEngines`), else installs fail
RUN npm install --global npm@^12.2.2 \
    && npm cache clean --force
