# Development

Procedures for working on this project. What exists and how it behaves lives in the source code; this file covers only commands and rules that the code does not show.

## Requirements

- [bun](https://bun.sh)

## Commands

```sh
bun install          # install dependencies
bun run dev          # start the Vite dev server
bun run build        # tsc -b && vite build
bun run lint         # oxlint
bun test src/lib     # unit tests (pure logic: filters, migrations, thresholds)
bun run icons        # regenerate public/ icons (scripts/gen-icons.mjs, sharp-based)
```

## Verification

Run the full check before finishing any change:

```sh
bunx tsc -b --noEmit && bunx oxlint src && bun test src/lib && bun run build
```

## Rules

- Changing the IndexedDB schema requires bumping `DB_VERSION` in `src/lib/db.ts` and adding a migration in `src/lib/migrations.ts`. Never edit already-shipped migration snapshots — add a new version instead.
- Follow AGENTS.md for comment and documentation policy.
