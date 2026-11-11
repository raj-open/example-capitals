/**
 * Map with one 32px × 32px square marker per capital,
 * shrinking when zoomed out (see /frontend/src/utils/markers.ts).
 *
 * Clicking a marker selects its capital (GET /capital/{name});
 * the map then flies to the selected capital and opens a popup to change the colour of its marker.
 * On Earth, a right-click (long-press on touch devices which support it) proposes a city to add:
 * it snaps to a place label of the map and to known places (see /frontend/src/utils/snap.ts),
 * marks the spot with a pin and opens the form in the sidebar, prefilled; a stored city is selected instead.
 * The appearance (basemap, light preset, theme) follows the map store (/frontend/src/store/map.ts),
 * chosen via the settings button on the map.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import type { Capital } from "../../@api/types.gen.ts";
import { places } from "../data/places.ts";
import { DEFAULT_COLOUR, useCapitals } from "../store/capital.ts";
import type { Appearance } from "../store/map.ts";
import { STYLES, texture, useMapStyle } from "../store/map.ts";
import { markerSize } from "../utils/markers.ts";
import type { Spot } from "../utils/snap.ts";
import { snap } from "../utils/snap.ts";
import { CapitalPopup } from "./CapitalPopup.tsx";
import { DataActions } from "./DataActions.tsx";
import { MapSettings } from "./MapSettings.tsx";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const ZOOM = 5;

/** durations of a flyby to another world (ms) */
const DEPARTURE = 700;
const ARRIVAL = 4000;

