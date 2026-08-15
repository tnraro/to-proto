Follow the DRY, KISS, YAGNI, and SOLID principles in code.
Use clear and concise English in documents or comments. Exception: keep proper nouns as-is (원문 그대로).
Write comments and docs only to preserve human intent, macro-level rules, or context that the code does not carry. Do not write anything that is already visible by reading the code (what it is, how it was implemented, etc.).
All documents must exist under the `docs/` directory with structured paths.
When changing the IndexedDB schema, bump DB_VERSION in `src/lib/db.ts` and write a migration in `src/lib/migrations.ts`.
