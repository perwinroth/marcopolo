/**
 * Resize captured preview screenshots into exact App Store sizes.
 *
 * Input:  artifacts/screenshots/*.png  (from scripts/capture-previews.js)
 * Output: artifacts/screenshots/appstore/<size>/<name>.png
 *
 * Tries `sharp` first (best quality). If unavailable, falls back to the macOS
 * built-in `sips` CLI so it works with zero extra installs.
 *
 * Usage:  node scripts/resize-appstore.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SRC = path.join(process.cwd(), "artifacts", "screenshots");
const OUT = path.join(SRC, "appstore");

// Apple required portrait sizes (px). Watch sizes vary by model; capture those
// from the Watch simulator instead.
const SIZES = {
    "iphone-6.9": { w: 1290, h: 2796 },
    "iphone-6.5": { w: 1242, h: 2688 },
};

// iPhone screens only (skip the watch + the giant full-page composite).
const IPHONE_SHOTS = [
    "login",
    "dashboard",
    "help",
    "add-connection",
    "settings",
    "notifications",
];

function haveSharp() {
    try { require.resolve("sharp"); return true; } catch { return false; }
}

async function resizeWithSharp(src, dst, w, h) {
    const sharp = require("sharp");
    // Fit the art onto an exact canvas, padding with the app's dark bg (#020617).
    await sharp(src)
        .resize(w, h, { fit: "contain", background: { r: 2, g: 6, b: 23, alpha: 1 } })
        .png()
        .toFile(dst);
}

function resizeWithSips(src, dst, w, h) {
    fs.copyFileSync(src, dst);
    // sips pads/crops to exact dimensions.
    execFileSync("sips", ["-z", String(h), String(w), dst], { stdio: "ignore" });
}

async function main() {
    if (!fs.existsSync(SRC)) {
        console.error(`No screenshots found at ${SRC}. Run scripts/capture-previews.js first.`);
        process.exit(1);
    }
    const useSharp = haveSharp();
    console.log(`Resizing with: ${useSharp ? "sharp" : "sips (macOS fallback)"}`);

    for (const [label, { w, h }] of Object.entries(SIZES)) {
        const dir = path.join(OUT, label);
        fs.mkdirSync(dir, { recursive: true });
        for (const shot of IPHONE_SHOTS) {
            const src = path.join(SRC, `${shot}.png`);
            if (!fs.existsSync(src)) { console.warn(`  skip (missing): ${shot}`); continue; }
            const dst = path.join(dir, `${shot}.png`);
            if (useSharp) await resizeWithSharp(src, dst, w, h);
            else resizeWithSips(src, dst, w, h);
            console.log(`  ${label}/${shot}.png  (${w}x${h})`);
        }
    }
    console.log(`\nDone. App Store sizes written to ${OUT}`);
    console.log("Note: Simulator ⌘S capture gives the cleanest final art — see app-store/SCREENSHOTS.md");
}

main().catch((e) => { console.error(e); process.exit(1); });
