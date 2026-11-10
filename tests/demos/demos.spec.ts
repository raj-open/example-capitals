/**
 * Captures the demos of the app (UI + API + DB) as WebP into /demos/img,
 * then the hero animation of the README (/demos/img/hero.webp, cf. /tests/demos/hero.ts)
 * and the social preview of the repo (/demos/img/social-preview.jpg, 2560 × 1280, under 1 MB as GitHub asks).
 *
 * - only reads data: nothing is created, changed or deleted (the DB needs capitals, e.g. from the import)
 * - examples only from Great Britain, the Nordic countries (incl. Greenland) and East Asia
 * - WebP stills are encoded by the browser itself (canvas); the animation needs ffmpeg (else its frames are kept)
 * - the hero starts with the cover (= the social preview, at the size of the frames), then the scenes in HERO
 * - runs in order (serial): the last test composes from the screenshots before it
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, expect, type Page, type PageScreenshotOptions, test } from "@playwright/test";

import { encode, encoder, HOLDS_FILE, PATH_FRAMES } from "./hero.ts";

// ----------------------------------------------------------------
// LOCAL CONSTANTS
// ----------------------------------------------------------------

const OUTPUT = new URL("../../demos/img/", import.meta.url);
const ICON = new URL("../../frontend/assets/favicon.svg", import.meta.url);

/** time for the map to fly somewhere and load its tiles */
const SETTLE = 4_000;

const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** scenes of the hero after the cover, in order: screenshot → seconds shown ("phones" is composed of both phone shots) */
const HERO: Record<string, number> = { overview: 2.5, search: 2, edit: 2, day: 2, settings: 2, phones: 2.5 };
const COVER_HOLD = 3;

// ----------------------------------------------------------------
// DEMOS
// ----------------------------------------------------------------

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
    rmSync(PATH_FRAMES, { recursive: true, force: true });
    mkdirSync(PATH_FRAMES, { recursive: true });
});

test.describe("desktop", () => {
    test.use(DESKTOP);

    test("overview: list next to the map, a capital selected with its popup", async ({ page, browser }) => {
        await open(page);
        await choose(page, "London");
        await save(browser, page, "overview");
    });

    test("search: by country and city, matches only", async ({ page, browser }) => {
        await open(page);
        await page.getByRole("searchbox", { name: "Search by country" }).fill("korea");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(SETTLE);
        await save(browser, page, "search");
    });

    test("edit: form of a capital (not submitted)", async ({ page, browser }) => {
        await open(page);
        await choose(page, "Nuuk");
        await page.getByRole("button", { name: "Edit Nuuk" }).click();
        // the form opens in place of the entry, which may sit at the edge of the list
        await page.locator(".sidebar .capital-form").evaluate((node) => node.scrollIntoView({ block: "center" }));
        await page.waitForTimeout(500);
        await save(browser, page, "edit");
    });

    test("daylight: another light preset of the map", async ({ page, browser }) => {
        await open(page);
        await page.getByRole("button", { name: "Settings" }).click();
        await page.getByRole("button", { name: "day", exact: true }).click();
        await page.getByRole("button", { name: "Settings" }).click();
        await choose(page, "Tokyo");
        await save(browser, page, "day");
    });

    test("settings: world, basemap, light, theme and number format", async ({ page, browser }) => {
        await open(page);
        await page.getByRole("button", { name: "Settings" }).click();
        await page.waitForTimeout(500);
        await save(browser, page, "settings");
    });
});

test.describe("phone", () => {
    test.use(PHONE);

    test("phone: map above the list", async ({ page, browser }) => {
        await open(page);
        await choose(page, "Oslo", true);
        await save(browser, page, "phone");
    });

    test("phone: list collapsed to a bar", async ({ page, browser }) => {
        await open(page);
        await choose(page, "Seoul", true);
        await page.getByRole("button", { name: "Hide list" }).tap();
        await page.waitForTimeout(SETTLE);
        await save(browser, page, "phone-map");
    });
});

test("hero and social preview", async ({ browser }) => {
    const { width, height } = DESKTOP.viewport;

    await render(browser, phones(width, height), width, height, { path: frame("phones") });
    await render(browser, cover(width, height), width, height, { path: join(PATH_FRAMES, "00-cover.png") });
    await render(browser, cover(1280, 640), 1280, 640, {
        path: fileOf("social-preview.jpg"),
        type: "jpeg",
        quality: 90,
    });

    const holds = [COVER_HOLD, ...Object.values(HERO)];
    writeFileSync(join(PATH_FRAMES, HOLDS_FILE), `${JSON.stringify(holds)}\n`);

    if (encoder() !== "") {
        encode();
    } else {
        console.log(
            `no ffmpeg with libwebp: frames kept in ${PATH_FRAMES} (join them with \`node tests/demos/hero.ts\`)`,
        );
    }
});

// ----------------------------------------------------------------
// AUXILIARY METHODS: APP
// ----------------------------------------------------------------

/** opens the app and waits for the list and the markers on the map */
async function open(page: Page) {
    await page.goto("/");
    await expect(page.locator(".mapboxgl-canvas"), "map missing: is VITE_MAPBOX_TOKEN set?").toBeVisible();
    await expect(page.locator(".marker").first(), "no capitals: fill the DB first").toBeVisible();
    await page.waitForTimeout(SETTLE);
}

