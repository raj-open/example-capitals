# ----------------------------------------------------------------
# DEV CONTAINER (workspace)
# ----------------------------------------------------------------
# small on purpose: plain Node + just (from the official just image), nothing else;
# copied to /.devcontainer/Dockerfile by `just setup` or `npm run setup:devcontainer`

FROM node:24-trixie-slim

COPY --from=ghcr.io/casey/just:1.59.0 /just /usr/local/bin/
