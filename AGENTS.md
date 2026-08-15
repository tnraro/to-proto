Follow the DRY, KISS, YAGNI, and SOLID principles in code.
Use clear and concise English in documents or comments. Exception: keep proper nouns as-is (원문 그대로).
Write comments and docs only to preserve human intent, macro-level rules, or context that the code does not carry. Never write what the code already shows: not what it is, not what it does, not how it works. A comment is justified only if deleting it would leave the reader without information the code itself cannot provide.
All documents must exist under the `docs/` directory with structured paths.
When changing the IndexedDB schema, bump DB_VERSION in `src/lib/db.ts` and write a migration in `src/lib/migrations.ts`.