/** selects a city via the list (searching for it first) and waits for the map to arrive there */
async function choose(page: Page, name: string, touch = false) {
    const search = page.getByRole("searchbox", { name: /^Search by (capital|city)$/ });
    await search.fill(name);

    const entry = page.locator(".sidebar .entry", { hasText: name }).first();
    await (touch ? entry.tap() : entry.click());
    await search.fill("");
    await search.blur();

    await expect(page.locator(".mapboxgl-popup")).toBeVisible();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(SETTLE);
}

// ----------------------------------------------------------------
// AUXILIARY METHODS: FILES
// ----------------------------------------------------------------

/** takes a screenshot of the page, saves it as WebP and, if a scene of the hero, as its frame */
async function save(browser: Browser, page: Page, name: string, quality = 0.85) {
    const png = await page.screenshot();

    if (name in HERO) {
        writeFileSync(frame(name), png);
    }

    const encoder = await browser.newPage();
    const url = await encoder.evaluate(
        async ({ data, quality }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${data}`;
            await image.decode();

            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext("2d")?.drawImage(image, 0, 0);
            return canvas.toDataURL("image/webp", quality);
        },
        { data: png.toString("base64"), quality },
    );

    await encoder.close();
    writeFileSync(fileOf(`${name}.webp`), Buffer.from(url.split(",")[1], "base64"));
}

/** path of the frame of a scene of the hero (numbered in order, after the cover) */
function frame(name: string): string {
    const index = Object.keys(HERO).indexOf(name) + 1;
    return join(PATH_FRAMES, `${String(index).padStart(2, "0")}-${name}.png`);
}

/** path of a file in /demos/img */
function fileOf(name: string): string {
    return fileURLToPath(new URL(name, OUTPUT));
}

/** data URL of a file in /demos/img */
function image(name: string): string {
    return `data:image/webp;base64,${readFileSync(new URL(name, OUTPUT)).toString("base64")}`;
}

// ----------------------------------------------------------------
// AUXILIARY METHODS: COMPOSITIONS
// ----------------------------------------------------------------

/** renders a page (at twice the pixels, for a sharp result) and screenshots it */
async function render(browser: Browser, html: string, width: number, height: number, options: PageScreenshotOptions) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => Promise.all([...document.images].map((node) => node.decode())));
    await page.screenshot(options);
    await context.close();
}

/** shared style: a calm dark page in the colours of the icon */
function page(width: number, height: number, style: string, body: string): string {
    return `<!doctype html>
<html lang="en-GB">
  <style>
    body {
      position: relative;
      margin: 0;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: radial-gradient(120% 120% at 0% 0%, #1b4f8f 0%, #0b2547 55%, #071a33 100%);
      color: #fff;
      font-family: system-ui, sans-serif;
    }
    .shot {
      position: absolute;
      border: 1px solid rgb(255 255 255 / 18%);
      box-shadow: 0 24px 60px rgb(0 0 0 / 55%);
      object-fit: cover;
      object-position: left top;
    }
    .phone { width: 214px; height: 463px; border: 6px solid #0d1117; border-radius: 34px; }
    ${style}
  </style>
  ${body}
</html>`;
}

/** cover (social preview, first frame of the hero): name and stack on the left, desktop and phone on the right; centred in any size */
function cover(width: number, height: number): string {
    const icon = `data:image/svg+xml;base64,${readFileSync(ICON).toString("base64")}`;

    return page(
        width,
        height,
        `
    .stage { position: absolute; left: 50%; top: 50%; width: 1280px; height: 640px; transform: translate(-50%, -50%); }
    .text {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 72px;
      width: 420px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 20px;
    }
    .text img { width: 88px; height: 88px; }
    h1 { margin: 0; font-size: 60px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
    p { margin: 0; color: #c4d4ea; font-size: 24px; line-height: 1.35; }
    .stack { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .stack span {
      padding: 6px 12px;
      border: 1px solid rgb(255 255 255 / 25%);
      border-radius: 999px;
      color: #e3ecf8;
      font-size: 16px;
    }
    .desktop { top: 92px; left: 590px; width: 820px; height: 512px; border-radius: 14px; }
    .stage .phone { top: 150px; left: 520px; }`,
        `<div class="stage">
    <div class="text">
      <img src="${icon}" alt="" />
      <h1>Capital Cities</h1>
      <p>The capitals of the world on a map: list, search, add, edit and delete.</p>
      <div class="stack"><span>React</span><span>TypeScript</span><span>Express</span><span>MongoDB</span><span>Mapbox</span></div>
    </div>
    <img class="shot desktop" src="${image("overview.webp")}" alt="" />
    <img class="shot phone" src="${image("phone.webp")}" alt="" />
  </div>`,
    );
}

/** scene of the hero: both phone shots side by side, with a caption */
function phones(width: number, height: number): string {
    return page(
        width,
        height,
        `
    .row { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; gap: 72px; }
    .row .shot { position: static; width: 300px; height: 649px; }
    .caption { position: absolute; left: 0; right: 0; bottom: 28px; color: #c4d4ea; font-size: 22px; text-align: center; }`,
        `<div class="row">
    <img class="shot phone" src="${image("phone.webp")}" alt="" />
    <img class="shot phone" src="${image("phone-map.webp")}" alt="" />
  </div>
  <div class="caption">On phones: the list below the map, collapsible to a bar</div>`,
    );
}
