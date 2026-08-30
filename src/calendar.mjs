import { createHash } from "node:crypto";

const CRON_FIELDS = [
  ["minute", 0, 59],
  ["hour", 0, 23],
  ["dayOfMonth", 1, 31],
  ["month", 1, 12],
  ["dayOfWeek", 0, 6],
];

function invariant(condition, message) {
  if (!condition) throw new TypeError(message);
}

function validateTimezone(timeZone) {
  invariant(typeof timeZone === "string" && timeZone.length > 0, "timezone is required");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
  } catch {
    throw new TypeError(`invalid timezone: ${timeZone}`);
  }
}

function parseAtom(atom, minimum, maximum, label) {
  invariant(/^\d+$/.test(atom), `invalid ${label} cron value: ${atom}`);
  const value = Number(atom);
  invariant(value >= minimum && value <= maximum, `${label} cron value out of range: ${atom}`);
  return value;
}

function parseCronField(source, minimum, maximum, label) {
  invariant(typeof source === "string" && source.length > 0, `${label} cron field is required`);
  const values = new Set();
  for (const item of source.split(",")) {
    const [span, rawStep] = item.split("/");
    invariant(item.split("/").length <= 2, `invalid ${label} cron field: ${source}`);
    const step = rawStep === undefined ? 1 : parseAtom(rawStep, 1, maximum - minimum + 1, `${label} step`);
    let start;
    let end;
    if (span === "*") {
      start = minimum;
      end = maximum;
    } else if (span.includes("-")) {
      const parts = span.split("-");
      invariant(parts.length === 2, `invalid ${label} cron range: ${span}`);
      start = parseAtom(parts[0], minimum, maximum, label);
      end = parseAtom(parts[1], minimum, maximum, label);
      invariant(start <= end, `reversed ${label} cron range: ${span}`);
    } else {
      invariant(rawStep === undefined, `step requires wildcard or range in ${label}`);
      start = parseAtom(span, minimum, maximum, label);
      end = start;
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return values;
}

function parseCron(expression) {
  invariant(typeof expression === "string", "cron expression is required");
  const fields = expression.trim().split(/\s+/);
  invariant(fields.length === 5, "cron expression must contain exactly five fields");
  return Object.fromEntries(CRON_FIELDS.map(([label, minimum, maximum], index) => [
    label,
    parseCronField(fields[index], minimum, maximum, label),
  ]));
}

function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const data = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    minute: Number(data.minute),
    hour: Number(data.hour),
    dayOfMonth: Number(data.day),
    month: Number(data.month),
    dayOfWeek: weekdays[data.weekday],
  };
}

function cronMatches(parsed, parts) {
  return CRON_FIELDS.every(([label]) => parsed[label].has(parts[label]));
}

function asDate(value, label) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  invariant(!Number.isNaN(date.valueOf()), `${label} must be a valid date`);
  return date;
}

export function validateSchedule(schedule) {
  invariant(schedule && typeof schedule === "object" && !Array.isArray(schedule), "schedule must be an object");
  invariant(typeof schedule.id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(schedule.id), "schedule.id must be a kebab-case identifier");
  invariant(typeof schedule.clockOwner === "string" && schedule.clockOwner.length > 0, "schedule.clockOwner is required");
  invariant(schedule.target && typeof schedule.target === "object", "schedule.target is required");
  invariant(typeof schedule.target.repository === "string" && schedule.target.repository.includes("/"), "target.repository must be owner/name");
  invariant(typeof schedule.target.handler === "string" && schedule.target.handler.length > 0, "target.handler is required");
  invariant(schedule.trigger && typeof schedule.trigger === "object", "schedule.trigger is required");
  invariant(["cron", "interval"].includes(schedule.trigger.kind), "trigger.kind must be cron or interval");

  if (schedule.trigger.kind === "cron") {
    validateTimezone(schedule.trigger.timezone);
    parseCron(schedule.trigger.expression);
  } else {
    invariant(Number.isInteger(schedule.trigger.everyMs) && schedule.trigger.everyMs >= 60_000, "interval everyMs must be an integer of at least 60000");
    asDate(schedule.trigger.anchor, "interval anchor");
  }

  if (schedule.policy !== undefined) {
    invariant(schedule.policy && typeof schedule.policy === "object", "schedule.policy must be an object");
    if (schedule.policy.graceMs !== undefined) {
      invariant(Number.isInteger(schedule.policy.graceMs) && schedule.policy.graceMs >= 0, "policy.graceMs must be a non-negative integer");
    }
    if (schedule.policy.maxRunCostUsd !== undefined) {
      invariant(Number.isFinite(schedule.policy.maxRunCostUsd) && schedule.policy.maxRunCostUsd >= 0, "policy.maxRunCostUsd must be non-negative");
    }
  }
  return schedule;
}

export function occurrenceKey(scheduleId, scheduledFor) {
  invariant(typeof scheduleId === "string" && scheduleId.length > 0, "scheduleId is required");
  const instant = asDate(scheduledFor, "scheduledFor").toISOString();
  return `${scheduleId}:${createHash("sha256").update(`${scheduleId}\0${instant}`).digest("hex").slice(0, 24)}`;
}

function occurrence(schedule, scheduledFor, observedAt) {
  return Object.freeze({
    scheduleId: schedule.id,
    clockOwner: schedule.clockOwner,
    target: Object.freeze({ ...schedule.target }),
    scheduledFor: scheduledFor.toISOString(),
    observedAt: observedAt.toISOString(),
    occurrenceKey: occurrenceKey(schedule.id, scheduledFor),
  });
}

export function dueOccurrences(schedule, options = {}) {
  validateSchedule(schedule);
  const observedAt = asDate(options.observedAt ?? new Date(), "observedAt");
  const after = asDate(options.after ?? new Date(observedAt.valueOf() - 60_000), "after");
  invariant(after < observedAt, "after must precede observedAt");
  const graceMs = schedule.policy?.graceMs ?? 0;
  const due = [];

  if (schedule.trigger.kind === "interval") {
    const anchor = asDate(schedule.trigger.anchor, "interval anchor").valueOf();
    const everyMs = schedule.trigger.everyMs;
    const firstIndex = Math.max(0, Math.floor((after.valueOf() - anchor) / everyMs) + 1);
    for (let index = firstIndex; ; index += 1) {
      const instant = new Date(anchor + index * everyMs);
      if (instant > observedAt) break;
      if (observedAt.valueOf() - instant.valueOf() <= graceMs) due.push(occurrence(schedule, instant, observedAt));
    }
    return due;
  }

  const parsed = parseCron(schedule.trigger.expression);
  let cursor = new Date(Math.floor(after.valueOf() / 60_000) * 60_000 + 60_000);
  const limit = Math.floor(observedAt.valueOf() / 60_000) * 60_000;
  for (; cursor.valueOf() <= limit; cursor = new Date(cursor.valueOf() + 60_000)) {
    if (cronMatches(parsed, zonedParts(cursor, schedule.trigger.timezone)) && observedAt.valueOf() - cursor.valueOf() <= graceMs) {
      due.push(occurrence(schedule, cursor, observedAt));
    }
  }
  return due;
}
