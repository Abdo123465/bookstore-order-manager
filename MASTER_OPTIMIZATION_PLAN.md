# Stage 3 — Master Optimization Plan (Execution Roadmap)

---

## 1. Executive Summary

### Current State

React + Electron order management app with dual backends (local SQLite via IPC, cloud Supabase). Three audit waves completed:

| Wave | Status | Focus |
|---|---|---|
| Wave 1 — Architecture | PASS | Entry points, data flow, module graph, service layer |
| Wave 2 — Performance | PASS | Hotspots: OrderList, Reference Data, Startup, Denormalized Reads |
| Wave 3 — Stability | PASS | Silent failures, startup fragility, timer/callback debt, IPC strength |

### Key Strengths

- Architecture well-understood: clear entry points, clean process model, no circular dependencies
- `main.cjs` robust — startup faults surfaced via `dialog.showErrorBox` and `console.error`
- Service layer already uses `try/catch` in many paths
- Lifecycle hygiene generally good (most listeners cleaned up)
- No confirmed circular dependencies in active import graph

### Key Technical Debt

| Debt | Severity | Source |
|---|---|---|
| Silent fallback returns hide failures (returning [] / null instead of errors) | Critical | S-01 |
| Startup depends on full data load success | High | S-02, P-01 |
| No shared state / cache layer (reference tables reloaded per screen) | High | P-05, Architecture |
| OrderList combines UI, business logic, export, and printing | High | P-03, P-04, S-03 |
| Timer/callback cleanup not centralized | Medium | S-04, S-05 |
| Denormalized read-model assembly without recovery | Medium | S-06 |

### Ultimate Objective

> Performance + Stability + Maintainability + Zero Silent Failures

Every optimization must make the application faster, more stable, less crash-prone, or easier to maintain — with measurable evidence.

---

## 2. Optimization Epics

### Epic A — Startup Optimization

**Objective:** Reduce time-to-interactive and eliminate full-block startup dependency.

**Evidence:**
- P-01: App.tsx calls initDB() + getOrdersWithCustomerDetails() before render settles
- S-02: If initial data load fails, app continues with empty state and only console logs

**Expected Impact:** High — directly affects first-impression UX and reliability

**Risks:**
- Lazy loading may shift complexity to later screens
- Background init may cause race conditions if not guarded

**Dependencies:** None (can start independently)

---

### Epic B — Renderer Performance

**Objective:** Reduce UI thread blocking from heavy computation, exports, and unnecessary re-renders.

**Evidence:**
- P-03: jsPDF and html-to-image run in renderer (CPU-heavy, blocks interaction)
- P-04: Large in-memory filtering/mapping recomputed on every render
- P-06: Listener/timer pattern repeated across components

**Expected Impact:** High — directly improves responsiveness

**Risks:**
- Splitting OrderList is a significant refactor
- Memoization may mask deeper structural issues

**Dependencies:** Mild dependency on Epic C (Reference Cache for derived data)

---

### Epic C — Shared Reference Cache

**Objective:** Eliminate redundant reference-table reloads across screens.

**Evidence:**
- P-05: SettingsPanel, EditOrderModal, UnifiedOrderForm each load same reference tables
- P-02: Denormalized order load rebuilds lookup tables in memory every refresh

**Expected Impact:** High — reduces network/DB calls and improves perceived speed

**Risks:**
- Cache invalidation complexity
- Stale data if mutations bypass cache

**Dependencies:** None (can start independently)

---

### Epic D — Zero Silent Failures

**Objective:** Every failure is either recovered, visible to the user, or explicitly documented as acceptable.

**Evidence:**
- S-01: Multiple storage.ts paths return [] or null instead of surfacing errors
- Q-03: Crash Safety — High severity, several async branches log-only
- Q-04: Error Handling — High severity, UI paths fall back to console-only reporting

**Expected Impact:** Highest — foundational for reliability

**Risks:**
- May require architectural changes (error boundary, central handler)
- Retry strategies could introduce complexity

**Dependencies:** Depends on Epic A (Startup) for startup error paths

---

### Epic E — Fault Tolerance

