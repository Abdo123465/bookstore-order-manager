# Project Architecture

## Overview

This project is a React + Electron order management app with two data backends:

- Local SQLite via Electron IPC
- Supabase via direct browser-side calls

The active backend is controlled by `services/config.ts`, where `USE_CLOUD` currently points the app to the Supabase branch, while the Electron main process still initializes the local SQLite runtime for portability and logging.

## Entry Points

- `main.cjs`: Electron main process, SQLite bootstrap, IPC handlers, and window creation
- `preload.cjs`: Safe bridge between the renderer and Electron APIs
- `index.tsx`: React renderer bootstrap
- `App.tsx`: UI composition and initial data loading

## Process Model

### Electron main process

- Creates the primary `BrowserWindow`
- Loads the React UI from `http://localhost:3000` in dev or `dist/index.html` in production
- Initializes the local SQLite database
- Exposes IPC handlers for database access and printing
- Enforces single-instance behavior

### Renderer process

- React renders all application screens
- Components manage local UI state with `useState` and `useEffect`
- Data access happens through service modules, not directly from components
- The renderer talks to Electron through `window.electron` from `preload.cjs`

## Runtime Modes

### Development

- `npm run dev` starts Vite on port `3000`
- `npm run electron:dev` now waits for Vite before launching Electron
- DevTools are opened automatically in `main.cjs`

### Production

- Electron loads static files from `dist`
- Local SQLite data is stored next to the executable under `database`
- The production path does not depend on Vite

## Core Subsystems

### UI Shell

- `Header.tsx` controls top-level navigation and log toggling
- `App.tsx` switches between dashboard and admin mode
- `AdminPanel.tsx` gates admin features behind a simple password check

### Order Workflow

- `UnifiedOrderForm.tsx` creates orders
- `OrderList.tsx` displays, filters, exports, updates, and deletes orders
- `EditOrderModal.tsx` edits orders and item statuses
- `Dashboard.tsx` calculates order counts and revenue summaries
- `Reports.tsx` renders aggregate statistics and detailed summaries

### Reference Data

- `SettingsPanel.tsx` manages publishers, academic years, subjects, employees, payment methods, and app settings
- `CustomerList.tsx` manages customer CRUD
- `SearchableSelect.tsx` provides searchable pickers for reference tables

### Logging and Feedback

- `SQLLogPanel.tsx` shows SQL activity from the local adapter
- `Toast.tsx` exposes a global toast event bus
- `ConfirmModal.tsx` handles destructive-action confirmation

## Data Backends

### Active adapter

`services/storage.ts` is the active storage adapter. It exposes a unified API and switches between cloud and local implementations based on `USE_CLOUD`.

### Cloud path

- `services/order.service.ts`
- `services/customer.service.ts`
- `services/storage.ts`
- `services/supabase.service.ts`

These modules switch behavior at runtime.

### Local path

- `main.cjs` owns the SQLite engine and IPC handlers
- `preload.cjs` exposes `window.electron.db`
- The renderer uses that bridge through `services/storage.ts`, `services/order.service.ts`, and `services/customer.service.ts`

### Alternate cloud modules

The repository also contains `services/storage.cloud.ts`, `services/order.service.cloud.ts`, and `services/customer.service.cloud.ts`. These are not imported by the current renderer path and appear to be alternate or legacy adapter implementations.

## State Model

### Global React state

`App.tsx` is the main UI orchestrator and owns:

- `showLogs`
- `orders`
- `view` (`dashboard` or `admin`)

### Local component state

Most components use local `useState` and `useEffect` state:

- `UnifiedOrderForm.tsx`: form fields, draft persistence, reference data, deposit calculation
- `EditOrderModal.tsx`: order editing state, item statuses, deposit adjustments
- `OrderList.tsx`: filters, modal state, export state, receipt state
- `SettingsPanel.tsx`: reference data forms and settings forms
- `CustomerList.tsx`: edit/search/delete state
- `AdminPanel.tsx`: auth gate and tab selection
- `SearchableSelect.tsx`: dropdown state and search text
- `Toast.tsx`: ephemeral toast state
- `SQLLogPanel.tsx`: log list and scroll position

### Missing shared state layer

There is no React Context, no reducer/store, and no central query cache. Data is refreshed by calling service functions and then setting component state manually.

## Reliability Notes

The current architecture already avoids some silent failures by:

- wrapping several service operations in `try/catch`
- logging SQL actions in local mode
- surfacing toast feedback in UI actions

However, several flows still rely on console logging and fallback returns, so the repo is a good candidate for a dedicated `Zero Silent Failures` pass later.

