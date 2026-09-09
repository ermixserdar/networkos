# Security

No login or network service is required. Data stays on-device. SecureStore is the only storage location for the database key. App lock is optional and uses OS biometrics through Expo Local Authentication. The app should be built with a SQLCipher-enabled native SQLite adapter before production release; this is a native build concern, not a server dependency.
