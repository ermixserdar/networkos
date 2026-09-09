# NetworkOS – Privacy Policy (v1.0, effective 2026-09-08)

**Short version:** NetworkOS stores everything on your device. No account, no server, no tracking, no ads, no analytics SDK.

## 1. Data we collect
**We collect nothing.** NetworkOS has no backend server and sends no data to us or third parties.

All content you enter — contacts, notes, relationships, follow-ups, commitments, meetings, companies, tags, birthdays — is stored in an encrypted SQLite database **on your device only**.

## 2. Device permissions (all optional)
- **Contacts (`NSContactsUsageDescription`):** Used only when you tap Import, to copy people from iOS Contacts into your local NetworkOS database. Nothing leaves the phone. You can deny permission and enter contacts manually.
- **Face ID / Touch ID (`NSFaceIDUsageDescription`):** Used only if you enable App Lock in More > Security. Authentication happens on-device via Secure Enclave. No biometric data ever leaves the device.
- **Notifications:** If enabled, reminders (follow-ups, birthdays) are scheduled locally with `expo-notifications`. No push server is used.
- **Files / Share sheet:** Backup export writes a file to your device storage only when you explicitly tap Export.

`accessesContactNotes` is declared because imported contact notes may be copied into your local database at your request.

## 3. Backup & export
- **Encrypted backup** (`.networkos` file): encrypted on-device with a key stored in iOS SecureStore / Keychain. Only someone with your device can restore it.
- **CSV export:** explicitly marked in-app as **not encrypted** — anyone with the file can read it. Only export CSV if you understand this.

## 4. No tracking, no third-party SDKs
No analytics, crash-reporting, advertising, or cross-app tracking SDKs are included in v1.0. `ITSAppUsesNonExemptEncryption` is `false` (standard iOS encryption only).

## 5. Data retention & deletion
Your data lives as long as the app is installed. Deleting the app deletes the local database. There is nothing to request from us because we hold no copy.

## 6. Children
The app is a general productivity tool with no objectionable content (rated 4+). No data is collected from anyone, including children.

## 7. Contact
Questions: support@networkos.app

---
TODO before App Review: publish this file at https://networkos.app/privacy (URL referenced in `store.config.json`).
