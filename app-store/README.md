# App Store submission kit — Marco Polo

Everything you need to publish Marco Polo as a free iOS app. Start with **SUBMISSION.md**.

| File | What it's for |
|---|---|
| **[SUBMISSION.md](SUBMISSION.md)** | ⭐ The full step-by-step walkthrough, start to finish. Read this first. |
| [LISTING.md](LISTING.md) | App name, subtitle, description, keywords, what's-new — paste into App Store Connect. |
| [PRIVACY-LABELS.md](PRIVACY-LABELS.md) | Exact answers for the App Privacy "nutrition labels" questionnaire. |
| [SCREENSHOTS.md](SCREENSHOTS.md) | How to generate/size screenshots; required dimensions. |

## Generated assets (not committed — they live in `artifacts/`, which is gitignored)
- `artifacts/screenshots/*.png` — source preview art (8 screens).
- `artifacts/screenshots/appstore/iphone-6.9/*.png` — 1290×2796, ready to upload.
- `artifacts/screenshots/appstore/iphone-6.5/*.png` — 1242×2688, ready to upload.

Regenerate anytime:
```bash
npm run dev &
SCREENSHOT_BASE_URL=http://127.0.0.1:3000 node scripts/capture-previews.js
node scripts/resize-appstore.js
kill %1
```

## Quick status
| Item | State |
|---|---|
| Tests (42) + typecheck | ✅ passing |
| Web build + iOS bundle sync | ✅ `npm run release:ios:prep` |
| Build number bumped to 2 | ✅ |
| Production push entitlement | ✅ iOS + Watch |
| Screenshots (6.9" + 6.5") | ✅ generated |
| Listing copy / privacy labels | ✅ drafted |
| Archive & upload in Xcode | 🧑 you |
| Reviewer SMS test number | 🧑 you (Firebase Console) — **don't skip** |
| Submit for review | 🧑 you (App Store Connect) |

The repo work is done. The remaining steps are the ones Apple locks behind your
account login and the Xcode GUI — all documented in SUBMISSION.md.
