# Ship Rite to the App Store and Play Store

Rite is one codebase. The live product is the web app. Capacitor is the native shell (`app.rite.habits`). Generating `android/` and `ios/` still happens on a machine with Android Studio / Xcode — this sandbox does not produce store binaries.

## What the phone build actually can do

| Capability | Web / PWA | Android app | iOS app |
|---|---|---|---|
| Habits, streaks, offline, reminders while open | Yes | Yes | Yes |
| OS local notifications after leave | No | Yes | Yes |
| Pin Rite (screen pinning / lock task) | Fullscreen only | Yes, after Screen pinning is on | No |
| Silence banners (DND) | In-app quiet hours | Yes, after notification-policy access | No |
| Block Instagram / whitelist apps | No | No — Digital Wellbeing | No — Screen Time / Focus |
| FamilyControls / ManagedSettings | — | — | Needs an Apple entitlement we do not have |

True “only these apps work” is an OS feature:

- **Android app:** Study calls `startLockTask()` — the phone pins Rite. User confirms the first time. Other apps are not blocked by name; use Digital Wellbeing Focus for that.
- **iOS app:** Cannot pin or shield apps. Apple requires a Family Controls entitlement (weeks of review, native Screen Time extensions — not a WebView). Until then: Focus (allow only Rite) or Guided Access (triple-click).
- **Web / PWA:** fullscreen only.

Opal/DrillLock sit on Apple’s Screen Time API. Capacitor does not grant that. Copying `android/` and `ios/` is not the same as that entitlement.

## One-time native projects

```
npm install
npm run native:add
npm run native:sync
```

`webDir` is `dist-native`. Run `npm run native:web` (Vite SPA with `src/native-main.tsx`) — do **not** load the TanStack Start hydrate bundle in the APK. That empty-body hydrate is why v0.1.1 showed a white screen.

- Android: `native/rite-lock/android/RiteLockPlugin.java` + `RiteWidgetProvider.java` → `android/app/src/main/java/app/rite/habits/`
  Register in `MainActivity`: `registerPlugin(RiteLockPlugin.class);`
  Add `android.permission.ACCESS_NOTIFICATION_POLICY` and the home-screen widget receiver (`inject-lock.mjs` does this).
- iOS: add `native/rite-lock/ios/RiteLockPlugin.swift` to the Xcode target.

## Debug APK from GitHub Actions

This Linux sandbox cannot install the Android SDK or Xcode. iOS IPAs also need a Mac, an Apple Developer account, and signing certs — none of that is here.

On GitHub (after the repo is connected):

1. Actions → **Android debug APK** → Run workflow, **or** `git tag vX.Y.Z && git push origin vX.Y.Z`.
2. The APK is published to **Releases** as `Rite-debug.apk` (right-hand sidebar on the repo).
3. Direct download: `https://github.com/Maya920tu/Rite/releases/latest/download/Rite-debug.apk`

Debug APKs **must** be signed with `native/rite-debug.keystore` (SHA-256 `C79734F4…4B0C` in `native/rite-debug.sha256`). `inject-lock.mjs` copies it and applies `rite-signing.gradle` **after** `cap sync` (sync used to wipe the signing block, so v0.3.0 could still use the runner’s random debug key). CI runs `node native/verify-apk-cert.mjs` and fails the job if the APK fingerprint differs.

Optional GitHub Actions secret `RITE_DEBUG_KEYSTORE_BASE64` (base64 of that same `.keystore` file) overrides the committed file. If you rotate the key, update `native/rite-debug.sha256` and tell users to uninstall once.

Never rotate that debug key without an export/restore path. Play Store later needs a **different** upload keystore in secrets (`RITE_KEYSTORE_BASE64`, `RITE_KEY_ALIAS`, `RITE_KEY_PASSWORD`).


iOS: open the project on a Mac with `npm run native:add` then `npx cap open ios`. Store builds require Apple signing. There is no IPA from this environment.

## Store copy

- Name: Rite
- Subtitle: Daily rites. Lasting streaks.
- Category: Health & Fitness / Lifestyle
- Privacy: habits stay on device; no account required
