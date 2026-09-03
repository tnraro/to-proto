# Design Decisions

Rationale behind non-obvious design choices. What the system does is visible in the code; this file records why it does it that way. If a decision changes, update this file.

## Migrations are synchronous and versioned by list position

`Migration.up` must be synchronous: it runs inside the `upgradeneeded` transaction, which commits as soon as its request queue goes idle, so async work cannot be reliably awaited there — a rejected promise would surface as an unhandled rejection while the DB still opens. `DB_VERSION` is `MIGRATIONS.length` and each migration's version is its index + 1, so the previously possible drift between a hardcoded constant and the migration list is impossible by construction.

## Data migrations run async after the DB opens

Schema migrations stay synchronous inside `upgradeneeded`; data migrations run after the connection opens and block the first read/write — all store access goes through `openDB`, which awaits them. Their `up` is async because it awaits IDB requests inside a normal readwrite transaction, where pending requests keep the transaction alive; other async work (image decode, fetch) must happen outside the tx.

Progress is a `meta`-store marker written inside each migration's own transaction rather than in localStorage: writing it in the same tx makes the migration atomic (a crash retries it whole), and transaction serialization keeps concurrent tabs from double-applying. Migrations must never blind-write: they can run on empty stores (fresh installs) and retry after a crash, so inserts must be existence-guarded and id changes must cascade every reference within the same transaction.

Seeded defaults (the built-in '식사' marker type) belong in data migrations rather than app code: the marker makes the seed run exactly once, so a user deleting the default is respected — an app-level "seed when empty" would resurrect it on every launch. If a user already created a type named '식사', its id is canonicalized to the fixed `meal` id and referencing markers are cascaded, instead of seeding a duplicate.
