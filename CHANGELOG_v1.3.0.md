# Bookstore Order Manager
## Version 1.3.0 LTS (Stable)

---

## Improvements

- **Central Error Handler** — Unified error capture across services and UI
- **Structured Logging** — Timestamped, level-filtered logs with context
- **Error Boundary** — React error boundary wrapping the entire app
- **Startup Recovery** — Non-blocking bootstrap with background DB init
- **Shared Reference Cache** — In-memory cache for publishers, years, subjects, employees
- **Progressive Startup** — Shell renders immediately, data loads in background
- **Optimized Refresh Pipeline** — Reference mutations no longer trigger order re-fetches
- **Memoized Derived Data** — Filtered orders, dashboard metrics, and report metrics computed in single pass
- **Modular OrderList Architecture** — Decomposed from 1247-line feature container into a thin coordinator:

  ```
  OrderList (Coordinator)
   ├── OrderFilters       — Search + status filter (stateless query interface)
   ├── OrderTable         — Pure presentational data table
   ├── OrderDialogs       — Edit modal + delete confirmation (renders only, no decisions)
   ├── BatchReport        — Hidden batch PDF template
   ├── ProfessionalReport — Hidden single-order report template
   └── ThermalReceipt     — Hidden thermal receipt template
  ```

- **Export Services** — `order-export.ts` (Excel + batch PDF), fully React-free
- **PDF Services** — `order-pdf.ts`, `receipt-pdf.ts`, fully React-free
- **Print Services** — `receipt-print.ts`, fully React-free

## Performance

- Faster startup — Progressive loading, no blocking
- Lower database queries — Reference cache eliminates redundant fetches
- Reduced renderer workload — Memoized derived data, single-pass computations
- Better stability — Structured error handling, granular failure recovery

## Compatibility

- Database format unchanged — Existing data remains compatible
- No breaking API changes
- All existing orders, customers, and settings preserved

---

### Checksums (SHA-256)

*To be generated after distribution*

### Installation

1. Download `Bookstore Order Manager Portable.exe`
2. Run the executable — no installation required
3. Database is stored locally; data persists across sessions

---

*Built with Electron 40, React 19, Vite 6, and SQLite (better-sqlite3)*
