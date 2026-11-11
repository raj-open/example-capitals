/**
 * Map with one 32px × 32px square marker per capital,
 * shrinking when zoomed out (see /frontend/src/utils/markers.ts).
 *
 * Clicking a marker selects its capital (GET /capital/{name});
 * the map then flies to the selected capital and opens a popup to change the colour of its marker.
 * On Earth, a city can be proposed to add: over a city (a place label of the map or a known place,
 * see /frontend/src/utils/snap.ts) the cursor is a crosshair with a hint, and a click adds it;
 * anywhere, right-click or long-press opens a menu "Add a city here" (the point itself);
 * a pin marks the spot and the form in the sidebar opens, prefilled;
 * a stored city (its marker, or next to it: hint "Edit …") is selected and opened in the sidebar to edit instead.
 * The appearance (basemap, light preset, theme) follows the map store (/frontend/src/store/map.ts),
 * chosen via the settings button on the map.
 * Limited to some countries (see the list), only their markers are shown and the map fits them.
 * The view on Earth is remembered (see /frontend/src/store/view.ts): a reload, or a return from another world, keeps it.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import type { Capital } from "../../@api/types.gen.ts";
import { places } from "../data/places.ts";
import { DEFAULT_COLOUR, selectingOf, useCapitals, visible } from "../store/capital.ts";
import type { Appearance } from "../store/map.ts";
import { STYLES, texture, useMapStyle } from "../store/map.ts";
import type { View } from "../store/view.ts";
import { useView } from "../store/view.ts";
import { countryName } from "../utils/countries.ts";
import { markerSize } from "../utils/markers.ts";
import type { Spot } from "../utils/snap.ts";
import { point, snap } from "../utils/snap.ts";
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

/** long-press (ms) and how far (px) the finger may move meanwhile */
const PRESS = 500;
const SLOP = 10;

/** the place labels of Mapbox Standard */
const LABELS = { featuresetId: "place-labels", importId: "basemap" };

/** `capital` of a place label (Mapbox Streets tileset) for the capital of a country */
const NATIONAL_CAPITAL = 2;

/** classes of place labels which are not cities (as in the Mapbox Streets tileset) */
const NOT_CITIES = new Set(["country", "disputed_country", "state", "disputed_state", "settlement_subdivision"]);

// ----------------------------------------------------------------
// COMPONENTS
// ----------------------------------------------------------------