/** ids of the interactions which propose a city (on a place label, elsewhere) */
const PROPOSE = { label: "propose-label", point: "propose-point" } as const;

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function MapView() {
    const items = useCapitals((state) => state.items);
    const selected = useCapitals((state) => state.selected);
    const select = useCapitals((state) => state.select);
    const body = useMapStyle((state) => state.body);
    const style = useMapStyle((state) => state.style);
    const lightPreset = useMapStyle((state) => state.lightPreset);
    const theme = useMapStyle((state) => state.theme);
    const draft = useCapitals((state) => state.draft);
    const propose = useCapitals((state) => state.propose);

    const element = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map>(null);
    const markers = useRef(new Map<string, mapboxgl.Marker>());
    const pin = useRef<mapboxgl.Marker>(null);
    const content = useRef(document.createElement("div"));
    const popup = useRef(new mapboxgl.Popup({ offset: 20, closeOnClick: false, maxWidth: "none" }));
    const loaded = useRef(keyOf(useMapStyle.getState()));
    const world = useRef(useMapStyle.getState().body);
    const trips = useRef(0);
    const travelling = useRef(false);
    const ready = useRef(false);

    // ---- map ----

    useEffect(() => {
        if (!token || !element.current) {
            return;
        }

        mapboxgl.accessToken = token;
        map.current = new mapboxgl.Map({
            container: element.current,
            style: styleOf(useMapStyle.getState()),
            center: [10, 30],
            zoom: 1.5,
        });

        popup.current.setDOMContent(content.current);
        popup.current.on("close", () => select());

        // a click on the map itself (not on a marker or the popup) deselects, which closes the popup
        map.current.on("click", (event) => {
            if (event.originalEvent.target === map.current?.getCanvas()) {
                select();
            }
        });

        // marker size via a CSS variable, so markers need no update of their own
        const target = map.current;
        const resize = () =>
            target.getContainer().style.setProperty("--marker-size", `${markerSize(target.getZoom())}px`);
        target.on("zoom", resize);
        resize();

        // follow the size of the container (e.g. when the sidebar collapses), not only of the window
        const observer = new ResizeObserver(() => target.resize());
        observer.observe(element.current);

        // NOTE: own flag, as isStyleLoaded() is false while tiles load (changes would be lost);
        // each (re)load of a style applies the latest appearance
        target.on("style.load", () => {
            const appearance = useMapStyle.getState();
            ready.current = appearance.body === "earth";

            if (ready.current) {
                applyAppearance(target, appearance);
                listen(target);
            }
        });

        return () => {
            observer.disconnect();
            map.current?.remove();
        };
    }, [select]);

    // ---- appearance ----

    // NOTE: the map is created once (Mapbox bills per map load); a new basemap reuses it via setStyle
    useEffect(() => {
        const target = map.current;
        const key = keyOf({ body, style });

        if (!target || loaded.current === key) {
            return;
        }

        const other = body !== "earth";
        const load = () => {
            ready.current = false;
            unlisten(target);
            // full reload (no diff), so "style.load" fires and re-applies light preset and theme
            // NOTE: cast, as the typings of mapbox-gl wrongly require the font options
            target.setStyle(styleOf({ body, style }), { diff: false } as Parameters<mapboxgl.Map["setStyle"]>[1]);
        };

        loaded.current = key;

        if (other) {
            select();
            propose();
        }

        // another world: a (fake) flyby; otherwise (basemap on Earth) a plain switch
        if (world.current === body) {
            load();
            return;
        }

        world.current = body;
        travelling.current = true;
        const trip = ++trips.current;

        // no cities during the whole trip (markers hidden via CSS); afterwards only on Earth
        const container = target.getContainer();
        container.classList.add("offworld");

        // back on Earth with a selected city: arrive there and open its popup
        const arrival = () => {
            const { selected } = useCapitals.getState();
            return !other && selected ? { center: lngLat(selected), zoom: ZOOM } : undefined;
        };

        flyby(target, load, arrival, () => trip === trips.current).then((arrived) => {
            if (arrived) {
                travelling.current = false;
                container.classList.toggle("offworld", other);
                show(target, popup.current, useCapitals.getState().selected);
            }
        });
    }, [body, style, select, propose]);

    // light preset and theme are client-side config: no requests
    useEffect(() => {
        if (map.current && ready.current) {
            applyAppearance(map.current, { lightPreset, theme });
        }
    }, [lightPreset, theme]);

    // ---- markers ----

    // markers are kept in sync with the items (added, moved, removed, repainted), not rebuilt on every change
    useEffect(() => {
        const target = map.current;

        if (!target) {
            return;
        }

        const ids = new Set(items.map(({ id }) => id));

        for (const [id, marker] of markers.current) {
            if (!ids.has(id)) {
                marker.remove();
                markers.current.delete(id);
            }
        }

        for (const item of items) {
            let marker = markers.current.get(item.id);

            if (!marker) {
                const node = document.createElement("div");
                node.className = "marker";
                node.addEventListener("click", (event) => {
                    event.stopPropagation();
                    select(item.id);
                });

                marker = new mapboxgl.Marker({ element: node })
                    .setLngLat([item.longitude, item.latitude])
                    .addTo(target);
                markers.current.set(item.id, marker);
            }

            marker.setLngLat([item.longitude, item.latitude]);
            paint(marker.getElement(), item, item.id === selected?.id);
        }
    }, [items, selected, select]);

    // ---- draft (a city proposed to add) ----

    useEffect(() => {
        pin.current?.remove();
        pin.current = null;

        if (map.current && draft) {
            pin.current = new mapboxgl.Marker({ color: DEFAULT_COLOUR })
                .setLngLat([draft.longitude, draft.latitude])
                .addTo(map.current);
        }
    }, [draft]);

    // ---- selection ----

    useEffect(() => {
        const target = map.current;

        if (!target) {
            return;
        }

        if (!selected) {
            popup.current.remove();
            return;
        }

        // a city selected on another world: back to Earth (the flyby ends at the city)
        if (body !== "earth") {
            useMapStyle.getState().set({ body: "earth" });
            return;
        }

        // during a flyby, its arrival moves the map and opens the popup
        if (travelling.current) {
            return;
        }

        target.flyTo({ center: lngLat(selected), zoom: Math.max(target.getZoom(), ZOOM) });
        show(target, popup.current, selected);
    }, [selected, body]);

    if (!token) {
        return <div className="map">Set VITE_MAPBOX_TOKEN in .env</div>;
    }

    return (
        <div className="map">
            <div className="map-canvas" ref={element} />
            <div className="map-controls">
                <MapSettings />
                <DataActions />
            </div>
            {selected && createPortal(<CapitalPopup capital={selected} />, content.current)}
        </div>
    );
}

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/**
 * A (fake) flyby to another world: zoom out while fading to black, switch the style,
 * then swing in from the side while zooming in (to `arrival`, if given). Skipped by Mapbox for reduced motion.
 * `current` tells whether this trip is still the latest (quick switches cancel earlier ones);
 * resolves with whether it arrived (false if cancelled).
 */
