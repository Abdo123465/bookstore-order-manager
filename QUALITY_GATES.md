# Quality Gates

These gates are measurable acceptance criteria for future optimization work.

## Gates

| ID | Gate | Pass Condition |
|---|---|---|
| G-01 | No duplicate data loading | Reference tables load once per session or are served from a shared cache, with no redundant reloads across equivalent screens. |
| G-02 | No blocking UI operations | Expensive export/print/render tasks do not freeze the main interaction path for the user. |
| G-03 | No silent failures | Any critical failure either succeeds, surfaces an error, or records a visible recovery path. |
| G-04 | No renderer business overload | UI components do not own unrelated business logic, heavy exports, and printing together. |
| G-05 | No unnecessary full refreshes | Partial updates are used when only a subset of state changed. |
| G-06 | Long-running tasks stay responsive | PDF, image capture, and report generation preserve interface responsiveness. |

## Scoring Guidance

- `Pass`: gate is satisfied in the targeted flow.
- `Partial`: gate is improved but still has edge cases or duplicate paths.
- `Fail`: gate is not satisfied or regressed.

## Usage

- Record gate results alongside implementation work.
- Prefer evidence from the code or runtime behavior before marking a gate `Pass`.
- Use these gates as success criteria, not as a replacement for the risk register.

