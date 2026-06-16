/**
 * Apple Watch screenshot capture for the App Store.
 * Apple requires watch screenshots at the Ultra size (410 x 502) which also
 * covers the 45mm requirement. Renders /shot?screen=watch-* full-bleed.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const SCREENS = ["watch-check-in", "watch-help"];
// Apple Watch Ultra: 410 x 502 px (accepted by App Store Connect watch slot).
const DEV = { label: "watch", width: 410, height: 502, scale: 1 };

async function main() {
    const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3000";
    const outDir = path.join(process.cwd(), "artifacts", "screenshots", "clean", DEV.label);
    fs.mkdirSync(outDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: DEV.width, height: DEV.height },
        deviceScaleFactor: DEV.scale,
        colorScheme: "dark",
    });
    for (const screen of SCREENS) {
        await page.goto(`${baseUrl}/shot?screen=${screen}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(outDir, `${screen}.png`) });
        console.log(`  ${DEV.label}/${screen}.png  (${DEV.width}x${DEV.height})`);
    }
    await browser.close();
    console.log(`\nDone. Watch screenshots in ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
