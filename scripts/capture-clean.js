/**
 * Clean App Store screenshot capture.
 * Renders each screen full-bleed via /shot?screen=NAME at the exact device
 * viewport, so output is a real edge-to-edge app screenshot — no device
 * frames, no labels, no padding bars.
 *
 *   iPhone 6.9":  430 x 932 @3x  -> 1290 x 2796
 *   iPhone 6.5":  414 x 896 @3x  -> 1242 x 2688
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const SCREENS = ["login", "dashboard", "help", "add-connection", "settings", "notifications"];
const DEVICES = [
    { label: "iphone-6.9", width: 430, height: 932, scale: 3 }, // -> 1290x2796
    { label: "iphone-6.5", width: 414, height: 896, scale: 3 }, // -> 1242x2688
];

async function main() {
    const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3000";
    const outRoot = path.join(process.cwd(), "artifacts", "screenshots", "clean");
    const browser = await chromium.launch({ headless: true });

    for (const dev of DEVICES) {
        const page = await browser.newPage({
            viewport: { width: dev.width, height: dev.height },
            deviceScaleFactor: dev.scale,
            colorScheme: "dark",
        });
        const outDir = path.join(outRoot, dev.label);
        fs.mkdirSync(outDir, { recursive: true });
        for (const screen of SCREENS) {
            await page.goto(`${baseUrl}/shot?screen=${screen}`, { waitUntil: "networkidle" });
            await page.waitForTimeout(350); // let fonts/gradients settle
            // viewport-only screenshot = exact device pixel size, no full-page scroll
            await page.screenshot({ path: path.join(outDir, `${screen}.png`) });
            console.log(`  ${dev.label}/${screen}.png  (${dev.width * dev.scale}x${dev.height * dev.scale})`);
        }
        await page.close();
    }

    await browser.close();
    console.log(`\nDone. Clean screenshots in ${outRoot}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
