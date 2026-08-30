# Scheduler migration

## Current inventory

| Source | Current cadence owner | Destination | Initial action |
| :--- | :--- | :--- | :--- |
| `llm-code-benchmark/benchmark-full.yml` | GitHub Actions weekly cron | Calendar weekly model research | Transfer now |
| `llm-code-benchmark/refresh-model-catalog.yml` | GitHub Actions daily cron | Weekly research discovery phase | Fold now |
| `platform/config/automation-schedules.v1.json` | Control | Calendar catalog + Control adapter | Catalog first |
| `skills-agent/cron.py` and orchestrator discovery | Skills Agent/GitHub | Calendar catalog + Skills adapter | Catalog first |
| repository Actions crons | each repository | Calendar fleet catalog | Inventory per owner |
| host `systemd/*.timer` units | each host/service | Calendar fleet catalog | Inventory per owner |

## Transfer protocol

1. Record the source clock, timezone, jitter/grace, handler, credentials owner,
   concurrency key, missed-run behavior and rollback command.
2. Add and validate a Calendar schedule while its dispatcher remains disabled.
3. Make the target accept and deduplicate `occurrence_key`; prove an unpaid or
   dry-run dispatch.
4. Disable the old clock and record that exact change.
5. Enable Calendar dispatch and observe one complete occurrence.
6. Roll back by disabling Calendar first, then restoring exactly one old clock.

Steps 4 and 5 are ordered. No migration may leave both clocks enabled.

## Weekly benchmark dispatch

The target event is `calendar.weekly-model-research.v1` with bounded payload:

```json
{
  "clock_owner": "subactor/calendar",
  "occurrence_key": "llm-model-research-weekly:<stable-digest>",
  "providers": "cursor,openrouter,zai",
  "budget_usd": "5",
  "max_models": "10",
  "repetitions": "1"
}
```

Calendar owns only the narrowly scoped credential that authorizes repository
dispatch to `llm-code-benchmark`; it stores no provider or model credentials.
`llm-code-benchmark` owns provider/model credentials, the budget ledger,
fixtures and reports. The first paid occurrence must not be enabled until both
repositories have published their halves and an unpaid contract check has
passed.
