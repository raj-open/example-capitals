// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../src/api/capital.ts";
import { useCapitals } from "../src/store/capital.ts";
import { useSettings } from "../src/store/settings.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

vi.mock("../src/api/capital.ts");

describe("useCapitals", () => {
    beforeEach(() => {
        useCapitals.setState({ items: [], selected: undefined, draft: undefined, error: undefined });
        useSettings.setState({ capitalsOnly: true });
    });

    it("loads items", async () => {
        const items = [{ id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true }];
        vi.mocked(api.list).mockResolvedValue(items);

        await useCapitals.getState().load();
        expect(useCapitals.getState().items).toEqual(items);
    });

    it("records errors", async () => {
        vi.mocked(api.list).mockRejectedValue(new Error("offline"));

        await useCapitals.getState().load();
        expect(useCapitals.getState().error).toContain("offline");
    });

    it("selects via the GET endpoint and clears the selection", async () => {
        const item = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true };
        vi.mocked(api.get).mockResolvedValue(item);

        await useCapitals.getState().select("paris");
        expect(api.get).toHaveBeenCalledWith("capital", "paris");
        expect(useCapitals.getState().selected).toEqual(item);

        await useCapitals.getState().select();
        expect(useCapitals.getState().selected).toBeUndefined();
    });

    it("adds, edits and removes, keeping the order by country", async () => {
        const paris = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true };
        const berlin = { id: "2", name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.4, capital: true };
        const vienna = {
            id: "2",
            name: "Vienna",
            country: "Austria",
            latitude: 48.21,
            longitude: 16.37,
            capital: true,
        };
        useCapitals.setState({ items: [paris] });

        vi.mocked(api.create).mockResolvedValue(berlin);
        await useCapitals.getState().add(berlin);
        expect(useCapitals.getState().items).toEqual([paris, berlin]);

        useCapitals.setState({ selected: berlin });
        vi.mocked(api.update).mockResolvedValue(vienna);
        await useCapitals.getState().edit("2", vienna);
        expect(useCapitals.getState().items).toEqual([vienna, paris]);
        expect(useCapitals.getState().selected).toEqual(vienna);

        vi.mocked(api.remove).mockResolvedValue(undefined);
        await useCapitals.getState().remove("2");
        expect(useCapitals.getState()).toMatchObject({ items: [paris], selected: undefined });
    });

    it("sorts the capital first within a country", async () => {
        const lyon = { id: "3", name: "Lyon", country: "France", latitude: 45.76, longitude: 4.84, capital: false };
        const paris = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true };
        useCapitals.setState({ items: [lyon] });

        vi.mocked(api.create).mockResolvedValue(paris);
        await useCapitals.getState().add(paris);
        expect(useCapitals.getState().items).toEqual([paris, lyon]);
    });

    it("propagates errors of edits", async () => {
        vi.mocked(api.create).mockRejectedValue(new Error("409"));
        await expect(
            useCapitals.getState().add({ name: "x", country: "y", latitude: 0, longitude: 0, capital: true }),
        ).rejects.toThrow("409");
    });

    it("uses /capital or /city depending on the mode", async () => {
        vi.mocked(api.list).mockResolvedValue([]);

        useSettings.setState({ capitalsOnly: true });
        await useCapitals.getState().load();
        expect(api.list).toHaveBeenLastCalledWith("capital");

        useSettings.setState({ capitalsOnly: false });
        await useCapitals.getState().load();
        expect(api.list).toHaveBeenLastCalledWith("city");
    });

    it("deselects a city which is no longer listed", async () => {
        const osaka = { id: "2", name: "Osaka", country: "Japan", latitude: 34.69, longitude: 135.5, capital: false };
        useCapitals.setState({ selected: osaka });
        vi.mocked(api.list).mockResolvedValue([]);

        await useCapitals.getState().load();
        expect(useCapitals.getState().selected).toBeUndefined();
    });

    it("shows a colour at once and saves it once after a delay", async () => {
        vi.useFakeTimers();
        const paris = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true };
        useCapitals.setState({ items: [paris], selected: paris });
        vi.mocked(api.update).mockClear().mockResolvedValue(paris);

        useCapitals.getState().setColour("1", "#00ff00");
        useCapitals.getState().setColour("1", "#ff0000");
        expect(useCapitals.getState().items[0].colour).toBe("#ff0000");
        expect(useCapitals.getState().selected?.colour).toBe("#ff0000");
        expect(api.update).not.toHaveBeenCalled();

        await vi.runAllTimersAsync();
        expect(api.update).toHaveBeenCalledTimes(1);
        expect(api.update).toHaveBeenCalledWith("capital", "1", {
            name: "Paris",
            country: "France",
            latitude: 48.86,
            longitude: 2.35,
            capital: true,
            colour: "#ff0000",
        });
        vi.useRealTimers();
    });

    it("proposes a new city and withdraws it", () => {
        const draft = { name: "Lyon", country: "France", latitude: 45.76, longitude: 4.84 };

        useCapitals.getState().propose(draft);
        expect(useCapitals.getState().draft).toEqual(draft);

        useCapitals.getState().propose();
        expect(useCapitals.getState().draft).toBeUndefined();
    });

    it("selects a stored city instead of proposing it", async () => {
        const paris = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true };
        vi.mocked(api.get).mockResolvedValue(paris);
        useCapitals.setState({ draft: { latitude: 0, longitude: 0 } });

        useCapitals.getState().propose(paris);
        await vi.waitFor(() => expect(useCapitals.getState().selected).toEqual(paris));
        expect(useCapitals.getState().draft).toBeUndefined();
    });
});
