/**
 * Fleet schedule catalog: one transparent, read-only inventory of every
 * planned Subactor process, regardless of which component owns the clock.
 *
 * Calendar centralizes *visibility* first (docs/ARCHITECTURE.md): each entry
 * keeps the clock with its current owner and records where the occurrence
 * surface lives, so humans and other processes can answer "what runs in the
 * next N minutes?" and detect duplicated processes before they fire.
 *
 * The catalog is declarative and versioned in this repository. It is derived
 * from the live fleet (systemd timers, Control automation schedules, Docker
 * schedulers, supervisor cycles) and must be updated by a governed ticket
 * whenever a clock changes.
 *
 * Catalog entries never dispatch work and never move a clock: they are the
 * single visibility layer defined by the ticket-008 delivery contract
 * (read-only exports, zero runtime dependencies, rollback by removal).
 */

const FLEET_SCHEDULES = Object.freeze([
  // --- host systemd timers (clock stays with systemd until migrated) ---
  Object.freeze({
    id: "fleet-coding-agent",
    clockOwner: "systemd:subactor-coding-agent.timer",
    description: "Governed coding ticket executor (FIFO coding-agent queue).",
    trigger: Object.freeze({kind: "interval", everyMs: 5 * 60_000, source: "OnUnitActiveSec=5min"}),
    target: Object.freeze({repository: "subactor/coding-agent", handler: "subactor-coding-agent.service"}),
    surface: Object.freeze({
      outcomes: "systemd journal + planfile ticket lifecycle",
      artifacts: "https://github.com/subactor (ticket branches/PRs)",
    }),
  }),
  Object.freeze({
    id: "fleet-pr-controller",
    clockOwner: "systemd:subactor-pr-controller.timer",
    description: "Direct-PR controller reconciliation.",
    trigger: Object.freeze({kind: "interval", everyMs: 5 * 60_000, source: "OnCalendar=*:0/5"}),
    target: Object.freeze({repository: "subactor/validator-agent", handler: "subactor-pr-controller.service"}),
    surface: Object.freeze({
      outcomes: "systemd journal + validator-agent runs",
      artifacts: "https://github.com/subactor/validator-agent/actions",
    }),
  }),
  Object.freeze({
    id: "fleet-founder-inventory",
    clockOwner: "systemd:subactor-founder-inventory.timer",
    description: "Founder inventory refresh.",
    trigger: Object.freeze({kind: "interval", everyMs: 10 * 60_000, source: "OnUnitActiveSec=10min"}),
    target: Object.freeze({repository: "subactor/platform", handler: "subactor-founder-inventory.service"}),
    surface: Object.freeze({
      outcomes: "systemd journal + founder inventory state",
      artifacts: "platform founder inventory projection",
    }),
  }),
  Object.freeze({
    id: "fleet-autonom-user",
    clockOwner: "systemd:subactor-autonom-user.timer",
    description: "Autonom user-cycle run.",
    trigger: Object.freeze({kind: "interval", everyMs: 30 * 60_000, source: "OnUnitActiveSec=30min"}),
    target: Object.freeze({repository: "subactor/autonom", handler: "subactor-autonom-user.service"}),
    surface: Object.freeze({
      outcomes: "systemd journal + autonom run receipts",
      artifacts: "autonom run state",
    }),
  }),
  Object.freeze({
    id: "fleet-repair-agent",
    clockOwner: "systemd:subactor-repair-agent.timer",
    description: "Autonomous repair queue consumer.",
    trigger: Object.freeze({kind: "interval", everyMs: 15 * 60_000, source: "OnUnitActiveSec=15min"}),
    target: Object.freeze({repository: "subactor/repair-agent", handler: "subactor-repair-agent.service"}),
    surface: Object.freeze({
      outcomes: "systemd journal + repair tickets",
      artifacts: "repair-agent state + koru task logs",
    }),
  }),
  // Sub-minute exporters stay outside the schedule contract on purpose: the
  // calendar contract forbids everyMs < 60000 because occurrence keys are
  // minute-resolution. Inventory-only entry keeps the process visible.
  Object.freeze({
    id: "fleet-wellmanifest-exporter",
    clockOwner: "systemd:subactor-wellmanifest-exporter.timer",
    description: "Wellmanifest standards export (sub-minute; inventory-only).",
    trigger: Object.freeze({kind: "interval", everyMs: 60_000, source: "OnUnitActiveSec=30s (actual)"},
    ),
    target: Object.freeze({repository: "wellmanifest/*", handler: "subactor-wellmanifest-exporter.service"}),
    visibility: Object.freeze({inventoryOnly: true, note: "actual timer is 30s; contract floor is 60s"}),
  }),
  Object.freeze({
    id: "fleet-onedev-diagit-daily",
    clockOwner: "systemd:onedev-diagit-daily.timer",
    description: "OneDev/Diagit daily fleet audit.",
    trigger: Object.freeze({
      kind: "cron",
      expression: "0 0 * * *",
      timezone: "Europe/Warsaw",
      source: "OnCalendar=daily",
    }),
    target: Object.freeze({repository: "subactor/onedev-agent", handler: "onedev-diagit-daily.service"}),
  }),
  Object.freeze({
    id: "fleet-worktree-guard-subactor",
    clockOwner: "systemd:worktree-guard@home-tom-github-subactor.timer",
    description: "Worktree overlap guard sweep for the subactor umbrella.",
    trigger: Object.freeze({kind: "interval", everyMs: 5 * 60_000, source: "OnUnitActiveSec=300s"}),
    target: Object.freeze({repository: "subactor/*", handler: "worktree-guard.service"}),
  }),

  // --- Control automation scheduler (clock stays with Control) ---
  Object.freeze({
    id: "control-autonomous-queue-consumer",
    clockOwner: "control:automation-scheduler",
    description: "Observe, reconcile and execute ready bot tickets.",
    trigger: Object.freeze({kind: "interval", everyMs: 300_000, source: "automation-schedules.v1.json"}),
    target: Object.freeze({repository: "subactor/platform", handler: "autonomous-queue-consumer"}),
    surface: Object.freeze({
      outcomes: "hr-control cycle telemetry + planfile tickets",
      artifacts: "planfile tickets (PLF-*)",
    }),
  }),
  Object.freeze({
    id: "control-delegation-safety-sweep",
    clockOwner: "control:automation-scheduler",
    description: "Delegation safety sweep.",
    trigger: Object.freeze({kind: "interval", everyMs: 300_000, source: "automation-schedules.v1.json"}),
    target: Object.freeze({repository: "subactor/platform", handler: "delegation-safety-sweep"}),
  }),
  Object.freeze({
    id: "control-stale-execution-watchdog",
    clockOwner: "control:automation-scheduler",
    description: "Watchdog for suspended executions.",
    trigger: Object.freeze({kind: "interval", everyMs: 300_000, source: "automation-schedules.v1.json"}),
    target: Object.freeze({repository: "subactor/platform", handler: "stale-execution-watchdog"}),
  }),
  Object.freeze({
    id: "control-founder-urgent",
    clockOwner: "control:automation-scheduler",
    description: "Scan for urgent Founder matters.",
    trigger: Object.freeze({kind: "interval", everyMs: 60_000, source: "automation-schedules.v1.json"}),
    target: Object.freeze({repository: "subactor/platform", handler: "founder-urgent"}),
  }),
  Object.freeze({
    id: "control-founder-daily-digest",
    clockOwner: "control:automation-scheduler",
    description: "Founder daily digest.",
    trigger: Object.freeze({kind: "interval", everyMs: 86_400_000, source: "automation-schedules.v1.json"}),
    target: Object.freeze({repository: "subactor/platform", handler: "founder-daily-digest"}),
  }),
  Object.freeze({
    id: "control-project-reconciliation",
    clockOwner: "control:automation-scheduler",
    description: "Project reconciliation sweep.",
    trigger: Object.freeze({kind: "interval", everyMs: 86_400_000, source: "automation-schedules.v1.json"}),
    target: Object.freeze({repository: "subactor/platform", handler: "project-reconciliation"}),
  }),

  // --- supervisor continuous cycle ---
  Object.freeze({
    id: "supervisor-autonomy-cycle",
    clockOwner: "systemd:subactor-supervisor.service",
    description: "Observe/assess/delegate autonomy cycle (~75s per cycle).",
    trigger: Object.freeze({kind: "interval", everyMs: 75_000, source: "supervisor service loop"}),
    target: Object.freeze({repository: "subactor/supervisor", handler: "supervisor-cycle"}),
    surface: Object.freeze({
      outcomes: "supervisor events (observed/assessed/delegated) + controller progress receipts",
      artifacts: "planfile tickets + dashboard autonomy_control",
    }),
  }),
]);

