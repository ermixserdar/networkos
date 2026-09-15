# Database

`networkos.db` is created with Expo SQLite over SQLCipher (see `docs/SECURITY.md`). It opens with foreign keys and WAL enabled, and `getDatabase()` memoises one handle so concurrent callers at startup share a single migration run.

## Migrations

Numbered by `PRAGMA user_version`, applied in one transaction:

1. Core tables: companies, contacts, relationships, interactions, tags, contact_tags, owner_profile.
2. `commitments`.
3. `events`, `event_contacts`.
4. `phone_norm` and lookup indexes.
5. `contacts.cadence_days`; `commitments.direction` plus sync columns; sync columns on `events`; `created_at`/`updated_at`/`deleted_at` on the join tables — a hard `DELETE` cannot propagate through sync, so join rows are soft-deleted too; `sync_state`.
6. `contacts_fts` (FTS5, `unicode61 remove_diacritics 2`) with triggers keeping it in step with `contacts`.

7. `contacts.photo` (a small JPEG thumbnail as a data URI) and `contacts.private`; the `goals` table.

8. `contacts.device_contact_id`, with a unique partial index on `(device_contact_id) WHERE device_contact_id IS NOT NULL AND deleted_at IS NULL` — one phone-book entry belongs to one live contact, and a soft delete frees it again.

Migration 6 is applied outside the main loop and its failure is caught: if a build lacks FTS5, `hasFullTextSearch()` returns false and search falls back to `LIKE`. Migration 7 runs after it so version numbers stay ordered even on a build without FTS5.

## Conventions

- UUID primary keys, millisecond timestamps, soft deletes via `deleted_at`.
- Every syncable row carries `updated_at` and `version`; repositories bump `version` on write.
- `relationships` stores each pair once, ordered, with a partial unique index on `(min(a,b), max(a,b)) WHERE deleted_at IS NULL`. Writers must look the pair up before inserting — `ON CONFLICT(id)` can never fire for it.
- Search goes through `contacts_fts` with prefix terms; company names are matched with a narrow `LIKE` because they live on another table.
- `device_contact_id` is the one column that never leaves the device: it is absent from `SnapshotService.SPECS`, so backups, shares and device-to-device sync neither carry nor overwrite it, and `AddressBookSyncService` rebuilds it from phone/email after a restore. It is written by `ContactRepository.linkDevice`, which deliberately leaves `updated_at`/`version` alone so a link cannot win a sync merge.
- Photos live in the row, not on disk: a ~256px JPEG data URI, capped at 200 KB. That keeps them encrypted at rest and carries them through backup and sync without a second transport.
- Deletes are recoverable. `remove()` sets `deleted_at`, `restore()` clears it, and `purge()` is the only call that issues a real `DELETE`.

## Guardrails

`tests/sql-arity.test.ts` walks every static SQL statement in `src/` and asserts placeholders and bound arguments agree. A five-placeholder/four-argument `INSERT` shipped once and broke tag creation for every user; typecheck cannot see that class of bug.
