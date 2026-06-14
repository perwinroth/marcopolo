# App Privacy "Nutrition Labels" — App Store Connect answers

App Store Connect → your app → **App Privacy** → "Get Started".
These answers are derived from the app's actual behavior (see `app/privacy/page.tsx`
and `ios/App/App/PrivacyInfo.xcprivacy`). Confirm each against current code before submitting.

---

## Q: Do you or your third-party partners collect data from this app?
**YES** — the app collects a small amount of data (it uses Firebase).

> Note: "collect" in Apple's terms means transmitted off device. Even though the
> phone number is hashed and messages are encrypted, the data still leaves the device,
> so you answer YES and then describe it accurately below.

---

## Data types to declare

### 1. Contact Info → Phone Number
- **Collected:** Yes
- **Used for:** App Functionality (user identification, connecting you to your circle)
- **Linked to identity:** Yes (it identifies the user account)
- **Used for tracking:** **No**
- Note in your own records: stored hashed (SHA-256), never shared with other users.

### 2. Contacts (device address book)
- **Collected:** Only if the user taps "Pick from Contacts."
- The app reads contacts **on device** to let you find friends. If you do **not**
  upload the address book to your server, you may **not** need to declare this as
  "collected" — declare it only if a contact's number is transmitted to Firebase
  during lookup.
- ⚠️ **Verify in code:** does add-contact send the picked number to the backend for
  lookup? (Per `docs/release.md`, native add-contact does a DB query by
  `phoneNormalized`.) If the looked-up number is sent to your server → declare:
  - **Contacts → Used for:** App Functionality
  - **Linked to identity:** No
  - **Tracking:** No

### 3. User Content → Other User Content (custom Marco/Polo messages)
- **Collected:** Yes (stored, AES-256-GCM encrypted)
- **Used for:** App Functionality
- **Linked to identity:** Yes
- **Tracking:** No

### 4. Identifiers → User ID
- **Collected:** Yes (Firebase account / push token registration)
- **Used for:** App Functionality
- **Linked to identity:** Yes
- **Tracking:** No

### 5. Contact Info → Email Address (ONLY if recovery email is used)
- **Collected:** Optional — only if the user adds a recovery email.
- **Used for:** App Functionality (account recovery)
- **Linked to identity:** Yes
- **Tracking:** No

---

## Tracking
- **Does this app track users?** → **NO**
- The app does not use data for advertising or share it with data brokers.
- `Info.plist` already sets `NSPrivacyTracking = false`. ✅

## Matches in code
- `Info.plist`: `NSContactsUsageDescription`, `NSUserNotificationsUsageDescription`,
  `ITSAppUsesNonExemptEncryption = false`, `NSPrivacyTracking = false`. ✅
- The on-device privacy policy at `/privacy` already states: hashed phone numbers,
  encrypted messages, no selling/sharing, GDPR export & deletion. Keep the App Store
  answers consistent with it.

## Export compliance
`Info.plist` declares `ITSAppUsesNonExemptEncryption = false`. This is correct because
the app only uses standard HTTPS/TLS and Apple-provided crypto (the AES message
encryption uses standard algorithms exempt under the "limited to intellectual property
protection / standard encryption" categories). App Store Connect will therefore **not**
ask additional export questions. If you later add custom/proprietary crypto, revisit this.
