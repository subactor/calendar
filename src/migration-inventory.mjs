export const schedulingMigrationInventory = Object.freeze([
  Object.freeze({
    source: "subactor/llm-code-benchmark/.github/workflows/benchmark-full.yml",
    currentClock: "github-actions",
    destination: "subactor/calendar:llm-model-research-weekly",
    disposition: "migrate-clock",
    duplicatePrevention: "remove source schedule after calendar dispatch is live",
  }),
  Object.freeze({
    source: "subactor/llm-code-benchmark/.github/workflows/refresh-model-catalog.yml",
    currentClock: "github-actions",
    destination: "subactor/calendar:llm-model-research-weekly/discover-provider-models",
    disposition: "fold-into-weekly",
    duplicatePrevention: "retain workflow_dispatch only",
  }),
  Object.freeze({
    source: "subactor/platform/config/automation-schedules.v1.json",
    currentClock: "subactor/control",
    destination: "subactor/calendar catalog with subactor/control execution adapter",
    disposition: "catalog-first-retain-clock",
    duplicatePrevention: "Control remains sole clock until lease-compatible adapter is proven",
  }),
  Object.freeze({
    source: "subactor/skills-agent/src/skills_agent/cron.py",
    currentClock: "skills-agent plus orchestrator GitHub Actions",
    destination: "subactor/calendar catalog with skills-agent execution adapter",
    disposition: "catalog-first-retain-clock",
    duplicatePrevention: "do not enable Calendar dispatch while orchestrator cron exists",
  }),
  Object.freeze({
    source: "subactor/*/.github/workflows and systemd/*.timer",
    currentClock: "repository GitHub Actions or host systemd",
    destination: "subactor/calendar fleet catalog",
    disposition: "inventory-then-migrate-per-owner",
    duplicatePrevention: "one migration receipt must disable the old clock before enabling the new clock",
  }),
]);
