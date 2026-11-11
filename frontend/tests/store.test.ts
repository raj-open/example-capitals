// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../src/api/capital.ts";
import { NEW, selectingOf, useCapitals, visible } from "../src/store/capital.ts";
import { useSettings } from "../src/store/settings.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

vi.mock("../src/api/capital.ts");

describe("useCapitals", () => {
    beforeEach(() => {
        useCapitals.setState({
            items: [],
            selected: undefined,
            selection: [],
            anchor: undefined,
            countries: [],
            draft: undefined,
            editing: undefined,
            error: undefined,
        });
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

    it("adds an ordinary city via /city even with capitals only, without listing it", async () => {
        const lyon = { id: "2", name: "Lyon", country: "France", latitude: 45.76, longitude: 4.84, capital: false };
        vi.mocked(api.create).mockClear().mockResolvedValue(lyon);

        const { id: _, ...input } = lyon;
        expect(await useCapitals.getState().add(input)).toEqual(lyon);
        expect(api.create).toHaveBeenCalledWith("city", input);
        expect(useCapitals.getState().items).toEqual([]);
    });

    it("proposes a new city and withdraws it", () => {
        const draft = { name: "Lyon", country: "France", latitude: 45.76, longitude: 4.84 };

        useCapitals.getState().propose(draft);
        expect(useCapitals.getState().draft).toEqual(draft);
        expect(useCapitals.getState().editing).toBe(NEW);

        useCapitals.getState().propose();
        expect(useCapitals.getState().draft).toBeUndefined();
        expect(useCapitals.getState().editing).toBeUndefined();
    });

    it("drops the draft when another form opens", () => {
        useCapitals.getState().propose({ latitude: 0, longitude: 0 });
        useCapitals.getState().setEditing("1");

        expect(useCapitals.getState().draft).toBeUndefined();
        expect(useCapitals.getState().editing).toBe("1");
    });

    it("selects a stored city and opens it to edit instead of proposing it", async () => {
        const paris = { id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35, capital: true };
        vi.mocked(api.get).mockResolvedValue(paris);
        useCapitals.setState({ draft: { latitude: 0, longitude: 0 } });

        useCapitals.getState().propose(paris);
        await vi.waitFor(() => expect(useCapitals.getState().selected).toEqual(paris));
        expect(useCapitals.getState().draft).toBeUndefined();
        expect(useCapitals.getState().editing).toBe("1");
    });

    // ---- several selected ----

    describe("selection", () => {
        const city = (id: string) => ({ id, name: id, country: "X", latitude: 0, longitude: 0, capital: false });
        const ORDER = ["a", "b", "c", "d"];

        beforeEach(() => {
            useCapitals.setState({ items: ORDER.map(city) });
            vi.mocked(api.get).mockImplementation(async (_, id) => city(id));
        });

        it("selects one, toggles others, and a range from the last click without Shift", async () => {
            const { select } = useCapitals.getState();

            await select("b");
            await select("d", "toggle");
            expect(useCapitals.getState().selection).toEqual(["b", "d"]);
            expect(useCapitals.getState().selected?.id).toBe("d");

            await select("b", "toggle");
            expect(useCapitals.getState().selection).toEqual(["d"]);

            // from b (toggled last)
            await select("a", "range");
            expect(useCapitals.getState().selection).toEqual(["a", "b"]);

            await select("c");
            await select("a", "range", ["c", "a"]);
            expect(useCapitals.getState().selection).toEqual(["c", "a"]);
        });

        it("drops the focus of a city toggled off, and keeps the selection on blur", async () => {
            const { select } = useCapitals.getState();

            await select("a");
            await select("b", "toggle");
            await select("b", "toggle");
            expect(useCapitals.getState().selected).toBeUndefined();

            await select("c", "toggle");
            useCapitals.getState().blur();
            expect(useCapitals.getState().selected).toBeUndefined();
            expect(useCapitals.getState().selection).toEqual(["a", "c"]);

            await select();
            expect(useCapitals.getState().selection).toEqual([]);
        });

        it("selects all given, without focus", () => {
            useCapitals.getState().selectAll(["a", "c"]);
            expect(useCapitals.getState().selection).toEqual(["a", "c"]);
            expect(useCapitals.getState().selected).toBeUndefined();
        });

        it("deletes several; those deleted are gone even if one fails", async () => {
            useCapitals.setState({ selection: ["a", "b", "c"] });
            vi.mocked(api.remove).mockImplementation(async (_, id) => {
                if (id === "b") {
                    throw new Error("409");
                }
            });

            await expect(useCapitals.getState().removeMany(["a", "b", "c"])).rejects.toThrow("409");
            expect(useCapitals.getState().items.map(({ id }) => id)).toEqual(["b", "d"]);
            expect(useCapitals.getState().selection).toEqual(["b"]);
        });

        it("limits to countries (deselecting cities outside), and shows all again", () => {
            useCapitals.setState({
                items: [city("a"), { ...city("b"), country: "Y" }, { ...city("c"), country: "Z" }],
                selection: ["a", "b", "c"],
            });

            useCapitals.getState().showCountries(["X", "Y", "X"]);
            expect(useCapitals.getState().countries).toEqual(["X", "Y"]);
            expect(useCapitals.getState().selection).toEqual(["a", "b"]);
            expect(visible(useCapitals.getState().items, ["Y"]).map(({ id }) => id)).toEqual(["b"]);

            useCapitals.getState().showCountries([]);
            expect(visible(useCapitals.getState().items, []).length).toBe(3);
        });

        it("removes a colour (back to the default)", () => {
            vi.useFakeTimers();
            useCapitals.setState({ items: [{ ...city("a"), colour: "#00ff00" }] });

            useCapitals.getState().setColour("a", undefined);
            expect(useCapitals.getState().items[0].colour).toBeUndefined();
            vi.useRealTimers();
        });

        it.each([
            [{ ctrlKey: true, metaKey: false, shiftKey: false }, "toggle"],
            [{ ctrlKey: false, metaKey: true, shiftKey: true }, "toggle"],
            [{ ctrlKey: false, metaKey: false, shiftKey: true }, "range"],
            [{ ctrlKey: false, metaKey: false, shiftKey: false }, "only"],
        ])("modifiers %o → %s", (event, how) => {
            expect(selectingOf(event)).toBe(how);
        });
    });
});
