# Future sync design

SQLite remains the source of truth. A future sync engine can push rows where `sync_status=pending`, pull remote rows, compare `version` and `updated_at`, preserve `deleted_at`, and mark conflicts for user review. The eventual boundary is Mobile SQLite → Sync Engine → REST API → PostgreSQL. No sync code or backend belongs in this MVP.
