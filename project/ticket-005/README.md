# Ticket 005: Clarify dispatch credential ownership

- **ID**: ticket-005
- **Owner**: codex
- **Status**: IN_PROGRESS
- **Workflow state**: EDIT
- **Created**: 2026-08-30

## Goal and scope

Correct the migration documentation so it distinguishes Calendar's narrowly
scoped repository-dispatch credential from model/provider credentials owned by
the benchmark target.

The user authorized execution and publication in this session.

## Acceptance criteria

- [ ] AC-01: Documentation assigns the dispatch credential to Calendar.
- [ ] AC-02: Provider credentials, budget ledger, fixtures and reports remain
      owned by `llm-code-benchmark`.
- [ ] AC-03: Governance and documentation checks pass.

## Tracking boundary

This directory contains bounded intent only; the documentation correction is
the material delivery.
