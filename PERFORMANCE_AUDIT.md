# Performance Audit

## Scope

Wave 2 reviews performance using source evidence only.

## Summary

- `App.tsx` acts as the orchestration layer and performs the initial full refresh.
- `services/order.service.ts` reconstructs denormalized order views using multiple database reads.
- `OrderList.tsx` performs large in-memory filtering, export generation, and image/PDF rendering in the renderer.
- `SettingsPanel.tsx` and `EditOrderModal.tsx` reload multiple reference tables on mount.
- `Toast.tsx`, `SQLLogPanel.tsx`, and `SearchableSelect.tsx` all register browser-event listeners and timers that depend on cleanup correctness.

## Findings

### P-01 Full refresh on startup

- Evidence: `App.tsx:19-30` calls `initDB()` and then `getOrdersWithCustomerDetails()` before the first render is fully settled.
- Impact: medium
- Risk: low
- Expected gain: medium
- Why it matters: the first screen waits for initialization plus a full orders load.

### P-02 Denormalized order load uses multiple reads

- Evidence: `services/order.service.ts:449-471` loads orders, then separately loads `subjects`, `publishers`, and `academic_years`.
- Impact: medium
- Risk: low
- Expected gain: medium
- Why it matters: every refresh rebuilds the same lookup tables in memory instead of caching them.

### P-03 Renderer does heavy export work

- Evidence: `components/OrderList.tsx:70-88`, `components/OrderList.tsx:132-153`, and `components/OrderList.tsx:436-447` create PDFs and images in the UI thread.
- Impact: high
- Risk: medium
- Expected gain: high
- Why it matters: `jsPDF` and `html-to-image` conversion are CPU-heavy and can block interaction on large reports.

### P-04 Large in-memory filtering and mapping

- Evidence: `components/OrderList.tsx:332-405` filters orders, maps them to export rows, and filters again for the detailed list.
- Impact: medium
- Risk: low
- Expected gain: medium
- Why it matters: repeated transforms scale linearly with order count and are recomputed on each render.

### P-05 Reference-data reload fan-out

- Evidence: `components/SettingsPanel.tsx:50-67`, `components/EditOrderModal.tsx:46-68`, and `components/UnifiedOrderForm.tsx:92-109` each load the same reference tables independently.
- Impact: medium
- Risk: low
- Expected gain: medium
- Why it matters: the same data is fetched multiple times across screens instead of being shared or cached.

### P-06 Listener and timer lifecycle is generally clean, but not centralized

- Evidence: `components/SQLLogPanel.tsx:19-23`, `components/Toast.tsx:11-18`, and `components/SearchableSelect.tsx:33-41` add and remove listeners manually; `components/Toast.tsx:15` and `components/SearchableSelect.tsx:57` also use timers.
- Impact: low
- Risk: low
- Expected gain: low
- Why it matters: cleanup is present, but the pattern is repeated in several places, which increases regression risk.

### P-07 Local SQL logging adds extra writes

- Evidence: `services/storage.ts:75-86`, `services/customer.service.ts:48-56`, and `services/order.service.ts:270-271` log many local actions before or alongside the actual query.
- Impact: low
- Risk: low
- Expected gain: low
- Why it matters: logging is helpful for diagnosis, but it adds extra IPC/database work in local mode.

## Performance Score

- React performance: 6.5/10
- Electron startup performance: 7/10
- Database query efficiency: 6/10
- Rendering performance: 5.5/10
- Memory performance: 7/10

## Highest-Value Fix Candidates

1. Cache reference tables and reuse them across forms.
2. Move report/PDF generation off the main render path where possible.
3. Memoize derived order lists and export rows where inputs are stable.
4. Centralize startup and fetch error handling so failures are visible immediately.
5. Consider a shared data layer for reference tables to reduce duplicate loads.

## Notes

- The biggest risk is not a single expensive query; it is the combination of repeated denormalization, repeated reference-table loading, and heavy renderer-side exports.
- No evidence yet suggests a severe blocking issue in Electron startup beyond the cost of database initialization and the initial data fetch.

