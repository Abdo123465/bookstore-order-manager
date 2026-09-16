# Dependency Map

## High-Level Graph

```text
main.cjs
  -> preload.cjs
  -> window.electron
  -> services/* (renderer side)
  -> SQLite / printing / IPC

index.tsx
  -> App.tsx

App.tsx
  -> services/storage
  -> services/order.service
  -> Header, Dashboard, UnifiedOrderForm, OrderList, AdminPanel, SQLLogPanel, ToastContainer

AdminPanel.tsx
  -> OrderList
  -> CustomerList
  -> Reports
  -> SettingsPanel

UnifiedOrderForm.tsx
  -> services/order.service
  -> services/storage
  -> SearchableSelect
  -> Toast

OrderList.tsx
  -> services/order.service
  -> EditOrderModal
  -> XLSX / jsPDF / html-to-image
  -> window.electron.printReceipt

EditOrderModal.tsx
  -> services/order.service
  -> services/storage
  -> SearchableSelect

SettingsPanel.tsx
  -> services/storage
  -> ConfirmModal
  -> Toast

CustomerList.tsx
  -> services/customer.service
  -> ConfirmModal
  -> Toast

SQLLogPanel.tsx
  -> services/storage

services/order.service.ts
  -> types.ts
  -> services/config
  -> services/supabase.service
  -> services/storage.logSQL
  -> services/customer.service

services/customer.service.ts
  -> types.ts
  -> services/config
  -> services/supabase.service
  -> services/storage.logSQL

services/storage.ts
  -> services/config
  -> services/supabase.service
  -> types.ts

services/supabase.service.ts
  -> services/supabase.config.ts
```

## Core Modules

### Main process core

- `main.cjs`
- `preload.cjs`

These are the Electron runtime foundation.

### Renderer core

- `index.tsx`
- `App.tsx`
- `services/storage.ts`
- `services/order.service.ts`
- `services/customer.service.ts`

These modules define the application data path.

### Shared domain core

- `types.ts`
- `services/config.ts`
- `services/supabase.config.ts`
- `services/supabase.service.ts`

These modules define the data model and backend selection.

## Observed Coupling

### Strong coupling

- `order.service.ts` depends on `customer.service.ts` to auto-create customers during order creation.
- `customer.service.ts` and `order.service.ts` both depend on `storage.logSQL` for local audit logging.
- `App.tsx` depends directly on the storage and order services to bootstrap the first data load.
- `SettingsPanel.tsx` depends heavily on `services/storage.ts` for all reference-table mutations.

### Moderate coupling

- `OrderList.tsx` combines business actions, export behavior, and printing.
- `EditOrderModal.tsx` combines display logic, data loading, and status/deposit recalculation.
- `AdminPanel.tsx` acts as a tab router and authentication gate.

### Loose coupling

- `Header.tsx`
- `Dashboard.tsx`
- `Reports.tsx`
- `ConfirmModal.tsx`
- `SearchableSelect.tsx`
- `Toast.tsx`

These are mostly presentational or event-driven.

## Potential Circular Dependencies

No confirmed runtime circular dependency is visible in the active graph.

### Why

- `order.service.ts` imports `customer.service.ts`, but `customer.service.ts` does not import `order.service.ts`.
- `customer.service.ts` imports `storage.ts`, but `storage.ts` does not import `customer.service.ts`.
- `storage.ts` imports `supabase.service.ts`, which only depends on static Supabase config.

### What to watch

- `storage.ts` is a wide adapter and may become a coupling hotspot if more services start importing each other through it.
- `OrderList.tsx` and `EditOrderModal.tsx` both sit close to business logic and UI logic, which can become expensive over time.

## Unused or Parallel Modules

The following modules are present but not on the active import path from `App.tsx`:

- `services/storage.cloud.ts`
- `services/order.service.cloud.ts`
- `services/customer.service.cloud.ts`

They should be treated as alternate implementations or reference copies unless the app is refactored to use them directly.

