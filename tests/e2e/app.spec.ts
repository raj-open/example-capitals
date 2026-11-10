// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { expect, test } from "@playwright/test";

// ----------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------

test("shows the list of capitals", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Capital Cities");
    await expect(page.getByRole("heading", { name: "Capitals" })).toBeVisible();
});

test.fixme("shows a 32px × 32px marker per capital, with a popup to change its colour", async () => {});

test.fixme("adds, edits and deletes a capital", async () => {});
