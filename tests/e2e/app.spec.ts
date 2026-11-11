// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

/**
 * made-up capital in the open South Atlantic (visible on load, no neighbours close by);
 * the tests share the database with `just dev`, so only these are created, and removed before and after each test
 */
const COUNTRY = "E2E Testland";
const NAME = "E2E Testtown";
const RENAMED = "E2E Testville";
const PLACE = { latitude: -20, longitude: 0 };

// ----------------------------------------------------------------
// HOOKS
// ----------------------------------------------------------------

test.beforeEach(async ({ request }) => cleanUp(request));
test.afterEach(async ({ request }) => cleanUp(request));

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

test("shows the list of capitals", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Capital Cities");
    await expect(page.getByRole("heading", { name: "Capitals" })).toBeVisible();
});

test("shows a 32px × 32px marker per capital, with a popup (colour, delete) and its form to edit", async ({
    page,
    request,
}) => {
    const response = await request.post("/api/capital", { data: { name: NAME, country: COUNTRY, ...PLACE } });
    expect(response.status()).toBe(201);
    const { id } = await response.json();

    await page.goto("/");
    const marker = page.locator(`.marker[title="${NAME}, ${COUNTRY}"]`);
    await marker.click();

    // the map flies there (close up: 32px), the popup opens (not the hint or the menu, also popups of mapbox-gl)
    const popup = page.locator(".mapboxgl-popup", { has: page.locator(".popup") });
    await expect(popup).toContainText(`${NAME}, ${COUNTRY}`);

    // the sidebar opens the city to edit
    const form = page.locator(".sidebar .capital-form");
    await expect(form.getByRole("textbox", { name: "City" })).toHaveValue(NAME);
    await expect.poll(async () => (await marker.boundingBox())?.width, { timeout: 10_000 }).toBeCloseTo(32, 0);
    expect((await marker.boundingBox())?.height).toBeCloseTo(32, 0);

    // colour: on the marker at once, saved shortly after
    await popup.locator('input[type="color"]').fill("#00aa55");
    await expect(marker).toHaveCSS("background-color", "rgb(0, 170, 85)");
    await expect
        .poll(async () => (await (await request.get(`/api/capital/${id}`)).json()).colour, { timeout: 5_000 })
        .toBe("#00aa55");

    // delete from the popup: gone from the map and the list
    page.once("dialog", (dialog) => dialog.accept());
    await popup.getByRole("button", { name: `Delete ${NAME}` }).click();
    await expect(marker).toHaveCount(0);
    await expect(page.locator(".sidebar .entry", { hasText: NAME })).toHaveCount(0);
    await expect(form).toHaveCount(0);
});

test("adds, edits and deletes a capital", async ({ page }) => {
    await page.goto("/");

    // add
    await page.getByRole("button", { name: "Add capital" }).click();
    await fillForm(page, { country: COUNTRY, name: NAME, latitude: "-20", longitude: "0" });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.locator(".sidebar .entry", { hasText: NAME })).toBeVisible();
    await expect(page.locator(`.marker[title="${NAME}, ${COUNTRY}"]`)).toHaveCount(1);

    // edit
    await page.getByRole("button", { name: `Edit ${NAME}` }).click();
    await page.getByRole("textbox", { name: "City" }).fill(RENAMED);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator(".sidebar .entry", { hasText: RENAMED })).toBeVisible();
    await expect(page.locator(`.marker[title="${RENAMED}, ${COUNTRY}"]`)).toHaveCount(1);

    // delete (from the list)
    page.once("dialog", (dialog) => dialog.accept());
    await page
        .locator(".sidebar")
        .getByRole("button", { name: `Delete ${RENAMED}` })
        .click();
    await expect(page.locator(".sidebar .entry", { hasText: RENAMED })).toHaveCount(0);
    await expect(page.locator(`.marker[title="${RENAMED}, ${COUNTRY}"]`)).toHaveCount(0);
});

test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test("shows the map above the list, without horizontal scrolling", async ({ page }) => {
        await page.goto("/");
        const list = page.locator(".sidebar");
        const map = page.locator(".map");
        await expect(list).toBeVisible();

        const above = await map.boundingBox();
        const below = await list.boundingBox();
        expect(above && below && above.y + above.height <= below.y + 1).toBe(true);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);
    });

    test("collapses the list to a bar and opens it again", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "Hide list" }).tap();
        await page.getByRole("button", { name: "Show list" }).tap();
        await expect(page.getByRole("heading", { name: "Capitals" })).toBeVisible();
    });
});

// ----------------------------------------------------------------
// AUXILIARY METHODS
// ----------------------------------------------------------------

/** removes the made-up capitals (via the API, as proxied by the UI's dev server) */
async function cleanUp(request: APIRequestContext) {
    for (const name of [NAME, RENAMED]) {
        const response = await request.get(`/api/capital/${encodeURIComponent(name)}`);

        if (response.ok()) {
            const { id } = await response.json();
            await request.delete(`/api/capital/${id}`);
        }
    }
}

async function fillForm(page: Page, fields: { country: string; name: string; latitude: string; longitude: string }) {
    const form = page.locator(".sidebar .capital-form");
    await form.getByRole("textbox", { name: "Country" }).fill(fields.country);
    await form.getByRole("textbox", { name: "City" }).fill(fields.name);
    await form.getByRole("textbox", { name: "Latitude" }).fill(fields.latitude);
    await form.getByRole("textbox", { name: "Longitude" }).fill(fields.longitude);
}
