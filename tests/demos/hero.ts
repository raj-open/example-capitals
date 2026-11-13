/**
 * Hero animation for the README (/demos/img/hero.webp): frames (PNG, in name order) held for their own time,
 * cross-faded, the last fading back into the first (seamless loop).
 * Needs ffmpeg (with libwebp) on the PATH; without it the frames are kept (join them later with `node tests/demos/hero.ts`).
 *
 * NOTE: animated WebP, as GitHub shows it as an image (a video in the repo shows only as a link); much smaller than a GIF.
 */

// ----------------------------------------------------------------
// IMPORTS
// ----------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ----------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

export const PATH_FRAMES = join(ROOT, ".cache/demos/hero");
export const PATH_HERO = join(ROOT, "demos/img/hero.webp");

/** seconds per frame (a list beside the frames; else HOLD for all) */
export const HOLD = 2.0;
export const HOLDS_FILE = "holds.json";

const FADE = 0.3;
const FPS = 10;
const WIDTH = 1120;

// ----------------------------------------------------------------
// METHODS
// ----------------------------------------------------------------

/** encoder of ffmpeg for animated WebP: libwebp_anim (frame differences, small), else libwebp; none: "" */
export function encoder(): string {
    try {
        const list = execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" });
        return ["libwebp_anim", "libwebp"].find((name) => new RegExp(`\\b${name}\\b`).test(list)) ?? "";
    } catch {
        return "";
    }
}

/** joins the frames of a folder into the animation */
export function encode(dir: string = PATH_FRAMES, out: string = PATH_HERO) {
    const frames = readdirSync(dir)
        .filter((name) => name.endsWith(".png"))
        .sort()
        .map((name) => join(dir, name));

    if (frames.length < 2) {
        throw new Error(`too few frames in ${dir}`);
    }

    const codec = encoder();

    if (codec === "") {
        throw new Error("no ffmpeg with libwebp on the PATH");
    }

    const file = join(dir, HOLDS_FILE);
    const given: unknown = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
    const holds =
        Array.isArray(given) && given.length === frames.length && given.every((x) => typeof x === "number" && x > 0)
            ? (given as number[])
            : frames.map(() => HOLD);

    // the first again at the end, shown only while fading in: the loop starts over seamlessly
    const all = [...frames, frames[0]];
    const last = all.length - 1;
    const inputs = all.flatMap((frame, i) => [
        "-loop",
        "1",
        "-t",
        String(i === last ? FADE : holds[i] + FADE),
        "-i",
        frame,
    ]);
    const ends = holds.map((_, i) => holds.slice(0, i + 1).reduce((a, b) => a + b, 0));

    // each input scaled, at the same rate; then cross-faded in turn (the k-th fade starts at the end of the k-th hold)
    const scaled = all.map((_, i) => `[${i}:v]scale=${WIDTH}:-2:flags=lanczos,fps=${FPS},settb=AVTB[s${i}]`);
    const fades = all.slice(1).map((_, k) => {
        const from = k === 0 ? "[s0]" : `[f${k}]`;
        return `${from}[s${k + 1}]xfade=transition=fade:duration=${FADE}:offset=${ends[k].toFixed(2)}[f${k + 1}]`;
    });

    mkdirSync(dirname(out), { recursive: true });
    execFileSync(
        "ffmpeg",
        [
            ...["-y", "-loglevel", "error"],
            ...inputs,
            ...["-filter_complex", [...scaled, ...fades].join(";"), "-map", `[f${last}]`],
            // lossy (quality 85): lossless is ~8 MB with the imagery of the map; no ghosts of earlier frames at this quality
            ...["-c:v", codec, "-lossless", "0", "-quality", "85", "-compression_level", "6", "-loop", "0", "-an"],
            out,
        ],
        { stdio: "inherit" },
    );

    console.log(`wrote ${out} (${Math.round(statSync(out).size / 1024)} KB, ${frames.length} frames)`);
}

// ----------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------

// run directly: node tests/demos/hero.ts [folder of frames]
if (import.meta.main) {
    encode(process.argv[2] || PATH_FRAMES);
}
