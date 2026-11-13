// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { lazy, Suspense, useEffect } from "react";

import { CapitalList } from "./components/CapitalList.tsx";
import { useCapitals } from "./store/capital.ts";
import { isDark, useMapStyle } from "./store/map.ts";
import { usePlaces } from "./store/places.ts";
import { useSettings } from "./store/settings.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

// loaded lazily, as mapbox-gl is large (own chunk, so the list renders first)
const MapView = lazy(() => import("./components/MapView.tsx").then((module) => ({ default: module.MapView })));

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function App() {
    const load = useCapitals((state) => state.load);
    const loadPlaces = usePlaces((state) => state.load);
    const lightPreset = useMapStyle((state) => state.lightPreset);
    const locale = useSettings((state) => state.locale);
    const capitalsOnly = useSettings((state) => state.capitalsOnly);

    // (re)load on start and when the mode changes (/capital or /city): `load` reads the mode itself
    // biome-ignore lint/correctness/useExhaustiveDependencies: capitalsOnly triggers the reload
    useEffect(() => {
        load();
    }, [load, capitalsOnly]);

    // known places for snap-to on the map (once)
    useEffect(() => {
        loadPlaces();
    }, [loadPlaces]);

    // colour mode of the UI follows the light of the map (see /frontend/src/styles.css)
    useEffect(() => {
        document.documentElement.dataset.mode = isDark(lightPreset) ? "dark" : "light";
    }, [lightPreset]);

    // language of the page follows the chosen locale (default en-GB, as in /frontend/index.html)
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    return (
        <div className="layout">
            <CapitalList />
            <Suspense fallback={<div className="map" />}>
                <MapView />
            </Suspense>
        </div>
    );
}
