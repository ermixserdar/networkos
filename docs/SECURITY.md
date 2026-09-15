# Security

No login and no network service. Data stays on the device.

## Database at rest

`networkos.db` is opened through SQLCipher with a random 256-bit key generated on first run and kept in the keychain (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`).

SQLCipher must be enabled in the **native build**, not just in JS. Plain SQLite silently ignores `PRAGMA key`, so a misconfigured build stores everything in plaintext while looking identical at runtime. Two things guard against that:

- `app.json` sets `["expo-sqlite",{"ios":{"useSQLCipher":true},"android":{"useSQLCipher":true}}]`, and `ios/Podfile.properties.json` sets `expo.sqlite.useSQLCipher=true`. The podspec reads that property; without it the plain `sqlite3` sources are vendored.
- `isEncrypted()` probes `PRAGMA cipher_version` at open time. The About and Security screens show the real answer, and Security shows a warning card when the build is unencrypted.

After changing either setting, run `npx expo prebuild --clean -p ios` and rebuild. Verify by opening the database file with the wrong key: it must fail with `file is not a database`.

## Anything that leaves the device

Backups, selective shares and sync bundles use one envelope format, `NETWORKOS2.<salt>.<nonce>.<ciphertext>` (XSalsa20-Poly1305 via TweetNaCl).

The key is derived from a secret the **user** holds, never from the device:

- **Recovery key** — 160 random bits in Crockford base32, generated once and stored in the keychain. It encrypts backups and sync bundles. Written down, it is the only way to open a backup on a new phone; lost, nobody can recover it.
- **Share code** — 80 random bits, generated per selective share and passed to the recipient out of band.

Derivation is 20 000 iterations of SHA-512 over `salt ‖ secret`. The stretching is deliberate but secondary: both secrets are high-entropy, so the security does not rest on the iteration count.

Secrets are normalised before derivation (uppercased, separators dropped, `O→0`, `I/L→1`, `U→V`), so a hand-copied key still opens the file.

The previous format, `NETWORKOS1`, derived its key from the device database key. Such a backup could only ever be opened by the phone that wrote it, and a "shared" file could not be opened by the recipient at all. v1 envelopes are still readable on the originating device so old backups are not stranded; nothing writes them any more.

## App lock

Biometric lock is optional and uses the OS through Expo Local Authentication. It re-arms whenever the app leaves the foreground, after a grace period the user picks (immediately / 1 min / 5 min), and — unless the user turns it off — the app switcher snapshot is covered.

The lock protects the UI. It is not the mechanism protecting the data: that is SQLCipher plus the keychain.

## Export exemption

The app uses encryption only to protect the user's own data on their own device, which is the standard App Store exemption; `ITSAppUsesNonExemptEncryption` is `false` on that basis.