**Objective:** Gracefully handle IPC failures, network outages, timeouts, and unexpected edge cases.

**Evidence:**
- S-03: Delayed export/print work has no cancellation path (setTimeout without cleanup)
- S-04, S-05: Toast and SearchableSelect timers not explicitly cleared
- S-06: Denormalized read-model has no internal recovery
- Data Flow §9: Several paths only log to console on failure

**Expected Impact:** Medium-High — prevents partial failures from becoming UX issues

**Risks:**
- Offline detection may conflict with current cloud-first architecture
- Retry logic without backoff can make things worse

**Dependencies:** Depends on Epic D (Zero Silent Failures) for error infrastructure

---

### Epic F — Maintainability

**Objective:** Reduce coupling, simplify large components, and separate business logic from UI.

**Evidence:**
- Dependency Map: OrderList combines business actions, export, and printing
- Dependency Map: App.tsx depends directly on storage and order services for bootstrap
- Q-05: Maintainability — Medium severity, App.tsx, OrderList, storage.ts combine multiple concerns

**Expected Impact:** Medium — enables future feature work with less risk

**Risks:**
- Refactoring without tests may introduce regressions
- May be perceived as "busy work" without direct user benefit

**Dependencies:** Best done after Epics B and D to avoid rework

---

## 3. Tasks Breakdown

### Epic A — Startup Optimization

| ID | Description | Files Affected | Q-Series | Scope Lock | Acceptance Criteria | Expected Gain |
|---|---|---|---|---|---|---|
| T-A.1 | Progressive startup: show UI shell immediately, load data in background | App.tsx, index.tsx | Q-01 (Performance) | Only startup sequence; no changes to child components | App renders shell in < 500ms; orders appear when ready | Faster time-to-interactive |
| T-A.2 | Visible startup error state instead of silent fallback | App.tsx, services/storage.ts | Q-04 (Error Handling) | Only the initial initDB/getOrders path | Error state shows retry prompt; console-only is eliminated | Clearer failure visibility |
| T-A.3 | Background initialization with loading indicators | App.tsx, Header.tsx | Q-01 (Performance) | Loading state only; no data flow changes | Loading indicator visible during init; data arrives progressively | Better UX during slow starts |
| T-A.4 | Fail-fast validation on initDB | main.cjs, services/storage.ts | Q-03 (Crash Safety) | Only the DB init path | initDB failure shows blocking error; no silent continuation | Earlier failure detection |

**P0 Rollback Strategy (T-A.2):**
- Revert App.tsx to original try/catch with console.error
- Scope: App.tsx and services/storage.ts only
- Verification: app returns to pre-change startup behavior (silent fallback restored)

---

### Epic B — Renderer Performance

| ID | Description | Files Affected | Q-Series | Scope Lock | Acceptance Criteria | Expected Gain |
|---|---|---|---|---|---|---|
| T-B.1 | Memoize derived order lists and export rows | components/OrderList.tsx | Q-01 (Performance) | Only the filtering/mapping functions; no layout or export changes | No unnecessary recomputation on stable inputs | Faster list rendering |
| T-B.2 | Move PDF/image export to offscreen or deferred path | components/OrderList.tsx | Q-01 (Performance) | Only the export functions; no changes to OrderList structure | Export does not block UI for >100ms | Responsive UI during exports |
| T-B.3 | Split OrderList into concerns (list + export + actions) | components/OrderList.tsx | Q-05 (Maintainability) | Structural split only; no behavior change | Each concern in its own module; no duplicate logic | Easier maintenance |
| T-B.4 | Centralize timer/listener lifecycle hook | components/Toast.tsx, SearchableSelect.tsx, SQLLogPanel.tsx | Q-02 (Memory) | Only timer/listener pattern; no behavior change | All timers cleared on unmount; no stale callbacks | Reduced race-condition risk |

---

### Epic C — Shared Reference Cache

