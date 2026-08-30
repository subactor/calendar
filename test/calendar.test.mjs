import test from "node:test";
import assert from "node:assert/strict";
import { dueOccurrences, occurrenceKey, validateSchedule } from "../src/calendar.mjs";
import { weeklyModelResearch } from "../src/schedules/model-research.mjs";
import { schedulingMigrationInventory } from "../src/migration-inventory.mjs";

const weekly = {
  id: "llm-model-research-weekly",
  clockOwner: "subactor/calendar",
  trigger: { kind: "cron", expression: "21 3 * * 1", timezone: "UTC" },
  target: { repository: "subactor/llm-code-benchmark", handler: "weekly-model-research" },
  policy: { graceMs: 15 * 60_000, maxRunCostUsd: 5 },
};

test("validates an explicit weekly schedule", () => {
  assert.equal(validateSchedule(weekly), weekly);
});

test("rejects an ambiguous schedule without one clock owner", () => {
  assert.throws(() => validateSchedule({ ...weekly, clockOwner: "" }), /clockOwner/);
});

test("rejects invalid cron and timezone contracts", () => {
  assert.throws(() => validateSchedule({ ...weekly, trigger: { ...weekly.trigger, expression: "61 3 * * 1" } }), /out of range/);
  assert.throws(() => validateSchedule({ ...weekly, trigger: { ...weekly.trigger, timezone: "Mars/Olympus" } }), /invalid timezone/);
});

test("finds a weekly cron occurrence inside its grace window", () => {
  const due = dueOccurrences(weekly, {
    after: "2026-08-30T03:30:00.000Z",
    observedAt: "2026-08-31T03:26:00.000Z",
  });
  assert.equal(due.length, 1);
  assert.equal(due[0].scheduledFor, "2026-08-31T03:21:00.000Z");
  assert.equal(due[0].clockOwner, "subactor/calendar");
});

test("honors timezone daylight-saving conversion", () => {
  const warsaw = {
    ...weekly,
    id: "warsaw-monday",
    trigger: { kind: "cron", expression: "0 9 * * 1", timezone: "Europe/Warsaw" },
    policy: { graceMs: 10 * 60_000 },
  };
  const due = dueOccurrences(warsaw, {
    after: "2026-08-31T06:50:00.000Z",
    observedAt: "2026-08-31T07:05:00.000Z",
  });
  assert.equal(due[0].scheduledFor, "2026-08-31T07:00:00.000Z");
});

test("finds interval occurrences from an immutable anchor", () => {
  const interval = {
    id: "heartbeat",
    clockOwner: "subactor/calendar",
    trigger: { kind: "interval", everyMs: 300_000, anchor: "2026-08-30T00:00:00.000Z" },
    target: { repository: "subactor/control", handler: "heartbeat" },
    policy: { graceMs: 300_000 },
  };
  const due = dueOccurrences(interval, {
    after: "2026-08-30T00:02:00.000Z",
    observedAt: "2026-08-30T00:06:00.000Z",
  });
  assert.deepEqual(due.map((item) => item.scheduledFor), ["2026-08-30T00:05:00.000Z"]);
});

test("creates stable occurrence keys without target-specific state", () => {
  const first = occurrenceKey(weekly.id, "2026-08-31T03:21:00Z");
  const second = occurrenceKey(weekly.id, new Date("2026-08-31T03:21:00Z"));
  assert.equal(first, second);
  assert.match(first, /^llm-model-research-weekly:[0-9a-f]{24}$/);
});

test("weekly model research covers every configured SubLLM provider under one budget", () => {
  validateSchedule(weeklyModelResearch);
  assert.deepEqual(weeklyModelResearch.providers.map(({ id }) => id), ["cursor", "openrouter", "zai"]);
  assert.equal(weeklyModelResearch.policy.maxRunCostUsd, 5);
  assert.equal(weeklyModelResearch.policy.budgetScope, "whole-occurrence");
  assert.equal(weeklyModelResearch.policy.automaticProductionAssignment, false);
  assert.ok(weeklyModelResearch.phases.includes("generate-md-html-pdf-report"));
  assert.ok(weeklyModelResearch.taskFamilies.includes("validator-agent"));
  assert.ok(weeklyModelResearch.taskFamilies.includes("jsonl-streaming"));
});

test("migration inventory never enables two clocks at once", () => {
  assert.ok(schedulingMigrationInventory.length >= 5);
  for (const item of schedulingMigrationInventory) {
    assert.ok(item.source);
    assert.ok(item.destination);
    assert.match(item.duplicatePrevention, /remove|retain|sole|do not enable|disable/i);
  }
  const benchmark = schedulingMigrationInventory.find(({ source }) => source.includes("benchmark-full.yml"));
  assert.equal(benchmark.disposition, "migrate-clock");
});
