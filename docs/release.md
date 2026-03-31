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