| ID | Description | Files Affected | Q-Series | Scope Lock | Acceptance Criteria | Expected Gain |
|---|---|---|---|---|---|---|
| T-C.1 | Create shared reference data context/hook | New: services/reference-cache.ts | Q-01 (Performance) | Read-only cache; no mutation changes | Components share one cache instance; no duplicate loads | Fewer duplicate fetches |
| T-C.2 | Integrate cache into EditOrderModal and UnifiedOrderForm | components/EditOrderModal.tsx, UnifiedOrderForm.tsx | Q-01 (Performance) | Only the loading path; no form logic changes | Reference data loads once per session | Faster form opens |
| T-C.3 | Integrate cache into denormalized order read path | services/order.service.ts | Q-01 (Performance) | Only the read-model assembly; no mutation changes | Order loading skips redundant lookup-table rebuilds | Faster order lists |
| T-C.4 | Cache invalidation on mutation | services/storage.ts, reference-cache.ts | Q-01 (Performance) | Only invalidation triggers; no data flow changes | Cache invalidates when reference data is mutated | No stale data |

---

### Epic D — Zero Silent Failures

| ID | Description | Files Affected | Q-Series | Scope Lock | Acceptance Criteria | Expected Gain |
|---|---|---|---|---|---|---|
| T-D.1 | Create Central Error Handler | New: services/error-handler.ts, services/error-boundary.tsx | Q-04 (Error Handling) | Error infrastructure only; no consumer changes | All errors go through one pipeline; structured format | Unified error model |
| T-D.2 | Replace silent fallback returns with error propagation | services/storage.ts (lines 106, 117, 412, 476, 519, 535) | Q-03 (Crash Safety), Q-04 (Error Handling) | Only the identified silent-return paths | Each identified path throws or returns structured error state | No hidden failures |
| T-D.3 | Add error boundary to App.tsx | App.tsx, components/ErrorBoundary.tsx | Q-03 (Crash Safety) | Only the boundary wrapper; no child changes | Uncaught errors show recovery UI; app does not white-screen | Crash containment |
| T-D.4 | Structured logging system | services/error-handler.ts | Q-04 (Error Handling) | Logging only; no behavior change | All errors logged with context, severity, timestamp | Debuggable failures |
| T-D.5 | User-facing recovery surfaces | Toast.tsx, new: ErrorBanner.tsx | Q-04 (Error Handling) | Error display only; no logic changes | User sees actionable messages for failures | Recoverable failures |

**P0 Rollback Strategies:**

**T-D.1 (Central Error Handler):**
- Delete new files (services/error-handler.ts, services/error-boundary.tsx)
- Remove any imports added to existing files
- Scope: new files only; no existing logic is modified
- Verification: app compiles and runs without reference to error-handler module

**T-D.2 (Replace Silent Fallbacks):**
- Revert each of the 6 identified storage.ts lines to original return [] / null
- Scope: services/storage.ts only, line-level revert
- Verification: each affected function returns original fallback value

**T-D.3 (Error Boundary):**
- Remove ErrorBoundary wrapper from App.tsx
- Delete components/ErrorBoundary.tsx
- Scope: App.tsx and ErrorBoundary.tsx only
- Verification: app renders without boundary; uncaught errors behave as before

**T-D.4 (Structured Logging):**
- Remove structured logging calls from error-handler.ts
- Revert to original console.log/console.error pattern
- Scope: services/error-handler.ts only
- Verification: logging output matches pre-change format

**T-D.5 (User Recovery Surfaces):**
- Remove ErrorBanner.tsx and revert Toast.tsx
- Scope: Toast.tsx, new ErrorBanner.tsx only
- Verification: recovery surfaces removed; UI returns to pre-change state

---

### Epic E — Fault Tolerance

