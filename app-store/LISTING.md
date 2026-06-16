# App Store Listing — Marco Polo

Copy/paste this into App Store Connect → your app → the version you're submitting.
Character limits are Apple's; counts below are within them.

---

## App Name (max 30 chars)
```
Marco Polo: Friend Check-In
```
> 27 chars. If "Marco Polo" alone is taken on the Store, this qualifier helps.
> Alternative if you want the short name: `Marco Polo` (10 chars).

## Subtitle (max 30 chars)
```
Stay close to your circle
```
> 25 chars. Alternatives:
> - `Thinking of you, one tap` (24)
> - `Check in on the ones you love` (29)

## Promotional Text (max 170 chars — editable anytime without review)
```
A quiet line to the three people who matter most. Send a Marco to say "thinking of you," get a Polo back, or ask for help with one tap. Now on Apple Watch.
```
> 154 chars.

## Keywords (max 100 chars, comma-separated, NO spaces after commas)
```
check in,friends,family,safety,thinking of you,close friends,wellbeing,care,watch,signal,loved ones
```
> 99 chars. Don't repeat words already in the app name/subtitle — Apple indexes those separately.

## Description (max 4000 chars)
```
Marco Polo is a quiet, private way to stay close to the three people who matter most.

No feeds. No likes. No ads. Just a simple, reliable line to your inner circle.

HOW IT WORKS
• Send a "Marco?" — a wordless "thinking of you / are you okay?" — by holding a friend's card.
• Get a "Polo!" back — an easy, one-tap "I'm okay."
• Need Help — when something's wrong, one button alerts everyone in your circle right away.

BUILT FOR YOUR CLOSEST PEOPLE
Your circle is capped at three on purpose. Marco Polo isn't a social network — it's for the handful of people you'd actually call in the middle of the night. Parents and kids. Partners. Best friends. The people you want to keep a thread to without the noise of group chats.

MAKE IT YOURS
• Rename your "Marco" and "Polo" to anything you like.
• Signals you can feel — gentle haptics, sound, and motion, not just another badge.
• Beautiful, calm, dark interface that gets out of the way.

ON YOUR WRIST
The Apple Watch app lets you check in and respond in a single tap — perfect for a quick "I'm okay" without reaching for your phone.

PRIVACY FIRST
• Your phone number is stored hashed (SHA-256) and is never shared with other users.
• Your custom messages are encrypted (AES-256-GCM) — only you can read them.
• We never sell your data, share it with third parties, show ads, or track you.
• Export your data or delete your account anytime from Settings.

Marco Polo is free. Download it, add the people who matter, and keep a quiet thread to the ones you love.
```
> ~1,500 chars — comfortably under 4,000.

## What's New in This Version (release notes)
```
First public release of Marco Polo.

• Send Marco / Polo check-in signals to your circle of three
• One-tap Need Help alerts to everyone in your circle
• Custom signal names
• Haptics, sound, and motion feedback
• Apple Watch companion app
• Push notifications
```

---

## App Information fields

| Field | Value |
|---|---|
| **Bundle ID** | `co.polomar.app` |
| **Primary Category** | Lifestyle |
| **Secondary Category** | Social Networking *(optional)* |
| **Price** | Free (Tier 0) |
| **Availability** | All territories (or your choice) |
| **Age Rating** | 4+ (see notes in SUBMISSION.md — no objectionable content) |
| **Privacy Policy URL** | https://www.polomar.co/privacy |
| **Support URL** | https://www.polomar.co  *(use the www. version — bare polomar.co 404s)* |
| **Marketing URL** *(optional)* | https://www.polomar.co |
| **Copyright** | 2026 Per Winroth |

## Contact / Demo account for App Review
Apple's reviewers must be able to use the app. Because sign-in is **phone-number (SMS) based**, you must provide reviewer access notes in App Review Information:

```
This app uses phone number (SMS) authentication via Firebase.
To let the reviewer in without a real SIM, set up a Firebase test
phone number with a fixed verification code:

Firebase Console → Authentication → Sign-in method → Phone →
"Phone numbers for testing" → add e.g. +1 650-555-1234 / code 123456

Then provide that number + code here so the reviewer can sign in.
```
> ⚠️ This is the #1 thing first-time SMS-auth apps get rejected for. Don't skip it. Full steps in SUBMISSION.md.