function flyby(
    map: mapboxgl.Map,
    load: () => void,
    arrival: () => { center: [number, number]; zoom: number } | undefined,
    current: () => boolean,
): Promise<boolean> {
    const container = map.getContainer();
    const { lng } = map.getCenter();

    container.classList.add("travelling");
    map.easeTo({ zoom: 0, pitch: 0, bearing: 0, duration: DEPARTURE, essential: false });

    return new Promise((resolve) => {
        setTimeout(() => {
            if (!current()) {
                resolve(false);
                return;
            }

            map.once("style.load", () => {
                if (!current()) {
                    resolve(false);
                    return;
                }

                const { center, zoom } = arrival() ?? { center: [lng, 0] as [number, number], zoom: 1.5 };
                map.jumpTo({ center: [center[0] - 150, 25], zoom: 0, bearing: -35 });
                container.classList.remove("travelling");
                map.flyTo({ center, zoom, bearing: 0, duration: ARRIVAL, curve: 1.2, essential: false });
                map.once("moveend", () => resolve(current()));
            });

            load();
        }, DEPARTURE);
    });
}

/**
 * Opens the popup at a city (if any).
 * NOTE: addTo on an open popup removes it first, which would fire "close" and clear the selection
 */
function show(map: mapboxgl.Map, popup: mapboxgl.Popup, selected: Capital | undefined) {
    if (!selected) {
        return;
    }

    popup.setLngLat(lngLat(selected));

    if (!popup.isOpen()) {
        popup.addTo(map);
    }
}

/**
 * Right-click proposes a city (only on Earth: added on each load of a Mapbox style, removed before a switch):
 * on a place label of Mapbox Standard (featureset `place-labels`) with its name, elsewhere the point itself.
 * NOTE: the interaction on the label stops the event, so the one without target only handles the rest
 */
function listen(map: mapboxgl.Map) {
    unlisten(map);

    map.addInteraction(PROPOSE.label, {
        type: "contextmenu",
        target: { featuresetId: "place-labels", importId: "basemap" },
        handler: (event) => {
            const { feature } = event;
            const name = feature?.properties.name;

            if (feature?.geometry.type !== "Point" || typeof name !== "string") {
                return false;
            }

            const [longitude, latitude] = feature.geometry.coordinates;
            proposeAt(map, { name, latitude, longitude });
        },
    });

    map.addInteraction(PROPOSE.point, {
        type: "contextmenu",
        handler: (event) => proposeAt(map, { latitude: event.lngLat.lat, longitude: event.lngLat.lng }),
    });
}

function unlisten(map: mapboxgl.Map) {
    map.removeInteraction(PROPOSE.label);
    map.removeInteraction(PROPOSE.point);
}

function proposeAt(map: mapboxgl.Map, spot: Spot) {
    const { items, propose } = useCapitals.getState();
    const project = ({ longitude, latitude }: Spot) => map.project([longitude, latitude]);

    propose(snap(spot, places(items), project));
}

function lngLat({ longitude, latitude }: Spot): [number, number] {
    return [longitude, latitude];
}

/**
 * What decides the style: the basemap on Earth, otherwise the body.
 */
function keyOf({ body, style }: Pick<Appearance, "body" | "style">): string {
    return body === "earth" ? style : body;
}

/**
 * Style of the map: Mapbox Standard (or Satellite) on Earth, otherwise a globe with the texture of the body.
 */
function styleOf({ body, style }: Pick<Appearance, "body" | "style">): string | mapboxgl.StyleSpecification {
    const url = texture(body);

    if (url === undefined) {
        return STYLES[style];
    }

    // the texture is equirectangular, the image source spans the Web Mercator extent (slightly stretched to the poles)
    const top = 85.0511;

    return {
        version: 8,
        projection: { name: "globe" },
        fog: { color: "rgba(0, 0, 0, 0)", "space-color": "#000", "star-intensity": 0.6, "horizon-blend": 0.02 },
        sources: {
            body: {
                type: "image",
                url,
                coordinates: [
                    [-180, top],
                    [180, top],
                    [180, -top],
                    [-180, -top],
                ],
            },
        },
        layers: [
            { id: "space", type: "background", paint: { "background-color": "#000" } },
            { id: "body", type: "raster", source: "body" },
        ],
    };
}

/**
 * Sets light preset and theme of the `basemap` import of Mapbox Standard.
 */
function applyAppearance(map: mapboxgl.Map, { lightPreset, theme }: Pick<Appearance, "lightPreset" | "theme">) {
    map.setConfigProperty("basemap", "lightPreset", lightPreset);
    map.setConfigProperty("basemap", "theme", theme);
}

function paint(node: HTMLElement, item: Capital, selected: boolean) {
    // `color` as well, as the inner border of capitals uses `currentColor` (see .marker.capital)
    node.style.background = node.style.color = item.colour ?? DEFAULT_COLOUR;
    node.classList.toggle("capital", item.capital);
    node.classList.toggle("selected", selected);
    node.title = `${item.name}, ${item.country}`;
}