| ID | Description | Files Affected | Q-Series | Scope Lock | Acceptance Criteria | Expected Gain |
|---|---|---|---|---|---|---|
| T-E.1 | IPC call wrapper with timeout and retry | services/storage.ts, preload.cjs | Q-03 (Crash Safety) | IPC calls only; no UI changes | IPC calls time out and retry with backoff | Resilient local operations |
| T-E.2 | Supabase query wrapper with retry | services/supabase.service.ts | Q-03 (Crash Safety) | Supabase calls only; no UI changes | Failed queries retry with backoff; timeout applied | Resilient cloud operations |
| T-E.3 | Offline detection and graceful fallback | services/supabase.service.ts, App.tsx | Q-03 (Crash Safety) | Network detection only; no mode switching | App detects offline state; shows banner; does not crash | Graceful degradation |
| T-E.4 | Timeout handling for all external operations | services/storage.ts, services/order.service.ts, services/customer.service.ts | Q-03 (Crash Safety) | Timeout wrapping only; no logic changes | All external ops have explicit timeouts | No hung operations |
| T-E.5 | Cancel deferred work on unmount (OrderList) | components/OrderList.tsx | Q-02 (Memory) | Only the setTimeout callbacks; no behavior change | Timers cleared on unmount; no stale work | Clean lifecycle |

---

### Epic F — Maintainability

| ID | Description | Files Affected | Q-Series | Scope Lock | Acceptance Criteria | Expected Gain |
|---|---|---|---|---|---|---|
| T-F.1 | Extract business logic from OrderList into service | services/order.service.ts, components/OrderList.tsx | Q-05 (Maintainability) | Business logic extraction only; no UI behavior change | Business logic callable from service; OrderList is thinner | Reduced coupling |
| T-F.2 | Extract business logic from EditOrderModal into service | services/order.service.ts, components/EditOrderModal.tsx | Q-05 (Maintainability) | Business logic extraction only; no UI behavior change | Deposit/status logic in service; modal is presentation | Reduced coupling |
| T-F.3 | Simplify App.tsx bootstrap by delegating to init service | App.tsx, services/app-init.ts | Q-05 (Maintainability) | Bootstrap delegation only; no component changes | App.tsx delegates init to service; logic is testable | Cleaner startup |
| T-F.4 | Reduce storage.ts surface area | services/storage.ts | Q-05 (Maintainability) | Only module splitting; no behavior change | Domain-specific concerns moved to domain services | Smaller, focused modules |

---

## 4. Priority Matrix

### Scoring Scale

| Factor | 1 (Low) | 2 (Medium) | 3 (High) | 4 (Critical) |
|---|---|---|---|---|
| Impact | Minimal improvement | Noticeable improvement | Significant improvement | Transformative |
| Risk | Safe, isolated change | Moderate risk | High risk, may need rollback | Architectural risk |
| Effort | Hours | Days | Weeks | Multiple weeks |
| ROI | Not worth doing now | Worthwhile | Good investment | Essential |

### Task Priority Matrix

| Task | Impact | Risk | Effort | ROI | Priority |
|---|---|---|---|---|---|
| T-D.1 Central Error Handler | 4 | 2 | 2 | 4.00 | **P0** |
| T-D.4 Structured Logging | 3 | 1 | 1 | 3.00 | **P0** |
| T-D.2 Replace Silent Fallbacks | 4 | 3 | 2 | 2.00 | **P0** |
| T-A.2 Visible Startup Error | 4 | 1 | 1 | 4.00 | **P0** |
| T-D.3 Error Boundary | 3 | 1 | 1 | 3.00 | **P0** |
| T-D.5 User Recovery Surfaces | 3 | 1 | 1 | 3.00 | **P0** |
| T-C.1 Shared Reference Cache | 3 | 2 | 2 | 1.50 | **P1** |
| T-B.1 Memoize Order Lists | 3 | 1 | 1 | 3.00 | **P1** |
| T-A.1 Progressive Startup | 3 | 2 | 2 | 1.50 | **P1** |
| T-E.1 IPC Wrapper with Retry | 3 | 2 | 2 | 1.50 | **P1** |
| T-C.2 Cache Integration Forms | 3 | 1 | 1 | 3.00 | **P1** |
| T-E.2 Supabase Retry | 3 | 2 | 1 | 1.50 | **P2** |
| T-C.3 Cache Denormalized Reads | 3 | 2 | 1 | 1.50 | **P2** |
| T-B.4 Centralize Timer Lifecycle | 2 | 1 | 1 | 2.00 | **P2** |
| T-E.5 Cancel Deferred Work | 2 | 1 | 1 | 2.00 | **P2** |
| T-A.3 Background Init | 2 | 2 | 2 | 1.00 | **P2** |
| T-E.3 Offline Detection | 2 | 3 | 2 | 0.67 | **P3** |
| T-B.2 Offscreen Export | 3 | 2 | 3 | 1.00 | **P3** |
| T-B.3 Split OrderList | 3 | 3 | 3 | 1.00 | **P3** |
| T-E.4 Timeout Handling | 2 | 1 | 2 | 1.00 | **P3** |
| T-C.4 Cache Invalidation | 2 | 2 | 1 | 1.00 | **P3** |
| T-A.4 Fail-Fast initDB | 2 | 1 | 1 | 2.00 | **P3** |
| T-F.1 Extract Business Logic OrderList | 2 | 3 | 3 | 0.67 | **P4** |
| T-F.2 Extract Business Logic EditModal | 2 | 2 | 2 | 1.00 | **P4** |
| T-F.3 Simplify App.tsx Bootstrap | 2 | 2 | 2 | 1.00 | **P4** |
| T-F.4 Reduce storage.ts Surface | 2 | 3 | 3 | 0.67 | **P4** |

