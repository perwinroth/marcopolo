# iOS Release Rule

The iPhone app runs the copied Capacitor web bundle in `ios/App/App/public`, not the source files directly.

That means a source fix is not a shipped fix.

## Required command before any Xcode archive or TestFlight build

```bash
npm run release:ios:prep
```

This does all of the required steps in order:

1. `npm run verify`
2. `npm run clean:web`
3. `npm run clean:ios:web`
4. `npm run build:web`
5. `npx cap copy ios`

## Proof standard

Do not call an issue fixed unless all of these are true:

1. The code change is committed locally.
2. `npm run release:ios:prep` completes successfully.
3. The iPhone app is rebuilt and reinstalled from Xcode.
4. The behavior is retested on the device build that was just installed.

If step 3 or 4 has not happened, the correct wording is:

- `source fixed, device not yet verified`

Not:

- `fixed`

## TestFlight rule

Before every TestFlight upload:

```bash
npm run release:ios:prep
```

Then in Xcode:

1. Open the iOS project
2. Build/archive the app
3. Upload that archive to TestFlight

## Why this exists

We previously had cases where:

- source files were corrected
- the copied iOS bundle stayed stale
- the installed iPhone app still ran old broken code

This command flow prevents that class of failure.

## Firebase rule dependency

Contact lookup on native iPhone uses a Realtime Database query on:

- `users` ordered by `phoneNormalized`

That query requires the live database rules to include:

```json
".indexOn": ["phone", "phoneNormalized", "email"]
```

The repo already contains that rule in `database.rules.json`, but the live Firebase project must also have it deployed.

Before testing add-contact against production data, run:

```bash
firebase deploy --only database
```

or publish the Realtime Database rules manually in Firebase Console.

If this is not done, native add-contact can fail with:

```text
DB QUERY failed: 400 { "error" : "Index not defined, add \".indexOn\": \"phoneNormalized\", for path \"/users\", to the rules" }
```

## Production test gate

Before calling contact lookup fixed on device:

1. `npm run release:ios:prep`
2. `firebase deploy --only database`
3. rebuild/reinstall from Xcode
4. retest add-contact on the installed build

## Contact normalization rule

This app cannot treat picked contact numbers as raw digit strings.

Why:

- iPhone contacts often store local-format numbers like `070 999 88 77`
- Firebase user lookup uses normalized values like `46709998877`
- stripping spaces and punctuation is not enough
- hardcoding `SE` in the UI is not a valid normalization strategy for all users

Required rule:

- contact-picker numbers must be parsed into international form first
- the fallback country must come from the signed-in user's own number
- lookup must use the normalized international result, not the raw picked value

Do not regress to:

- `phone.replace(/\D/g, '')`
- assuming the picker value is already globally unique
- hardcoded Sweden-only normalization in the picker path

Proof requirement for this area:

1. automated tests for local-format contact normalization
2. `npm run release:ios:prep`
3. device test with a local-format contact from the native picker

If those three have not happened, do not call picker-based add-contact fixed.
