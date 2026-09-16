# Module Map

## Root Files

| Module | Role | Notes |
|---|---|---|
| `main.cjs` | Electron main process | Window creation, SQLite bootstrap, IPC, printing |
| `preload.cjs` | Renderer bridge | Exposes `window.electron` |
| `index.tsx` | React bootstrap | Mounts `App` into `#root` |
| `App.tsx` | UI orchestrator | Loads data and switches between dashboard/admin |
| `index.css` | Global styling | Shared styles for the app shell |
| `types.ts` | Shared types | Order, customer, settings, and reference-table models |
| `vite.config.ts` | Dev/build config | Vite server runs on port `3000` |
| `package.json` | Tooling and scripts | Dev, Electron, and build scripts |

## Components

| Module | Role | Dependencies |
|---|---|---|
| `components/Header.tsx` | App header and navigation | `React`, `lucide-react` |
| `components/Dashboard.tsx` | Summary cards for orders and revenue | `types.ts` |
| `components/UnifiedOrderForm.tsx` | Create-order form | `services/order.service`, `services/storage`, `SearchableSelect`, `Toast` |
| `components/OrderList.tsx` | Search/filter/update/export orders | `services/order.service`, `EditOrderModal`, export libs |
| `components/EditOrderModal.tsx` | Edit an existing order | `services/order.service`, `services/storage`, `SearchableSelect` |
| `components/AdminPanel.tsx` | Admin gate and tab shell | `OrderList`, `CustomerList`, `Reports`, `SettingsPanel` |
| `components/CustomerList.tsx` | Customer CRUD screen | `services/customer.service`, `ConfirmModal`, `Toast` |
| `components/SettingsPanel.tsx` | Reference data and app settings | `services/storage`, `ConfirmModal`, `Toast` |
| `components/Reports.tsx` | Aggregate reporting | `types.ts` |
| `components/SQLLogPanel.tsx` | SQLite log viewer | `services/storage` |
| `components/SearchableSelect.tsx` | Searchable dropdown | Local UI state only |
| `components/ConfirmModal.tsx` | Confirmation dialog | Local UI state only |
| `components/Toast.tsx` | Global toast event bus | Window custom event |

## Services

| Module | Role | Dependencies |
|---|---|---|
| `services/config.ts` | Backend switch | `USE_CLOUD` flag |
| `services/supabase.config.ts` | Supabase URL/key | Static config |
| `services/supabase.service.ts` | Supabase client factory | `@supabase/supabase-js`, config |
| `services/storage.ts` | Unified storage adapter | `config`, `supabase.service`, `types` |
| `services/order.service.ts` | Order CRUD and denormalized reads | `types`, `config`, `supabase.service`, `storage.logSQL`, `customer.service` |
| `services/customer.service.ts` | Customer CRUD | `types`, `config`, `supabase.service`, `storage.logSQL` |
| `services/storage.cloud.ts` | Alternate cloud adapter | `supabase.service`, `types` |
| `services/order.service.cloud.ts` | Alternate cloud order adapter | `types`, `supabase.service`, `customer.service.cloud` |
| `services/customer.service.cloud.ts` | Alternate cloud customer adapter | `types`, `supabase.service` |

## Scripts

| Module | Role |
|---|---|
| `scripts/migrate-to-supabase.cjs` | One-time SQLite to Supabase migration |
| `scripts/check_and_migrate.cjs` | Maintenance/migration helper |
| `scripts/check_supabase.cjs` | Supabase connectivity/data check |
| `scripts/diagnose_supabase.cjs` | Supabase troubleshooting helper |
| `scripts/fix_sequences.cjs` | SQLite or Supabase sequence repair helper |
| `scripts/fix_sequences_rest.cjs` | Additional sequence repair helper |

## Database Artifacts

| Path | Role |
|---|---|
| `database/library.db` | Local SQLite database |
| `database/library.db-wal` | SQLite write-ahead log |
| `database/library.db-shm` | SQLite shared memory file |

## Active vs Inactive Code

### Actively used

- `main.cjs`
- `preload.cjs`
- `index.tsx`
- `App.tsx`
- `services/storage.ts`
- `services/order.service.ts`
- `services/customer.service.ts`
- `services/supabase.service.ts`
- `components/*`

### Present but not imported by the current UI flow

- `services/storage.cloud.ts`
- `services/order.service.cloud.ts`
- `services/customer.service.cloud.ts`

These are useful for reference, but they are not on the active import path from `App.tsx`.