### Priority Definitions

- **P0 (Essential):** Must do immediately. Foundation for everything else.
- **P1 (High):** High-value, low-risk. Do early in the milestone.
- **P2 (Medium):** Worthwhile after P0/P1 cleared.
- **P3 (Low):** Good to have; do if time permits.
- **P4 (Deferred):** Not now. Move to Deferred Items section.

---

## 5. Dependency Graph

```text
                    +-----------+
                    |  P0 Tasks |
                    | (D.1, D.4,|
                    |  D.2, A.2,|
                    |  D.3, D.5)|
                    +-----+-----+
                          |
                          v
            +-------------+-------------+
            |             |             |
            v             v             v
     +------+---+  +-----+------+  +---+---------+
     | Epic D   |  | Epic A     |  | Epic C       |
     | (D.2,5)  |  | (A.1,3,4) |  | (C.1,2,3,4) |
     +------+---+  +-----+------+  +---+---------+
            |             |             |
            +------+------+             |
                   |                    |
                   v                    v
            +------+------+     +-------+------+
            | Epic E      |     | Epic B       |
            | (E.1-5)     |<----| (B.1-4)     |
            +------+------+     +------+-------+
                   |                    |
                   v                    v
            +------+------+     +-------+------+
            | Epic F      |     | (after B)    |
            | (F.1-4)     |<----| structural   |
            +-------------+     | refactors    |
                                +--------------+
```

### Key Dependency Rules

1. **P0 first:** Central Error Handler (T-D.1), Structured Logging (T-D.4), Replace Silent Fallbacks (T-D.2), Visible Startup Error (T-A.2), Error Boundary (T-D.3), User Recovery Surfaces (T-D.5) — no dependencies on other tasks
2. **Zero Silent Failures (Epic D)** after error infrastructure is in place
3. **Startup (Epic A)** parallel with Epic D after T-A.2
4. **Reference Cache (Epic C)** independent — can start after P0
5. **Fault Tolerance (Epic E)** depends on Epic D (needs error infrastructure to report failures)
6. **Renderer (Epic B)** can benefit from Epic C but not blocked by it
7. **Maintainability (Epic F)** last — structural refactors benefit from stability foundation

---

## 6. Milestones

### Milestone 1 — Foundation (Weeks 1-2)

**Focus:** Error infrastructure + visible startup

**Tasks:**
- T-D.1 Central Error Handler
- T-D.4 Structured Logging
- T-A.2 Visible Startup Error State
- T-D.3 Error Boundary
- T-D.5 User Recovery Surfaces

**Quality Register Impact:**
- Q-03 (Crash Safety): Open → Resolved (partial, Epic E tasks remain)
- Q-04 (Error Handling): Open → Resolved

**Verification Gates:**
- G-03 (No silent failures): PASS in affected paths
- All errors visible to user or logged with context
- Console-only error paths eliminated in scope

---

