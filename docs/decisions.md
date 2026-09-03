# Design Decisions

Rationale behind non-obvious design choices. What the system does is visible in the code; this file records why it does it that way. If a decision changes, update this file.

## Migrations are synchronous and versioned by list position

`Migration.up` must be synchronous: it runs inside the `upgradeneeded` transaction, which commits as soon as its request queue goes idle, so async work cannot be reliably awaited there — a rejected promise would surface as an unhandled rejection while the DB still opens. `DB_VERSION` is `MIGRATIONS.length` and each migration's version is its index + 1, so the previously possible drift between a hardcoded constant and the migration list is impossible by construction.
