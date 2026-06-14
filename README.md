# Marco Polo — Friend Check‑In

A privacy‑first app for staying close to the three people who matter most.

Hold a friend's card to send a **Marco?** ("thinking of you / are you okay?"). They tap back **Polo!** ("I'm okay"). When something's wrong, one button sends a **Need Help** signal to your whole trusted circle. There's an Apple Watch companion so a check‑in is one tap from your wrist.

No feeds. No likes. No ads. Just a quiet, reliable line to your inner circle.

---

## What it does

- **Marco / Polo signals** — a warm, wordless "thinking of you" and an easy "I'm okay" reply.
- **Trusted circle of 3** — deliberately small. This is for your closest people, not a social network.
- **Need Help** — a high‑priority alert to everyone in your circle when you need them.
- **Custom signals** — rename your "Marco" and "Polo" to anything you like (encrypted at rest).
- **Apple Watch app** — check in and respond from your wrist.
- **Haptics + sound + motion** — signals you can feel, not just see.
- **Push notifications** — know the moment someone reaches out.

## Privacy

- Phone numbers stored **hashed (SHA‑256)** — never shared with other users.
- Custom messages **encrypted (AES‑256‑GCM)** — only you can read them.
- **No selling data, no third‑party sharing, no advertising, no tracking.**
- GDPR data export & account deletion built into Settings.
- Full policy: [`app/privacy/page.tsx`](app/privacy/page.tsx) → published at `/privacy`.

## Tech stack

| Layer | Technology |
|---|---|
| UI / web | Next.js 16 (App Router, static export), React 19, Tailwind CSS 4 |
| Native shell | Capacitor 8 (iOS) |
| Wearable | Apple Watch app (SwiftUI) + WatchConnectivity |
| Backend | Firebase — Realtime Database, Cloud Functions, Phone Auth, Cloud Messaging |
| Native plugins | SignalFeedbackPlugin (haptics/sound), WatchPlugin |
| Tests | Vitest (42 tests) |

- **App ID:** `co.polomar.app` (watch: `co.polomar.app.watchkitapp`)
- **Firebase project:** `marcopolo-3fa43`

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest (42 tests)
npm run verify       # tests + typecheck
```

## Ship to iOS

The iPhone app runs the **copied** Capacitor bundle in `ios/App/App/public`, not the source files. A source fix is not a shipped fix until the bundle is rebuilt. Always run:

```bash
npm run release:ios:prep    # verify + clean + build:web + cap copy ios
```

Then archive in Xcode. See [`docs/release.md`](docs/release.md) for the full proof standard and [`app-store/SUBMISSION.md`](app-store/SUBMISSION.md) for the complete App Store submission walkthrough.

## Repository layout

| Path | Purpose |
|---|---|
| `app/` | Next.js routes & pages (includes `/privacy`, `/previews`) |
| `components/` | UI components (FriendCard, etc.) |
| `lib/` | Shared logic — Firebase, signals, haptics, native bridges |
| `functions/` | Firebase Cloud Functions |
| `ios/` | Native iOS app + Apple Watch app |
| `app-store/` | App Store listing copy, screenshots & submission guide |
| `docs/` | Release & testing process docs |
| `tests/` | Vitest suite |
| `scripts/` | Build helpers + screenshot capture |
