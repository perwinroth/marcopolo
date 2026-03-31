# Testing Guide

This project now has two test layers:

- Automated tests for pure logic and service wrappers
- Device validation for iPhone and Apple Watch features that cannot be proven in a desktop sandbox

## Automated Suite

Run:

```bash
npm test
```

Current automated coverage:

- Encryption round-trips and stored custom message handling
- Hash determinism with fixed salts
- Utility class joining
- Function URL building and authenticated function calling
- Contact picker behavior on web and native permission flows

## Device Validation Matrix

These must be run on real hardware before release.

### Accounts / Setup

Prepare:

1. Two real user accounts with distinct phone numbers
2. Two iPhones if possible
3. One Apple Watch paired to one of the iPhones
4. Notifications enabled on iPhone and Watch

### Login / Persistence

1. Fresh install the app
2. Sign in with SMS code
3. Force-quit and relaunch the app
4. Confirm the user is still signed in
5. Reboot the device and relaunch the app
6. Confirm the user is still signed in
7. Disable network and relaunch
8. Confirm the app does not immediately force re-login

Expected:

- SMS is required only on the first login or true session loss
- Existing session restores without asking for another code

### Contacts

1. Open Add Connection
2. Tap `Pick from Contacts`
3. Grant contacts permission
4. Select a contact with multiple phone numbers
5. Confirm the phone field is populated
6. Deny contacts permission and retry
7. Confirm the app fails safely and does not crash

Expected:

- Contact picker opens
- Chosen number is inserted correctly
- Denied permission is handled cleanly

### Friend Requests / Invites

1. Add a registered user by phone number
2. Confirm request appears on the recipient device
3. Accept the request
4. Confirm both users see each other in their connection list
5. Try inviting an unregistered number
6. Confirm SMS composer opens with invite link
7. Accept the invite from the intended phone number
8. Confirm invite acceptance works
9. Try accepting that invite from the wrong account
10. Confirm it is rejected

Expected:

- Requests sync both ways
- Invite flow works
- Wrong recipient cannot claim an invite

### Marco / Polo

1. On user A, hold a friend card to send Marco
2. Confirm user A sees `Marco Sent`
3. Confirm user B sees incoming Marco state
4. On user B, respond with Polo
5. Confirm user A sees the connected response state
6. Wait for state reset

Expected:

- Status transitions are correct on both devices
- UI resets after response

### Help Request

1. On user A, trigger Help
2. Confirm all connected users receive the Help state
3. Confirm the sender sees Help sent state
4. Wait for auto-restore
5. Confirm the original state returns if nothing else changed

Expected:

- Help reaches all trusted connections
- Auto-restore works

### iPhone Notifications

Test each event: Marco received, Polo received, Help received.

1. Put recipient app in background
2. Trigger event from another device
3. Confirm:
   - banner appears
   - sound plays
   - notification lands in Notification Center
4. Open the app and trigger again in foreground
5. Confirm foreground presentation still shows banner and sound

Expected:

- All three events appear as real notifications on iPhone

### Apple Watch Notifications

Test each event: Marco received, Polo received, Help received.

1. Ensure Watch app is installed and authenticated
2. Trigger event to the watch user
3. Confirm notification appears on Watch
4. Confirm sound/haptic behavior is present
5. Open Watch app in foreground and trigger again
6. Confirm foreground behavior is still acceptable

Expected:

- Watch receives pushes
- Watch presents alerts reliably

### Recovery Email

1. Add a recovery email
2. Log out
3. Use recovery flow
4. Enter received code
5. Confirm account login succeeds

Expected:

- Recovery code delivery works
- Recovery login restores the correct account

### Account Controls

1. Export user data
2. Confirm file downloads and contains expected profile / connections / requests
3. Delete account
4. Confirm user profile is removed
5. Confirm associated requests and invitations are removed
6. Confirm login is no longer active

Expected:

- Export returns readable account data
- Delete fully removes the account

## Release Gate

Before shipping:

1. `npm test`
2. `npx tsc --noEmit --pretty false --incremental false`
3. Real-device iPhone notification pass
4. Real-device Watch notification pass
5. Login persistence pass after force quit and reboot
