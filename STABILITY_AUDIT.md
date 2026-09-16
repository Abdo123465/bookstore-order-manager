# Stability & Crash Resistance Audit

## Scope

Wave 3 reviews crash resistance, recovery behavior, race-condition exposure, and error visibility using source evidence only.

## Summary

- `App.tsx` can fail into a console-only path if the initial data load fails.
- `services/storage.ts` contains several fallback-return branches that convert failures into empty arrays or `null`.
- `OrderList.tsx` schedules delayed export/print work with `setTimeout` and no cancellation path.
- `Toast.tsx` and `SearchableSelect.tsx` use timers that rely on component lifecycle behaving perfectly.
- `main.cjs` is the strongest area: startup faults are surfaced clearly and do not fail silently.

## Findings

### S-01 Silent fallback returns hide real failures

- Evidence: `services/storage.ts:106`, `services/storage.ts:117`, `services/storage.ts:412`, `services/storage.ts:476`, `services/storage.ts:519`, `services/storage.ts:535`.
- Impact: high
- Risk: medium
- Expected gain: high
- Why it matters: several failures collapse into `[]` or `null`, which can make the UI look empty or partially broken without a clear recovery path.
- Recommended fix: surface a structured error state to the UI for critical fetches, and reserve fallback-empty results for truly optional data.

### S-02 Startup data load can degrade into an empty shell

- Evidence: `App.tsx:19-32`.
- Impact: high
- Risk: medium
- Expected gain: medium
- Why it matters: initial rendering depends on `initDB()` and `getOrdersWithCustomerDetails()`. If either fails, the app only logs the error and continues with whatever state happened to exist.
- Recommended fix: show a visible startup error state or retry prompt instead of only logging to the console.

### S-03 Delayed export and print work has no cancellation path

- Evidence: `components/OrderList.tsx:70`, `components/OrderList.tsx:132`, `components/OrderList.tsx:179`.
- Impact: medium
- Risk: medium
- Expected gain: medium
- Why it matters: `setTimeout` defers heavy DOM capture and print setup, but the component does not cancel those timers on unmount. That can cause stale work to run after state changes or navigation.
- Recommended fix: store timer ids and clear them in a cleanup path, or replace delayed work with a controlled async flow.

### S-04 Toast timers can outlive rapid UI changes

- Evidence: `components/Toast.tsx:11-18`.
- Impact: low
- Risk: low
- Expected gain: low
- Why it matters: each toast schedules its own dismissal timer, but the timer is not explicitly cleared. Rapid updates or unmounts can leave old callbacks firing later than intended.
- Recommended fix: keep the timeout id in a ref and clear it in cleanup.

### S-05 Search dropdown focus delay is not cancellable

- Evidence: `components/SearchableSelect.tsx:33-41`, `components/SearchableSelect.tsx:57`.
- Impact: low
- Risk: low
- Expected gain: low
- Why it matters: the deferred focus callback can run after the component closes or unmounts. This is usually harmless, but it is still a small lifecycle hazard.
- Recommended fix: track and clear the pending timeout when the dropdown closes or unmounts.

### S-06 Order read-model rebuild can fail without local recovery

- Evidence: `services/order.service.ts:449-471`.
- Impact: high
- Risk: medium
- Expected gain: medium
- Why it matters: the denormalized read-model path performs multiple reads in sequence and depends on all of them succeeding. In local mode, a single failure bubbles up to the caller without an internal recovery plan.
- Recommended fix: either cache lookup tables with invalidation or wrap read-model assembly in a more explicit recovery path.

### S-07 SQL logging is diagnostic, but not failure-aware

- Evidence: `services/storage.ts:75-86`.
- Impact: low
- Risk: low
- Expected gain: low
- Why it matters: log writes are useful, but a logging failure only goes to `console.error`. That is acceptable for diagnostics, but not ideal for a `Zero Silent Failures` target.
- Recommended fix: add an optional in-memory fallback or a visible diagnostic state when the local log table is unavailable.

## Stability Score

- Crash resistance: 6.5/10
- Recovery quality: 5.5/10
- Race-condition exposure: 6.5/10
- Failure visibility: 5/10
- Lifecycle hygiene: 7/10

## Highest-Value Fix Candidates

1. Replace silent fallback returns with explicit error states for critical data loads.
2. Add visible startup failure handling in `App.tsx`.
3. Clear deferred timers in `OrderList.tsx`, `Toast.tsx`, and `SearchableSelect.tsx`.
4. Introduce a controlled recovery path for denormalized order reads.
5. Decide which storage failures should block the screen and which can be treated as optional.

## Notes

- `main.cjs` is comparatively strong on stability because it reports startup faults through `dialog.showErrorBox` and `console.error`.
- The most important gap is not a crash loop; it is the tendency for failure to collapse into an empty UI or missing data without a user-facing explanation.

