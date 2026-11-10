/**
 * Map with one marker per capital.
 *
 * TODO: 32px × 32px square marker per capital (store: useCapitals.items),
 * with a popup to change its colour (store: setColour).
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function MapView() {
    const element = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map>(null);

    useEffect(() => {
        if (!token || !element.current) {
            return;
        }

        mapboxgl.accessToken = token;
        map.current = new mapboxgl.Map({
            container: element.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [10, 30],
            zoom: 1.5,
        });

        return () => map.current?.remove();
    }, []);

    if (!token) {
        return <div className="map">Set VITE_MAPBOX_TOKEN in .env</div>;
    }

    return <div className="map" ref={element} />;
}
