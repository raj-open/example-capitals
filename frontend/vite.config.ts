// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// ----------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------

export default defineConfig(({ mode }) => {
    // the .env lives at the repo root (resolved from this file, so the cwd does not matter)
    const root = fileURLToPath(new URL("..", import.meta.url));
    const env = loadEnv(mode, root, "");

    return {
        plugins: [react()],
        envDir: root,
        // static files (icons), served at / and copied as they are into the build
        publicDir: "assets",
        build: {
            // mapbox-gl alone is ~1.9 MB minified and cannot be split; it is loaded lazily (see /frontend/src/App.tsx)
            chunkSizeWarningLimit: 2000,
        },
        server: {
            host: true,
            proxy: {
                "/api": {
                    target: `http://localhost:${env.PORT ?? 3001}`,
                    rewrite: (path) => path.replace(/^\/api/, ""),
                },
            },
        },
    };
});
