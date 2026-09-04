import test from "node:test";
import assert from "node:assert/strict";
import { fleetSchedules, fleetScheduleDuplicates, upcomingFleetOccurrences } from "../src/fleet-catalog.mjs";
import { validateSchedule } from "../src/calendar.mjs";

test("every fleet schedule satisfies the calendar schedule contract", () => {
  for (const schedule of fleetSchedules()) {
    // The fleet catalog extends the contract with a read-only `surface` and a
    // trigger `source`; validation covers the shared core.
    validateSchedule({...schedule, trigger: {...schedule.trigger, ...(schedule.trigger.kind === "interval" ? {anchor: "2026-09-04T00:00:00.000Z"} : {})}});
  }
});

test("fleet catalog declares where outcomes and artifacts are visible", () => {
  const withSurface = fleetSchedules().filter((schedule) => schedule.surface);
  assert.ok(withSurface.length >= 6, "high-impact processes must declare a surface");
  for (const schedule of withSurface) {
    assert.ok(schedule.surface.outcomes, `${schedule.id} declares outcomes`);
  }
});

test("no fleet process is scheduled by two different clocks", () => {
  const duplicates = fleetScheduleDuplicates();
  assert.deepEqual(duplicates.filter((finding) => finding.kind === "duplicate_target_two_clocks"), []);
  assert.deepEqual(duplicates.filter((finding) => finding.kind === "duplicate_id"), []);
});

test("upcoming occurrences are ordered soonest-first and within the window", () => {
  const from = new Date("2026-09-04T09:00:00.000Z");
  const withinMs = 10 * 60_000;
  const upcoming = upcomingFleetOccurrences({from, withinMs});
  assert.ok(upcoming.length >= 3, "several fleet processes fire within ten minutes");
  for (let index = 1; index < upcoming.length; index += 1) {
    assert.ok(upcoming[index - 1].scheduledFor <= upcoming[index].scheduledFor);
  }
  for (const entry of upcoming) {
    const delta = entry.scheduledFor - from;
    assert.ok(delta > 0 && delta <= withinMs);
    assert.ok(entry.clockOwner);
  }
});

test("a five-minute lookahead answers the transparency question", () => {
  const from = new Date("2026-09-04T09:00:00.000Z");
  const fiveMinutes = upcomingFleetOccurrences({from, withinMs: 5 * 60_000});
  const ids = fiveMinutes.map((entry) => entry.scheduleId);
  assert.ok(ids.includes("fleet-pr-controller"), "5-minute timer fires in window");
  assert.ok(ids.includes("fleet-wellmanifest-exporter"), "30-second timer fires in window");
  assert.ok(ids.includes("fleet-coding-agent"), "5-minute coding agent fires in window");
});

test("duplicate detection reports a process scheduled twice", () => {
  const [first] = fleetSchedules();
  const findings = fleetScheduleDuplicates([
    first,
    {...first, id: "clone", clockOwner: "other:clock"},
  ]);
  assert.ok(findings.some((finding) => finding.kind === "duplicate_target_two_clocks"));
});
