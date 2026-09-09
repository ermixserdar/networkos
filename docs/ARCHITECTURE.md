# NetworkOS architecture

NetworkOS is local-first: UI → hooks/view models → services → repositories → encrypted SQLite. UI components never query SQLite directly. UUIDs, soft deletes, `version`, `sync_status`, and millisecond timestamps are present so a future sync engine can be added without changing the domain layer.

The network graph reads a bounded neighborhood (selected person, depth 1–3, maximum 150 nodes). `NetworkService` owns traversal and deterministic relationship health; future AI features must call this service rather than access the database.
