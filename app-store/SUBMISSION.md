# Marco Polo — App Store Submission Walkthrough

This is the complete, ordered checklist to get Marco Polo published as a **free** app
that anyone can find and download. Follow it top to bottom.

Legend: ✅ already done in the repo · 🤖 a script does it · 🧑 you must do it (Xcode / Apple website)

---

## 0. Prerequisites
- ✅ Paid Apple Developer Program membership (active).
- ✅ App already exists in TestFlight → so the App Store Connect record exists.
- 🧑 Xcode installed (`/Applications/Xcode.app`).
- 🧑 **One-time:** point the command line at full Xcode (only needed for CLI builds):
  ```bash
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
  You can archive entirely from the Xcode GUI without this, so it's optional.

---

## 1. Build the shippable bundle ✅ / 🤖
The iPhone app serves the copied web bundle, not source. Rebuild it:
```bash
cd "<repo>"
npm run release:ios:prep
```
This runs: verify (42 tests + typecheck) → clean → build:web → `cap copy ios`.
**Status: passing.** Re-run it any time you change web/source code.

---

## 2. Version & build numbers ✅
- `MARKETING_VERSION = 1.0` (the public "version 1.0")
- `CURRENT_PROJECT_VERSION = 2` (build 2 — bumped above your TestFlight build 1)

Each new upload to App Store Connect must have a **higher build number** than the last.
If build 2 is ever rejected/replaced, bump to 3, etc. (Xcode → target → General → Build,
or edit `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`).

---

## 3. Production push entitlement ✅
Both `ios/App/App/App.entitlements` and the Watch entitlements now use
`aps-environment = production`. Required for notifications to work for real App Store users.

---

## 4. Deploy Firebase backend (so production users work) 🧑
The live Firebase project must have the database index rules deployed, or native
contact lookup fails (see `docs/release.md`):
```bash
npx firebase deploy --only database,functions
```
(Requires `firebase login` once. Project is `marcopolo-3fa43`.)

---

## 5. Archive & upload in Xcode 🧑
1. Open the project:
   ```bash
   open "ios/App/App.xcodeproj"
   ```
2. Top device selector → choose **Any iOS Device (arm64)** (not a simulator).
3. Select the **App** scheme. Confirm both the app and the **Watch** target are signed:
   - Target → Signing & Capabilities → Team = **DZ7M22FMZY**, "Automatically manage signing" on.
   - Capabilities include **Push Notifications** and the entitlement shows **production**.
4. Menu: **Product → Archive**. Wait for the build.
5. In the Organizer window that opens: **Distribute App → App Store Connect → Upload**.
6. Accept the defaults (Upload symbols, manage version/build). Click through to finish.
7. The build appears in App Store Connect → TestFlight in ~5–30 min (processing).

> If signing fails: Xcode → Settings → Accounts → add your Apple ID → Download Manual
> Profiles. Automatic signing usually fixes it on its own.

---

## 6. Screenshots 🤖 ✅ / 🧑
Generated at `artifacts/screenshots/` (regenerate with the commands in
`app-store/SCREENSHOTS.md`):
`login, dashboard, help, add-connection, settings, notifications, watch-check-in, watch-help`.

⚠️ **Apple requires exact pixel sizes.** The generated images are high-res previews and
are great as the *source art*, but App Store Connect needs:
- **iPhone 6.9" (required):** 1320 × 2868 or 1290 × 2796 px
- **iPhone 6.5"** (often still required): 1242 × 2688 px
- **Apple Watch** (only if you list the watch app): per Apple's current watch sizes

Easiest reliable way to get correct sizes: run the app in the **iOS Simulator**
(iPhone 16 Pro Max) and press **⌘S** to save perfectly-sized screenshots, OR resize the
generated PNGs to the exact dimensions. See `app-store/SCREENSHOTS.md`.
Upload 3–10 per required device size in App Store Connect → your version → Previews and Screenshots.

---

## 7. Fill in the listing 🧑
App Store Connect → your app → **(+) version or the 1.0 version** → paste from
`app-store/LISTING.md`:
- Name, Subtitle, Promotional text, Description, Keywords, What's New
- Support URL, Privacy Policy URL, Marketing URL
- Category: **Lifestyle** · Price: **Free**

---

## 8. App Privacy labels 🧑
App Store Connect → **App Privacy** → fill using `app-store/PRIVACY-LABELS.md`.
(Phone number, optional contacts/email, custom messages, user ID — all "App Functionality",
**no tracking**.)

---

## 9. Age rating 🧑
App Store Connect → your app → **Age Rating** → answer the questionnaire.
Marco Polo has no objectionable content → result should be **4+**.
(Unrestricted web access = No, since it's a fixed static bundle, not a browser.)

---

## 10. ⭐ Reviewer sign-in notes (DO NOT SKIP) 🧑
Because sign-in is SMS-based, Apple's reviewer can't log in without help → guaranteed
rejection if you skip this.
1. Firebase Console → Authentication → Sign-in method → Phone →
   **Phone numbers for testing** → add a number + fixed code, e.g.
   `+1 650-555-1234` / `123456`.
2. App Store Connect → your version → **App Review Information** → Notes, paste:
   ```
   Sign-in uses phone (SMS) verification. Use this Firebase test number:
   Phone: +1 650-555-1234
   Code:  123456
   No real SIM needed. After sign-in, add a connection by phone number to see the core flow.
   ```
3. Add your real email + phone in the App Review contact fields.

---

## 11. Submit for review 🧑
1. In the version page, **Build** section → **(+) Select Build** → pick build **2**.
2. Answer the export compliance prompt: **No** (uses exempt/standard encryption only —
   `ITSAppUsesNonExemptEncryption = false` is already set).
3. Set release option: **Automatically release after approval** (so it goes live the
   moment it's approved) or **Manually release**.
4. Click **Add for Review** → **Submit for Review**.

Review typically takes 24–48 hours. You'll get email updates. Once **Ready for Sale**,
the app is findable and downloadable for free on the App Store. 🎉

---

## If you get rejected
Most common first-submission reasons & fixes:
- **Can't sign in** → you skipped step 10. Add the test number.
- **Guideline 5.1.1 (privacy)** → labels inconsistent with the in-app policy. Re-check step 8.
- **Crash on launch** → make sure step 1 (`release:ios:prep`) ran before archiving;
  a stale bundle is the usual cause (see `docs/release.md`).
- **Metadata** → broken Support/Privacy URL. Make sure `https://marcopolo-3fa43.web.app/privacy` loads.

Respond in **Resolution Center**, fix, bump the build number, re-archive, re-submit.
