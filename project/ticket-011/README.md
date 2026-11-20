# Ticket 011: Fetch full history and pass explicit PR range in windows-governance CI job

- **ID**: ticket-011
- **Owner**: agent:antigravity
- **Status**: IN_PROGRESS
- **Workflow state**: EDIT
- **Created**: 2026-11-20
- **Authorization**: SESSION_EXECUTION_AUTHORIZATION (user requested unblocking and finishing unmerged PRs across organizations)

## Goal and scope

Fix the `windows-governance` CI job in `.github/workflows/ci.yml` (and align the `test` job) to fetch full Git history (`fetch-depth: 0`), check out the exact commit (`github.event.pull_request.head.sha || github.sha`), and pass explicit `--base "$BASE_SHA" --head "$HEAD_SHA"` range arguments on `pull_request` events so already-merged adoption tickets on `main` do not trigger false `GOV-SYNC-001` failures on Windows.

## Acceptance criteria

- [x] AC-01: `windows-governance` in `.github/workflows/ci.yml` fetches full history (`fetch-depth: 0`) and passes explicit `--base` / `--head` on `pull_request` via environment variables.
- [x] AC-02: `./project/governance-check.sh --base origin/main` passes (`GOV-PASS`, 0 errors, 0 warnings) and `node --test` passes.
- [x] AC-03: GitHub CI (`test`, `windows-governance`, `governance / enforce`, `governance / remote lifecycle`) passes on the PR.

## Tracking boundary

This directory contains the minimal reviewed intent. Optional participant prose
and raw command logs are not required delivery output.
