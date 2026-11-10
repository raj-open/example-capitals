// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { lazy, Suspense, useEffect } from "react";

import { CapitalList } from "./components/CapitalList.tsx";
import { useCapitals } from "./store/capital.ts";

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

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="layout">
            <CapitalList />
            <Suspense fallback={<div className="map" />}>
                <MapView />
            </Suspense>
        </div>
    );
}
