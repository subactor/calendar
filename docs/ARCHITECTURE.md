# Calendar architecture

Calendar is a Subactor runtime service for explicit time contracts. It answers
three questions: what is due, which repository owns the handler, and what
stable occurrence key prevents a duplicate dispatch. It does not execute the
domain workload.

## Responsibility boundary

| Concern | Owner |
| :--- | :--- |
| Schedule definition, timezone and due-slot calculation | `subactor/calendar` |
| Stable occurrence key and dispatch receipt | `subactor/calendar` |
| Handler code and workload validation | target repository |
| API keys, provider credentials and spending ledger | target repository |
| Domain report and recommendation | target repository |
| Production configuration change | separately reviewed repository PR |

There is exactly one `clockOwner` per schedule. A target may reject a stale,
duplicate or malformed occurrence. Calendar failure does not authorize a
second implicit scheduler.

## Weekly model research

`llm-model-research-weekly` is due Monday at 03:21 UTC. It covers the configured
SubLLM providers Cursor, OpenRouter and Z.AI, with discovery, catalog diff,
candidate selection, role/structured-I/O/session benchmarks, MD/HTML/PDF report
generation and proposed route assignments. The whole occurrence has a hard
`$5` cap. Recommendations never edit production routes automatically.

Provider reachability is evidence, not a model score. If a direct provider or
an equivalent benchmark transport is unavailable, the report must say “not
evaluated” and preserve the provider/model in the comparison inventory.

## Existing scheduler boundary

Control's `automation-scheduler.mjs` remains the execution composition root for
Control handlers during migration. Skills Agent retains its cron parser and
systemd/GitHub timers retain their clock until a catalog entry, adapter, lease
and duplicate-prevention test exist. Calendar centralizes visibility first;
clock ownership transfers only through the migration protocol.
