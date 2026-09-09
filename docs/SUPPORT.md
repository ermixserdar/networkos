# NetworkOS – Support (v1.0)

## Get help
Email: support@networkos.app
Response target: within 2 business days.

Include: app version (More > About shows 1.0.0), iOS version, and steps to reproduce.

## Quick start for App Review / new users (no login needed)
1. Open the app → enter any first name → tap **Start building your network**. Nothing is sent anywhere.
2. **Home > +** adds a contact manually.
3. **Import** (optional) is the only place iOS Contacts permission is requested.
4. **Network tab:** select a person to see the local graph (needs 2+ linked contacts, otherwise empty state is normal).
5. **Follow-up tab:** set a follow-up date on a contact to see a reminder row.
6. **More > Security:** biometric lock is optional; safe to skip on simulator.
7. **More > Backup:** encrypted export stays on-device; CSV export shows an unencrypted warning by design.

## FAQ
- **Do I need an account?** No. There is no server.
- **Where is my data?** Encrypted SQLite on your device, key in SecureStore/Keychain.
- **I denied Contacts permission?** Settings > NetworkOS > Contacts to re-enable, or add people manually.
- **Biometrics fail on simulator?** Expected — enable them on a real device, or leave App Lock off.
- **How do I delete everything?** Delete the app. There is no cloud copy.

## Languages
English + Türkçe. Language follows system setting, changeable in More > Language.

---
TODO before App Review: publish at https://networkos.app/support (URL referenced in `store.config.json`).
