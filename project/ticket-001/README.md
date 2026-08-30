# Ticket 001: Canonical calendar runtime

- **ID**: ticket-001
- **Owner**: Codex under `SESSION_EXECUTION_AUTHORIZATION`
- **Status**: IN_PROGRESS
- **Workflow state**: EDIT
- **Created**: 2026-08-30

## Goal and scope

Create the dependency-free runtime that validates explicit schedule contracts,
calculates due occurrences and produces stable deduplication keys. The runtime
does not execute workloads or own their credentials.

## Acceptance criteria

- [ ] AC-01: A schedule declares one clock owner, timezone, trigger and target.
- [ ] AC-02: Cron and interval schedules calculate deterministic due slots.
- [ ] AC-03: Occurrences have stable keys suitable for at-most-once dispatch.
- [ ] AC-04: Invalid or ambiguous contracts fail closed.

## Authorization

The user's instruction to investigate, extract and implement the calendar is
recorded as `SESSION_EXECUTION_AUTHORIZATION`. The accepted seed baseline is
commit `8e2d94718b5cf8c159d020ef88fa6b1e08e8aa42`.

## Tracking boundary

This ticket delivers executable source and tests outside this directory. Raw
command and model transcripts remain outside Git.
