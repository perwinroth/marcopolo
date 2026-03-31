const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const shots = [
    "login",
    "dashboard",
    "help",
    "add-connection",
    "settings",
    "notifications",
    "watch-check-in",
    "watch-help",
];

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1600, height: 2200 },
        deviceScaleFactor: 2,
        colorScheme: "dark",
    });

    const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3000";
    const outputDir = path.join(process.cwd(), "artifacts", "screenshots");
    fs.mkdirSync(outputDir, { recursive: true });

    await page.goto(`${baseUrl}/previews`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(outputDir, "previews-full.png"), fullPage: true });

    for (const shot of shots) {
        const locator = page.locator(`[data-shot="${shot}"]`);
        await locator.scrollIntoViewIfNeeded();
        await locator.screenshot({ path: path.join(outputDir, `${shot}.png`) });
    }

    await browser.close();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
