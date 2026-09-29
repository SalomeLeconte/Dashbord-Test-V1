# Resumable batched INSEE synchronization

Goal: replace the monolithic INSEE refresh with resumable batches that stay below the 30 requests/minute API quota.

## Design
- Persist cursor state in D1: department index, NAF index, page offset, counters and cycle status.
- One batch performs at most 20 INSEE HTTP requests, leaving quota headroom.
- Each successful page is upserted immediately before advancing the cursor.
- 404/Aucun advances the scope with zero rows.
- 429 stops the batch without losing the cursor; a later batch resumes.
- Completion applies known-SIRET exclusion and marks refresh success.
- Admin endpoint starts/resumes one batch; protected cron endpoint does the same.

## Files
- `functions/_lib/insee-batch-state.js`: cursor creation/advance/persistence helpers.
- `functions/_lib/insee-batch-sync.js`: bounded batch executor.
- `functions/api/admin/insee-sync.js`: start/resume endpoint.
- `functions/api/cron/insee-sync.js`: protected batch endpoint.
- `tests/insee-batch-state.test.mjs`: cursor behavior.

## Validation
1. New cycle starts at first department/NAF offset 0.
2. Page with more results advances offset by 100.
3. Last page advances to next NAF, then next department.
4. Batch stops after <=20 API calls and reports `hasMore=true`.
5. Next invocation resumes persisted cursor.
6. Final invocation marks cycle complete and runs known-company exclusion.
