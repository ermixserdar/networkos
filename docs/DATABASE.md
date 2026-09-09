# Database

`networkos.db` is created with Expo SQLite. The first-run key is generated at the database boundary and stored in SecureStore; the database opens with foreign keys and WAL enabled. Migrations use `PRAGMA user_version` and run transactionally. Business rows are soft-deleted with `deleted_at`.

Note: production SQLCipher requires a development/custom native build with a SQLCipher-backed SQLite implementation; Expo Go's bundled SQLite is not SQLCipher. The key plumbing is isolated in `src/database/database.ts` so the native adapter can be swapped without changing repositories.
