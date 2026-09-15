# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Anyone who wants to remember the people that matter to them — no professional segment is excluded. Founders, freelancers, salespeople, and job-seekers are typical, but the product addresses everyone with a personal network worth keeping.

## Product Purpose

NetworkOS is a private, local-first personal CRM: it keeps contacts, notes, relationships, follow-ups, commitments, meetings, companies, tags, and birthdays organized on the device, with a visual network graph showing how connections fit together. It exists so people never lose track of a relationship. Success means a user opens the app, finds anyone fast, and follows through on time — without ever creating an account.

## Positioning

No account, no server, no tracking. Unlike cloud CRMs, NetworkOS holds no copy of user data: everything lives in an encrypted on-device database. Privacy is the mechanism, not a setting.

## Operating Context

Mobile, personal, intermittent use: check today's follow-ups and birthdays, add a contact after meeting someone, optionally import from iOS Contacts and let the app keep those imported people up to date from the phone book, review the network graph (depth 1–3, max 150 nodes), export an encrypted backup. English + Türkçe; language follows the system setting. No login, no onboarding beyond first/last name stored on device.

## Capabilities and Constraints

- Confirmed: manual + imported contacts with the full field set (birthday, LinkedIn, how/where met, cadence), editing and deletion, relationship graph centred on the owner with shortest-path view, structural network insights (bridges, disconnected clusters, company concentration, dormancy), automatic introduction suggestions, follow-ups with local notifications and per-contact cadence, birthday reminders, a weekly digest instead of per-person noise, promises tracked in both directions as a reciprocity ledger, meetings, event mode that turns attendees into real connections, companies, tags with filtering, FTS5 search, calendar-matched meeting briefings (on-device, read-only), recovery-key encrypted backup and restore, one-time-code encrypted selective sharing, serverless device-to-device sync bundles, CSV export (explicitly unencrypted), optional biometric app lock with re-lock and app-switcher privacy cover, a private vault that hides chosen contacts everywhere until unlocked, contact photos, an off-by-default one-way phone-book sync that fills blank fields on already-imported people and never writes to the address book, duplicate detection and merging, a recoverable trash, network goals counted from real interactions, insights that open into the people behind them, a rewindable graph, light/dark/system theming, owner profile.
- Constraints: iPhone-first; local-first is permanent — sync happens between the user's own devices via an encrypted file they carry (AirDrop/Files), never through a server or an account. Android package (`com.networkos.app`) is reserved but unbuilt. iOS Contacts, Calendar, Notifications and Face ID permissions are all optional and on-device only. Phone-book sync is the one contacts path that is not a per-tap action, so it stays off until the user turns it on and never asks for the permission by itself.
- Undecided: whether a native local-network transport (MultipeerConnectivity) should replace the file handoff for sync; the merge engine is transport-agnostic and would not change.

## Brand Commitments

Name NetworkOS, scheme `networkos`. Calm, quiet tone ("Your network. Organized." / "Ağınız. Düzenli."). Deep teal identity (`#173F46` primary, `#0B4B52` teal) with coral accent (`#F0644F`). Bilingual EN+TR voice confirmed in store copy. No invented claims beyond shipped features.

## Evidence on Hand

- Shipped v1.0 binary (EAS build 9) and App Store metadata in `store.config.json`.
- Published privacy/support pages: `https://ermixserdar.github.io/networkos/privacy`, `.../support`.
- 32 RGB 1284×2778 screenshots in `store-assets/` (en + tr).
- Architecture, security, and database docs in `docs/`; passing typecheck, lint and Jest suite (109 tests in `tests/`, including a SQL placeholder/argument guard, migrations and merges exercised against a real SQLite, and reminder-budget coverage).

## Product Principles

1. Privacy is structural: if data can leave the device, the design is wrong.
2. Calm over clever: the app is a quiet memory, never a noisy feed.
3. Every person is actionable: any contact leads to a next step (follow-up, meeting, introduction).
4. Optional stays optional: permissions and lock are invited, never demanded.
5. Bilingual parity: no feature ships English-only.

## Accessibility & Inclusion

General productivity audience, rated 4+. No product-specific accessibility requirement established beyond platform defaults; Dynamic Type and VoiceOver support follow iOS conventions.