### Milestone 2 — Data Efficiency (Weeks 3-4)

**Focus:** Reference cache + startup + memoization

**Tasks:**
- T-C.1 Shared Reference Cache
- T-C.2 Cache Integration (Forms)
- T-C.3 Cache Denormalized Reads
- T-A.1 Progressive Startup
- T-B.1 Memoize Order Lists
- T-D.2 Replace Silent Fallbacks

**Quality Register Impact:**
- Q-01 (Performance): Open → Partial (Epic B tasks remain)
- Q-03 (Crash Safety): Partial → Resolved (after T-D.2 completes)

**Verification Gates:**
- G-01 (No duplicate data loading): PASS
- G-05 (No unnecessary full refreshes): PASS
- Measurable reduction in reference-table fetches

---

### Milestone 3 — Resilience (Weeks 5-6)

**Focus:** Fault tolerance + lifecycle hygiene

**Tasks:**
- T-E.1 IPC Wrapper with Retry
- T-E.2 Supabase Retry
- T-E.5 Cancel Deferred Work
- T-B.4 Centralize Timer Lifecycle
- T-A.3 Background Init
- T-A.4 Fail-Fast initDB

**Quality Register Impact:**
- Q-02 (Memory): Open → Resolved
- Q-03 (Crash Safety): Resolved → Confirmed

**Verification Gates:**
- G-03 (No silent failures): PASS in IPC/Supabase paths
- G-06 (Long-running tasks stay responsive): PASS
- No stale timer callbacks

---

### Milestone 4 — Performance (Weeks 7-8)

**Focus:** Heavy rendering + structural improvements

**Tasks:**
- T-B.2 Offscreen Export
- T-B.3 Split OrderList
- T-E.3 Offline Detection
- T-C.4 Cache Invalidation
- T-E.4 Timeout Handling

**Quality Register Impact:**
- Q-01 (Performance): Partial → Resolved

**Verification Gates:**
- G-02 (No blocking UI operations): PASS
- G-04 (No renderer business overload): PASS
- Export does not block interaction

---

### Milestone 5 — Hardening & Final Verification (Weeks 9-10)

**Focus:** Maintainability + final audit

**Tasks:**
- T-F.1 Extract Business Logic OrderList
- T-F.2 Extract Business Logic EditModal
- T-F.3 Simplify App.tsx Bootstrap
- T-F.4 Reduce storage.ts Surface
- Full regression audit across all Quality Gates

**Quality Register Impact:**
- Q-05 (Maintainability): Open → Resolved
- All Q-Series items: Resolved or moved to Deferred Items

**Verification Gates:**
- All Quality Gates (G-01 through G-06): PASS
- Quality Register: all items Resolved or Deferred
- Performance score: each category >= 8/10
- Stability score: each category >= 8/10

---

## 7. Architecture Constraints

These are non-negotiable engineering rules that apply to every task in this plan. Any task that violates a constraint must return to Stage 3 for scope revision.

### C-01 No new global state without justification

New global state (Context, module-level variables, shared singletons) is only permitted when:
- The state is genuinely needed by 3+ unrelated components, AND
- Local state or prop drilling has been proven insufficient

Every new global state must be documented with rationale in the task PR.

### C-02 All data access goes through the service layer

Components must never:
- Import or call Supabase directly
- Access Electron IPC directly (bypassing preload)
- Use storage.ts functions that bypass the service layer

Violations must be refactored to use the existing service modules.

### C-03 No silent catch blocks

`catch {}` or `catch (e) { /* noop */ }` or any catch block that does not at minimum log a structured error is forbidden.

Every catch block must either:
- Propagate the error to the Central Error Handler
- Surface a visible recovery path to the user
- Log a structured error with context (if the failure is truly non-critical)

### C-04 No increase in coupling to storage.ts

No task may add a new import of `services/storage.ts` from a component or service that does not already import it. If a task needs storage access, it must go through an existing domain service or the task scope must be expanded to include the new dependency explicitly.

### C-05 Scope Lock is binding