/** All fleet schedules, ordered by id for stable rendering. */
export function fleetSchedules() {
  return [...FLEET_SCHEDULES].sort((left, right) => left.id.localeCompare(right.id));
}

function nextIntervalOccurrence(schedule, from) {
  const everyMs = schedule.trigger.everyMs;
  // The next occurrence strictly after `from`: a boundary-aligned `from`
  // belongs to the occurrence that already fired, not to the next one.
  return new Date((Math.floor(from.valueOf() / everyMs) + 1) * everyMs);
}

function cronFieldValues(field) {
  const values = new Set();
  for (const part of field.split(",")) {
    if (part === "*") return null; // unbounded: caller treats as match-all
    const [span, stepRaw] = part.split("/");
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    let lo;
    let hi;
    if (span.includes("-")) {
      [lo, hi] = span.split("-").map(Number);
    } else {
      lo = hi = Number(span);
    }
    for (let value = lo; value <= hi; value += step) values.add(value);
  }
  return values;
}

function cronFieldMatches(field, value) {
  const values = cronFieldValues(field);
  return values === null || values.has(value);
}

function nextCronOccurrence(schedule, from) {
  // Minute-resolution forward scan bounded to 36 hours; fleet cron entries are
  // daily or sparser, so this bound cannot be hit in practice.
  const [minute, hour, dayOfMonth, month] = schedule.trigger.expression.trim().split(/\s+/);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.trigger.timezone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  for (let minuteOffset = 1; minuteOffset <= 36 * 60; minuteOffset += 1) {
    const candidate = new Date(from.valueOf() + minuteOffset * 60_000);
    const zoned = Object.fromEntries(
      parts.formatToParts(candidate).filter((item) => item.type !== "literal").map((item) => [item.type, Number(item.value)]),
    );
    if (
      cronFieldMatches(minute, zoned.minute) &&
      cronFieldMatches(hour, zoned.hour) &&
      cronFieldMatches(month, zoned.month) &&
      cronFieldMatches(dayOfMonth, zoned.day)
    ) {
      return candidate;
    }
  }
  return null;
}

