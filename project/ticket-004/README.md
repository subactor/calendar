# Ticket 004: Weekly model-research dispatcher

- **ID**: ticket-004
- **Owner**: Codex under `SESSION_EXECUTION_AUTHORIZATION`
- **Status**: IN_PROGRESS
- **Workflow state**: EDIT
- **Created**: 2026-08-30

## Goal and scope

Make Calendar the sole weekly clock and dispatch a bounded occurrence to the
benchmark repository without storing benchmark credentials.

## Acceptance criteria

- [ ] AC-01: The clock runs Monday at 03:21 UTC.
- [ ] AC-02: Dispatch contains a stable occurrence key and all three providers.
- [ ] AC-03: The dispatched total budget is exactly `$5` and never higher.
- [ ] AC-04: Manual dry-run validates the payload without external mutation.

## Authorization

The user's explicit recurring-benchmark request is recorded as
`SESSION_EXECUTION_AUTHORIZATION` against base
`9f14f59faab3bfc0821d2a2e12b41b45f47d7c39`.
