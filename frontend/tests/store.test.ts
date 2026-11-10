// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api/capital.ts";
import { useCapitals } from "../src/store/capital.ts";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

vi.mock("../src/api/capital.ts");

describe("useCapitals", () => {
    beforeEach(() => {
        useCapitals.setState({ items: [], colours: {}, error: undefined });
    });

    it("loads items", async () => {
        const items = [{ id: "1", name: "Paris", country: "France", latitude: 48.86, longitude: 2.35 }];
        vi.mocked(api.list).mockResolvedValue(items);

        await useCapitals.getState().load();
        expect(useCapitals.getState().items).toEqual(items);
    });

    it("records errors", async () => {
        vi.mocked(api.list).mockRejectedValue(new Error("offline"));

        await useCapitals.getState().load();
        expect(useCapitals.getState().error).toContain("offline");
    });

    it("sets colours", () => {
        useCapitals.getState().setColour("1", "#ff0000");
        expect(useCapitals.getState().colours).toEqual({ "1": "#ff0000" });
    });
});
