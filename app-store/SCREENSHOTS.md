# Screenshots for the App Store

## What's already generated
`artifacts/screenshots/` contains high-res source art captured from the in-app
`/previews` route via Playwright:

| File | Screen |
|---|---|
| `login.png` | Phone-number welcome / sign-in |
| `dashboard.png` | Your circle of three (Marco/Polo/idle states) |
| `help.png` | Send a help request |
| `add-connection.png` | Add a friend by contact or number |
| `settings.png` | Custom signals + manage connections |
| `notifications.png` | Marco / Polo / Help push notifications |
| `watch-check-in.png` | Apple Watch check-in |
| `watch-help.png` | Apple Watch help |
| `previews-full.png` | All screens, one tall image (reference only) |

## Regenerate them
```bash
npm run dev &                 # start local server on :3000
npx playwright install chromium   # first time only
SCREENSHOT_BASE_URL=http://127.0.0.1:3000 node scripts/capture-previews.js
# screenshots land in artifacts/screenshots/
kill %1                       # stop the dev server
```

## ⚠️ Getting App-Store-valid sizes
Apple requires **exact** pixel dimensions and rejects anything else. The generated PNGs
are the right *content* but not guaranteed the right *size*. Two reliable options:

### Option A — iOS Simulator (most reliable, recommended)
1. Open the project in Xcode, run on **iPhone 16 Pro Max** simulator.
2. Navigate each screen, press **⌘S** (File → Save Screen) — produces a perfectly
   sized 6.9" screenshot every time.
3. For the Watch: run the Watch scheme on an **Apple Watch Ultra** simulator, ⌘S.

### Option B — Resize the generated art
Use the helper:
```bash
node scripts/resize-appstore.js
```
It writes `artifacts/screenshots/appstore/<size>/<name>.png` at the required sizes:
- `iphone-6.9` → 1290 × 2796
- `iphone-6.5` → 1242 × 2688

(Resizing may letterbox/crop slightly; Simulator capture is cleaner for final art.)

## Required device sizes in App Store Connect
- **iPhone 6.9"** — required (1320×2868 or 1290×2796)
- **iPhone 6.5"** — upload if prompted (1242×2688)
- **Apple Watch** — only required if you publish the Watch app on the Store

Upload 3–10 per required size. Recommended order for storytelling:
`dashboard → login → add-connection → settings → help → notifications → watch-check-in`.