export function MapView() {
    const items = useCapitals((state) => state.items);
    const selected = useCapitals((state) => state.selected);
    const selection = useCapitals((state) => state.selection);
    const countries = useCapitals((state) => state.countries);
    const shown = useMemo(() => visible(items, countries), [items, countries]);
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
    const hint = useRef(new mapboxgl.Popup({ offset: 12, closeButton: false, closeOnClick: false, className: "hint" }));
    const menu = useRef(new mapboxgl.Popup({ offset: 4, closeButton: false, closeOnMove: true, className: "menu" }));
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
        const { body } = useMapStyle.getState();
        map.current = new mapboxgl.Map({
            container: element.current,
            style: styleOf(useMapStyle.getState()),
            // labels (and so the names of cities added from them) in English, not in the local script
            language: "en",
            ...(body === "earth" ? viewOf(useView.getState()) : {}),
        });

        popup.current.setDOMContent(content.current);
        // closing the popup drops the focus only (the selection stays)
        popup.current.on("close", () => useCapitals.getState().blur());

        const target = map.current;

        // ---- adding (on Earth) ----

        // over a city (snapped): crosshair and a hint, a click adds it (a stored one: pointer, a click edits it);
        // anywhere: right-click or long-press opens a menu to add a city at the point
        let cursor: mapboxgl.Point | undefined;
        let opened = 0;

        const hover = () => {
            const spot = ready.current && cursor ? spotAt(target, cursor) : undefined;
            const stored = spot?.id !== undefined;
            target.getCanvas().style.cursor = spot ? (stored ? "pointer" : "crosshair") : "";

            if (!spot) {
                hint.current.remove();
                return;
            }

            const label = [spot.name, spot.country].filter(Boolean).join(", ");
            hint.current.setLngLat(lngLat(spot)).setText(stored ? `Edit ${label}…` : `Add ${label}`);

            if (!hint.current.isOpen()) {
                hint.current.addTo(target);
            }
        };

        const open = (at: mapboxgl.LngLat) => {
            if (!ready.current) {
                return;
            }

            hint.current.remove();
            opened = Date.now();
            const item = document.createElement("button");
            item.type = "button";
            item.textContent = "Add a city here";
            item.addEventListener("click", () => {
                menu.current.remove();
                propose(point({ latitude: at.lat, longitude: at.lng }));
            });
            menu.current.setLngLat(at).setDOMContent(item);

            if (!menu.current.isOpen()) {
                menu.current.addTo(target);
            }
        };

        // a click on the map itself (not on a marker or the popup) deselects, which closes the popup;
        // on a city it adds the city (not right after a long-press, whose release may count as a click)
        target.on("click", (event) => {
            if (event.originalEvent.target !== target.getCanvas() || Date.now() - opened < PRESS) {
                return;
            }

            select();
            const spot = ready.current ? spotAt(target, event.point) : undefined;

            if (spot) {
                propose(spot);
            }
        });

        target.on("mousemove", (event) => {
            cursor = event.originalEvent.buttons === 0 ? event.point : undefined;
            hover();
        });
        target.on("mouseout", () => {
            cursor = undefined;
            hover();
        });
        target.on("contextmenu", (event) => open(event.lngLat));

        // long-press (touch): one finger, held still
        let press: ReturnType<typeof setTimeout> | undefined;
        let start: mapboxgl.Point | undefined;

        const release = () => {
            clearTimeout(press);
            start = undefined;
        };

        target.on("touchstart", (event) => {
            release();

            if (event.originalEvent.touches.length === 1) {
                const { lngLat } = event;
                start = event.point;
                press = setTimeout(() => open(lngLat), PRESS);
            }
        });
        target.on("touchmove", (event) => {
            if (start && event.point.dist(start) > SLOP) {
                release();
            }
        });
        target.on("touchend", release);
        target.on("touchcancel", release);

        // marker size via a CSS variable, so markers need no update of their own

        // remember the view on Earth (not during a flyby or on another world)
        target.on("moveend", () => {
            if (ready.current && !travelling.current) {
                useView.getState().set(viewOf(target));
            }
        });

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
            }
        });

        return () => {
            release();
            observer.disconnect();
            map.current?.remove();
        };
    }, [select, propose]);

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
            target.getCanvas().style.cursor = "";
            hint.current.remove();
            menu.current.remove();
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

        // back on Earth: arrive at the selected city (and open its popup), otherwise at the remembered view
        const arrival = () => {
            const { selected } = useCapitals.getState();

            if (other) {
                return undefined;
            }

            return selected ? { center: lngLat(selected), zoom: ZOOM } : viewOf(useView.getState());
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

        const ids = new Set(shown.map(({ id }) => id));

        for (const [id, marker] of markers.current) {
            if (!ids.has(id)) {
                marker.remove();
                markers.current.delete(id);
            }
        }

        for (const item of shown) {
            let marker = markers.current.get(item.id);

            if (!marker) {
                const node = document.createElement("div");
                node.className = "marker";
                // as next to it: select and edit; with Ctrl/Cmd or Shift: add to the selection (see the list)
                node.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const how = selectingOf(event);

                    if (how === "only") {
                        propose(item);
                    } else {
                        select(item.id, how);
                    }
                });

                marker = new mapboxgl.Marker({ element: node })
                    .setLngLat([item.longitude, item.latitude])
                    .addTo(target);
                markers.current.set(item.id, marker);
            }

            marker.setLngLat([item.longitude, item.latitude]);
            paint(marker.getElement(), item, selection.includes(item.id));
        }
    }, [shown, selection, propose, select]);

    // limited to some countries: fit the map to their cities
    useEffect(() => {
        const target = map.current;
        const { items } = useCapitals.getState();
        const cities = visible(items, countries);

        if (!target || !ready.current || countries.length === 0 || cities.length === 0) {
            return;
        }

        const bounds = new mapboxgl.LngLatBounds();

        for (const city of cities) {
            bounds.extend(lngLat(city));
        }

        target.fitBounds(bounds, { padding: 80, maxZoom: ZOOM });
    }, [countries]);

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
    arrival: () => (Pick<View, "center" | "zoom"> & Partial<View>) | undefined,
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

                const destination = arrival() ?? { center: [lng, 0] as [number, number], zoom: 1.5 };
                const { center } = destination;
                map.jumpTo({ center: [center[0] - 150, 25], zoom: 0, bearing: -35 });
                container.classList.remove("travelling");
                map.flyTo({ bearing: 0, ...destination, duration: ARRIVAL, curve: 1.2, essential: false });
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
 * The snappable spot at a point of the screen (see /frontend/src/utils/snap.ts), if any:
 * a place label of Mapbox Standard (featureset `place-labels`, not of countries, states or districts),
 * or a known place nearby.
 */
function spotAt(map: mapboxgl.Map, at: mapboxgl.Point): Spot | undefined {
    const { items } = useCapitals.getState();
    const project = ({ longitude, latitude }: Spot) => map.project([longitude, latitude]);
    const known = places(items);
    const label = map.queryRenderedFeatures(at, { target: LABELS }).find(isCity);
    const { lng, lat } = map.unproject(at);
    let spot: Spot = { latitude: lat, longitude: lng };

    if (label?.geometry.type === "Point") {
        const [longitude, latitude] = label.geometry.coordinates;
        const { iso_3166_1: code, capital } = tileProperties(label);

        spot = {
            name: String(label.properties?.name),
            latitude,
            longitude,
            country:
                typeof code === "string" ? countryName(code, new Set(known.map(({ country }) => country))) : undefined,
            capital: capital === NATIONAL_CAPITAL,
        };
    }

    const result = snap(spot, known, project);
    return result.name === undefined ? undefined : result;
}

/**
 * All properties of a place label in its tile (the featureset only offers `name` and `class`),
 * e.g. `iso_3166_1` (country code) and `capital` (2: of a country), as in the Mapbox Streets tileset.
 * NOTE: `_vectorTileFeature` is internal to mapbox-gl; without it, the label only gives its name
 */
function tileProperties(feature: object): { [key: string]: unknown } {
    const tile = (feature as { _vectorTileFeature?: { properties?: { [key: string]: unknown } } })._vectorTileFeature;
    return tile?.properties ?? {};
}

/**
 * Whether a place label is of a city (or town, village); its class is not documented, so only others are excluded.
 */
function isCity({ properties }: { properties?: { [key: string]: unknown } | null }): boolean {
    return typeof properties?.name === "string" && !NOT_CITIES.has(String(properties.class));
}

/**
 * The view of a map, or the view to restore (from the store).
 */
function viewOf(source: mapboxgl.Map | View): View {
    if (source instanceof mapboxgl.Map) {
        const { lng, lat } = source.getCenter();
        return { center: [lng, lat], zoom: source.getZoom(), bearing: source.getBearing(), pitch: source.getPitch() };
    }

    const { center, zoom, bearing, pitch } = source;
    return { center, zoom, bearing, pitch };
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