No task may modify files outside its declared Scope Lock. If a task discovers that changes are needed outside scope, it must:
1. Stop implementation
2. Return to Stage 3 for scope revision
3. Obtain re-approval before continuing

### C-06 Architectural review required for structural changes

Any task that:
- Creates a new service module
- Changes the import graph between existing services
- Adds a new IPC channel

Must include a brief architectural note in the PR describing the change and confirming no circular dependencies were introduced.

### C-07 QUALITY_REGISTER is a living document

Every task must, as part of its closure:
- Update QUALITY_REGISTER.md: move applicable Q-Series items from Open → Resolved
- Add new Q-Series entries if the task discovers previously undocumented technical debt
- Record the evidence and the task ID that resolved or discovered each item

---

## 8. Definition of Done (Quality Gates)

Every task must satisfy these criteria before closing:

| # | Criterion | How to Verify |
|---|---|---|
| 1 | No new console errors | Open DevTools console; zero red entries from affected scope |
| 2 | No silent failures in scope | Each failure path either surfaces error to user or is explicitly documented as acceptable |
| 3 | No memory leaks introduced | Check timer/listener cleanup; component unmount test |
| 4 | No unnecessary data reloads | Reference data and orders not reloaded unless explicitly triggered |
| 5 | Gate evidence recorded | Update QUALITY_GATES.md with PASS/Partial for affected gates |
| 6 | Quality Register updated | Update QUALITY_REGISTER.md: move Q-Series items from Open → Resolved; add new findings |
| 7 | Architecture Constraints respected | Verify task complies with C-01 through C-07 |
| 8 | Scope Lock respected | Only files listed in Scope Lock were modified |
| 9 | Tests pass (if applicable) | Existing test suite passes |
| 10 | PR review ready | Code is self-documenting; no commented-out code |

### Additional Gates Per Area

**Performance tasks:**
- Render performance gain measurable (>20% reduction in render time where applicable)
- No regression in other performance categories

**Stability tasks:**
- Error surface is visible (user can act on it)
- Recovery path is documented

**Maintainability tasks:**
- No increase in coupling (verify with dependency map)
- Component size does not increase

---

## 9. Deferred Items

These improvements are recognized as valuable but intentionally postponed behind higher-priority work:

| ID | Description | Why Deferred | Potential Milestone |
|---|---|---|---|
| D-01 | Migrate to React Context or lightweight state manager | Architectural change; no immediate pain point | Post-M5 |
| D-02 | Unit/integration test suite | Important but scope exceeds current objective | Post-M5 |
| D-03 | Replace cloud service modules (storage.cloud.ts etc.) | Not on active import path; no current risk | Post-M5 |
| D-04 | Performance budget enforcement in CI | Needs test suite first | Post-M5 |
| D-05 | Accessibility audit | Out of current scope | Post-M5 |
| D-06 | i18n / RTL support | Out of current scope | Post-M5 |
| D-07 | Electron auto-update | Out of current scope | Post-M5 |
| D-08 | Dark mode / theming | Out of current scope | Post-M5 |
| D-09 | SQL log performance optimization (P-07) | Low impact; logging is diagnostic | Post-M5 |
| D-10 | SearchableSelect virtualization | Not a current bottleneck | Post-M5 |

---

## Stage 4 — Plan Approval

When this document is reviewed and accepted:

> **STAGE 4 — PLAN APPROVED**

Execution begins with Milestone 1. Each task follows the protocol:
1. Task assignment
2. Implementation (Scope Lock enforced, Architecture Constraints respected)
3. Verification (Definition of Done checked)
4. Quality Register update (Q-Series items moved, new items added)
5. Next task

### Task Atomicity Rule

Every task must be:

- **Small:** focused on a single concern, not a batch of unrelated changes
- **Reviewable:** the diff must be understandable in a single pass
- **Fully Revertible:** rollback restores the exact pre-task state without side effects
- **Scope-Faithful:** no modifications outside the declared Scope Lock
- **Stable on Stop:** the app must be in a deployable state after the task, even if no further tasks are executed

This rule ensures each optimization is an independent unit of work, reducing the risk of cascading failures during the optimization journey.
