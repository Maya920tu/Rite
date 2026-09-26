# Rite — session TODO

Update this file whenever work starts, stalls, or finishes. Next session: read this, then `AGENTS.project.md`.

Status: `todo` | `doing` | `done` | `blocked`

| ID | Status | Task | Notes |
|---|---|---|---|
| T1 | done | Habit tracker core | check-offs, week/month, CRUD, localStorage |
| T2 | done | Share cards + PWA icons | og.jpg 1200×630, x-banner 50:11 |
| T3 | done | Reminders + ringtones + quiet hours | web: while tab open; native: local notifications |
| T4 | done | Skip / pause | skip keeps streak, pause drops from today |
| T5 | done | Offline + self-hosted fonts | SW cache-first in PROD; Outfit/Fraunces via fontsource |
| T6 | done | Study / Sleep modes | in-app lock, slips, Android pin plugin |
| T7 | done | Guards (self-control lists) | groups, schedule/limit/place, strict 30s break |
| T8 | done | Knowledge graph | `AGENTS.project.md` + this file |
| T9 | done | GitHub public repo + push | https://github.com/Maya920tu/Rite |
| T10 | blocked | Real OS app blocking | Screen Time / Digital Wellbeing. Not a missing button. |
| T11 | done | Android APK pipeline | v0.1.1 white-screened. Replaced by T21. |
| T12 | blocked | iOS IPA | Needs a Mac, Apple Developer account, signing certs. |
| T13 | done | Encrypted backup + Drive/share | Keep → Backup. JSON/CSV + passphrase `.rite.json` via share/picker. |
| T14 | done | Android home widget | Injected `RiteWidgetProvider`. |
| T15 | done | Weekly score + 1 freeze/week | Label is **Score 66%**, not ISO week 66. |
| T16 | done | Morning/evening rite runner | Keep → Runner. |
| T17 | done | One-person pact | Keep → Pact. Snapshot `#pact=` link. |
| T18 | todo | “One sec” intercept copy for Guards | Friction copy, not a fake OS block. |
| T19 | blocked | Health Connect / HealthKit auto-complete | Store listing + entitlements. |
| T20 | blocked | Play/App Store signed release | User must keep the **same** upload keystore. Debug key is `native/rite-debug.keystore`. |
| T21 | done | APK white screen | Native SPA `dist-native`. |
| T22 | done | Same debug signing so Update works | Keystore in git. **v0.3.0 still may have been overwritten by `cap sync`.** |
| T28 | done | Pin APK SHA-256 in CI | Inject after sync; CI fails if cert ≠ C79734F4…4B0C. |
| T29 | done | Public v0.1.0 + short history | Deleted old GitHub releases; squashed git to one commit. |
| T23 | done | Empty first launch (no fake past ticks) | Sample only from empty-state. Banner if demo ids still present. |
| T24 | done | Relabel week score | **Score 66%**, not week-of-year. Streak is current days. |
| T25 | done | Study recents swipe | Pin + bringToFront + persist. Cannot block YouTube without Digital Wellbeing Focus. |
| T26 | done | Dated daily tasks | Home → Tasks. Reminder skipped if already done. |
| T27 | done | Autosave + restore CTA | Empty-state Restore. Uninstall still wipes app storage — export Keep first. |

## How to resume after a limit reset

1. Read `TODO.md` (this file) for open rows.
2. Read `AGENTS.project.md` for architecture — do not re-read every source file.
3. Mark the row `doing`, then `done` when verified (typecheck + smoke).
4. If blocked, write why in Notes, do not pretend it shipped.
