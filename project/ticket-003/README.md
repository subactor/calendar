# Ticket 003: Calendar contract and operations

- **ID**: ticket-003
- **Owner**: Codex under `SESSION_EXECUTION_AUTHORIZATION`
- **Status**: IN_PROGRESS
- **Workflow state**: EDIT
- **Created**: 2026-08-30

## Goal and scope

Publish the schedule schema, ownership boundary and staged fleet migration
procedure for the standalone Calendar service.

## Acceptance criteria

- [ ] AC-01: The machine schema requires exactly one clock owner and target.
- [ ] AC-02: Architecture assigns time, execution, secrets and reports clearly.
- [ ] AC-03: Migration never enables two clocks for one schedule.
- [ ] AC-04: Weekly model research names providers, phases and the `$5` cap.

## Authorization

The user's instruction to extract and standardize scheduled work in a separate
repository is `SESSION_EXECUTION_AUTHORIZATION`, accepted against baseline
`8e2d94718b5cf8c159d020ef88fa6b1e08e8aa42`.
