# Data Flow

## 1. Application Startup

### Electron

1. `main.cjs` starts first.
2. It requests the single-instance lock.
3. It sets the portable `userData` path in production.
4. It initializes SQLite.
5. It creates the main window.
6. In development, it loads `http://localhost:3000`.
7. In production, it loads `dist/index.html`.

### React

1. `index.tsx` mounts `App`.
2. `App.tsx` calls `initDB()` from `services/storage`.
3. `App.tsx` loads orders via `getOrdersWithCustomerDetails()`.
4. Child components receive data through props or load their own reference data.

## 2. Create Order Flow

### UI

- `UnifiedOrderForm.tsx` collects customer, payment, date, note, and book-item fields.
- It loads reference tables and app settings on mount.
- It loads and saves a draft using `getDraft`, `saveDraft`, and `clearDraft`.

### Business logic

- The form filters incomplete book items.
- It calculates the total deposit from `settings.depositPerBook`.
- It splits paid amount into `deposit` and `excess_deposit`.

### Service layer

- `createOrder()` is called from `services/order.service.ts`.
- The service checks whether the customer already exists.
- If not, it creates the customer first via `addCustomer()`.
- Then it inserts the order with the resolved customer id.

### Persistence

- In cloud mode, the order goes to Supabase directly.
- In local mode, the order is written through Electron IPC into SQLite.
- After success, the form resets and the parent list refreshes.

## 3. Update Order Flow

### UI

- `OrderList.tsx` opens `EditOrderModal.tsx` for edits.
- `EditOrderModal.tsx` loads fresh reference tables and settings whenever it opens.

### Business logic

- The modal allows editing:
  - customer-facing fields
  - deposit and excess deposit
  - payment method
  - dates
  - notes
  - per-item statuses
- It recalculates the required deposit from active book items.
- It preserves compatibility by still deriving a primary subject and first item for legacy fields.

### Service layer

- `updateOrder()` recalculates order status from the item statuses.
- In local mode, it checks for duplicate orders before updating.
- In cloud mode, it updates the Supabase row directly.

## 4. Customer Flow

- `CustomerList.tsx` loads customers on mount.
- It supports search, edit, and delete.
- All mutations go through `services/customer.service.ts`.
- The service switches between SQLite and Supabase based on `USE_CLOUD`.

## 5. Reference Data and Settings

- `SettingsPanel.tsx` loads publishers, academic years, subjects, employees, payment methods, and app settings.
- Add/update/delete actions go through `services/storage.ts`.
- App settings are validated before saving, especially employee capacity.
- Employee ordering is normalized by `sort_order`.

## 6. Read Models

- `Dashboard.tsx` computes order counts and revenue from the `orders` prop.
- `Reports.tsx` computes:
  - order status totals
  - book status totals
  - type totals
  - daily totals
  - detailed per-order reporting
- `SQLLogPanel.tsx` consumes the local SQL log stream from `getSQLLogs()`.

## 7. Logging and Feedback

- `Toast.tsx` uses a custom window event to show transient messages.
- `logSQL()` writes local queries to the SQLite logs table when the local adapter is active.
- `SQLLogPanel.tsx` listens for `sql-log-updated` and refreshes automatically.

## 8. Cloud vs Local Branching

### Cloud

- Reads and writes hit Supabase directly.
- Settings and drafts are stored in the `settings` table.
- Reference tables are queried through Supabase.

### Local

- Reads and writes go through Electron IPC.
- SQLite stores the same core entities.
- SQL activity is logged locally for inspection.

## 9. Current Failure Characteristics

The codebase is already partially defensive, but not fully fail-safe:

- Many service calls use `try/catch` and log errors.
- Some UI refresh paths only log to console when fetches fail.
- Draft saves and log writes are non-blocking and may fail silently from the user’s perspective.

This makes the repository a good fit for the proposed `Zero Silent Failures` objective.

