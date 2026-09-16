# Quality Register

This register tracks cross-cutting quality concerns discovered during source analysis and later audits.

| ID | Category | Severity | Status | Notes |
|---|---|---:|---|---|
| Q-01 | Performance | High | Open | Hot-path rendering and repeated full-table loads |
| Q-02 | Memory | Medium | Open | Timers and listeners rely on cleanup discipline |
| Q-03 | Crash Safety | High | Partial | storage.ts silent catches resolved (T-D.2). Remaining: components/*.tsx, services/order.service.ts have console-only paths |
| Q-04 | Error Handling | High | Partial | storage.ts console.error replaced with structured logging (T-D.2). Warning/captureError used per severity. Remaining: components/*.tsx, services/order.service.ts |
| Q-05 | Maintainability | Medium | Open | `App.tsx`, `OrderList.tsx`, and `storage.ts` combine multiple concerns |

## Status Rules

- `Open`: issue is confirmed and has not been remediated.
- `Resolved`: issue is fixed and the fix is documented with evidence.
- `Deferred`: issue is real but intentionally postponed behind higher-priority work.

## Notes

- This register is separate from the risk register used in execution planning.
- Quality entries should be evidence-backed and should move to `Resolved` only after verification.