/**
 * The next planned occurrence of every fleet schedule at or after `from`,
 * soonest first. Read-only: this answers "what runs in the next N minutes?"
 * without dispatching anything.
 */
export function upcomingFleetOccurrences({from = new Date(), withinMs = Infinity} = {}) {
  return fleetSchedules()
    .map((schedule) => {
      const next = schedule.trigger.kind === "interval"
        ? nextIntervalOccurrence(schedule, from)
        : nextCronOccurrence(schedule, from);
      return {scheduleId: schedule.id, clockOwner: schedule.clockOwner, scheduledFor: next};
    })
    .filter((entry) => entry.scheduledFor !== null && entry.scheduledFor.valueOf() - from.valueOf() <= withinMs)
    .sort((left, right) => left.scheduledFor.valueOf() - right.scheduledFor.valueOf());
}

/**
 * Duplicate-process detection: two fleet schedules are duplicates when the
 * same repository+handler is scheduled by more than one clock owner, or when
 * one id collides. This is the transparency guard that prevents running the
 * same process twice with different clocks.
 */
export function fleetScheduleDuplicates(schedules = fleetSchedules()) {
  const byTarget = new Map();
  const byId = new Map();
  const findings = [];
  for (const schedule of schedules) {
    const targetKey = `${schedule.target.repository}::${schedule.target.handler}`;
    const previous = byTarget.get(targetKey);
    if (previous && previous.clockOwner !== schedule.clockOwner) {
      findings.push({
        kind: "duplicate_target_two_clocks",
        target: targetKey,
        clocks: [previous.clockOwner, schedule.clockOwner],
      });
    } else if (previous) {
      findings.push({kind: "duplicate_target_one_clock", target: targetKey, clocks: [previous.clockOwner]});
    }
    byTarget.set(targetKey, schedule);
    const idOwner = byId.get(schedule.id);
    if (idOwner && idOwner !== schedule.clockOwner) {
      findings.push({kind: "duplicate_id", id: schedule.id, clocks: [idOwner, schedule.clockOwner]});
    }
    byId.set(schedule.id, schedule.clockOwner);
  }
  return findings;
}
