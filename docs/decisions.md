# Design Decisions

Rationale behind non-obvious design choices. What the system does is visible in the code; this file records why it does it that way. If a decision changes, update this file.

## Migration helpers stay even though current migrations do not use them

`ensureStore`, `ensureIndex`, `dropStore`, and `copyStore` in `src/lib/migrations.ts` are unused by the shipped migrations. They are kept on purpose: schema migration is a rare, high-risk operation, and these helpers encode the safe patterns (guarded creation, tx-based data copy) that every future migration must follow. Removing them would invite a future migration author to re-derive these patterns ad hoc at the moment of greatest risk. They are not dead weight — they are the tested template for the next schema change.
