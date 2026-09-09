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

Mobile, personal, intermittent use: check today's follow-ups and birthdays, add a contact after meeting someone, optionally import from iOS Contacts, review the network graph (depth 1–3, max 150 nodes), export an encrypted backup. English + Türkçe; language follows the system setting. No login, no onboarding beyond first/last name stored on device.

## Capabilities and Constraints

- Confirmed: manual + imported contacts, relationship graph with shortest-path view, follow-ups with local notifications, commitments, meetings, companies, tags, search, encrypted backup export/restore, CSV export (explicitly unencrypted), optional biometric app lock, owner profile.
- Constraints: iPhone-only (v1.0, build 9 in App Store review); local-first is permanent — no cloud sync will be added. Android package (`com.networkos.app`) is reserved but unbuilt. iOS Contacts and Face ID permissions are optional and on-device only.
- Undecided: none material.

## Brand Commitments

Name NetworkOS, scheme `networkos`. Calm, quiet tone ("Your network. Organized." / "Ağınız. Düzenli."). Deep teal identity (`#173F46` primary, `#0B4B52` teal) with coral accent (`#F0644F`). Bilingual EN+TR voice confirmed in store copy. No invented claims beyond shipped features.

## Evidence on Hand

- Shipped v1.0 binary (EAS build 9) and App Store metadata in `store.config.json`.
- Published privacy/support pages: `https://ermixserdar.github.io/networkos/privacy`, `.../support`.
- 32 RGB 1284×2778 screenshots in `store-assets/` (en + tr).
- Architecture, security, and database docs in `docs/`; passing typecheck and Jest suite (`tests/`).

## Product Principles

1. Privacy is structural: if data can leave the device, the design is wrong.
2. Calm over clever: the app is a quiet memory, never a noisy feed.
3. Every person is actionable: any contact leads to a next step (follow-up, meeting, introduction).
4. Optional stays optional: permissions and lock are invited, never demanded.
5. Bilingual parity: no feature ships English-only.

## Accessibility & Inclusion

General productivity audience, rated 4+. No product-specific accessibility requirement established beyond platform defaults; Dynamic Type and VoiceOver support follow iOS conventions.
