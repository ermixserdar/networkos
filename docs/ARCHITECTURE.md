# NetworkOS architecture

Local-first: UI → hooks → services → repositories → encrypted SQLite. Components never query SQLite directly.

## Layers

- `src/repositories` — one module per table. All SQL lives here. Lists are paged and counted in SQL; nothing filters a full table in JS.
- `src/services` — behaviour that spans tables: follow-ups and cadence, notifications, network analysis, introductions, snapshots, backup/share/sync, calendar briefings, phone-book sync.
- `src/components/ui.tsx` — themed primitives (`Screen`, `Card`, `Btn`, `Field`, `Chip`, `Rating`, `Checkbox`) with 44 pt minimum targets and accessibility roles. `useFocusRefresh` re-reads on every focus, so navigating back never shows stale rows.
- `src/i18n.ts` — the single string table. Every user-visible string is a key with an English and a Turkish value; `TranslationKey` is derived from the English table, so a missing Turkish string is a type error.
- `src/theme.ts` — light and dark palettes behind `useTheme()`; the mode follows the system unless the user overrides it.

## Phone-book sync

`AddressBookSyncService` keeps already-imported contacts current, one way: the address book is read, never written. Every trigger — cold start, foreground, and the OS contacts-change event — calls one `reconcile()`, which does nothing unless the user switched the feature on, fifteen minutes have passed, and the permission is already granted. It never asks for that permission; only the settings toggle does. A run reads the phone book once and matches in memory, so cost does not grow with a contact-by-contact lookup.

The app wins every conflict: only a column the user left empty is filled. `contacts.device_contact_id` records which phone-book entry a contact came from; it is written by `ContactRepository.linkDevice`, which leaves `updated_at`/`version` alone because the column never travels between devices, and it is absent from `SnapshotService` so a restored backup rebuilds it from phone/email. Private contacts are excluded with a literal `private=0` rather than the vault clause: a run may fire while the vault happens to be open, and that is a coincidence, not consent.

## Network analysis

`NetworkService` owns all traversal. Beyond the bounded neighbourhood view (depth 1–3, max 150 nodes) it answers structural questions the picture cannot: `separationCounts` (iterative Tarjan articulation points — who is the only route to whom), `components` (clusters that never meet), company concentration, and dormancy. `IntroductionService` turns the same graph into concrete pairs worth introducing.

The owner is not a row in `contacts`. `ownerGraph` synthesises their node and their edges so the map can be centred on "you".

## Reminders

iOS keeps at most 64 pending local notifications per app and silently discards the rest, so one schedule per contact stops delivering as soon as a network gets real. `ReminderPlanner` is therefore the only thing that schedules dated reminders: it reads every follow-up and birthday from the database, keeps the nearest `REMINDER_BUDGET` (48, leaving headroom for the weekly digest and calendar briefings), and reconciles the difference against what is already scheduled. `selectReminders` is pure, which is where the budget rules are tested.

Callers never schedule directly — they mutate and then call `reconcile()`. Permission is requested at the moment a user sets a follow-up, never from a refresh.

## Paging

`createPager` holds the offset bookkeeping for paged lists outside React. It enforces one in-flight request (or `onEndReached` appends the same page twice) and discards responses that arrive after the query changed. `ContactSelect` builds on the same hook, so a picker searches in SQL instead of showing a fixed slice of the first N contacts.

## The private vault

Contacts flagged `private` are hidden from lists, search, the graph, insights, introductions, reminders, CSV and selective shares until the vault is unlocked for the session — and it re-locks whenever the app backgrounds.

The gate is a module-level default-deny (`VaultService.clause()` spliced into each query) rather than a flag threaded through every call site. Forgetting to pass a parameter in one place would leak exactly what the feature exists to hide, so the state you get by doing nothing is the safe one. Encrypted backups and sync bundles do carry private contacts — they are yours; plain-text CSV and shares never do, whatever the vault state.

## Sync

`SnapshotService` is the portable form of the database: every syncable table, row for row. Backup, selective share and device-to-device sync all use it, so a file written by one can be merged by any of them.

Merging is last-write-wins per row on `updated_at`, with `version` as the tiebreak; `deleted_at` is an ordinary field, so deletions propagate like any other edit. Merges are idempotent — importing the same bundle twice is a no-op the second time. Rows that moved on both devices since the last sync are counted and reported, so a silent overwrite is at least a visible one. Existing keys are read once per table, not once per row. Two identity quirks are handled explicitly: tags match on name (they carry a `UNIQUE(name)` index), and relationships match on the ordered pair (the unique index is on `min/max`, not on `id`).

There is no server and no account. A bundle travels by AirDrop or Files.

Envelopes are sealed table by table (`NETWORKOS3`): the key is derived once from a shared salt and each chunk gets its own nonce, so peak memory during an export or restore is one table rather than several copies of the whole database. `NETWORKOS2` (one blob) and `NETWORKOS1` (device-key) still open.
