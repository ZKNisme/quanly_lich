import {
  DAY_SHORT_LABELS,
  formatHoursCompact,
  formatTimeRangeShort,
  getDurationMinutes,
  getEffectiveEndMinutes,
  getWeekDaysMeta,
  minutesToTime,
  timeToMinutes,
} from "@/lib/date-utils";
import { formatCurrencyVnd, formatHoursDecimal } from "@/lib/job-meta";
import { calculateShiftPay, resolveJobForEvent } from "@/lib/payroll-engine";
import type {
  ConflictCheckResult,
  ConflictDetail,
  DayOfWeek,
  EventCategory,
  JobProfile,
  PlannerSettings,
  ScheduleEvent,
  SessionKey,
  ShiftDayScanResult,
  ShiftTemplate,
  TimelineItem,
  WeekDayMeta,
  WeekScope,
} from "@/types/schedule";

export const SESSION_LIST: Array<{
  key: SessionKey;
  label: string;
  shortHint: string;
  defaultStart: string;
  defaultEnd: string;
}> = [
  {
    key: "morning",
    label: "Sáng",
    shortHint: "06:00 - 12:00",
    defaultStart: "08:00",
    defaultEnd: "12:00",
  },
  {
    key: "afternoon",
    label: "Chiều",
    shortHint: "12:00 - 18:00",
    defaultStart: "13:00",
    defaultEnd: "17:00",
  },
  {
    key: "evening",
    label: "Tối",
    shortHint: "18:00 - 22:30",
    defaultStart: "17:30",
    defaultEnd: "21:30",
  },
];

export function sortEventsChronologically(
  events: ScheduleEvent[]
): ScheduleEvent[] {
  return [...events].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (startDiff !== 0) return startDiff;
    return timeToMinutes(a.endTime) - timeToMinutes(b.endTime);
  });
}

export function getEventsForWeek(
  allEvents: ScheduleEvent[],
  weekKey: string
): ScheduleEvent[] {
  return sortEventsChronologically(
    allEvents.filter(
      (ev) =>
        ev.repeatMode === "weekly" ||
        (ev.repeatMode === "once" && ev.weekKey === weekKey)
    )
  );
}

export function getEventsForDay(
  weekEvents: ScheduleEvent[],
  dayOfWeek: DayOfWeek
): ScheduleEvent[] {
  return weekEvents.filter((ev) => ev.dayOfWeek === dayOfWeek);
}

export interface ConflictCandidate {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isOvernight?: boolean;
}

export function checkTimeConflicts(
  candidate: ConflictCandidate,
  weekEvents: ScheduleEvent[],
  travelBufferMinutes: number = 0,
  excludeEventId?: string
): ConflictCheckResult {
  const candStart = timeToMinutes(candidate.startTime);
  const candEnd = getEffectiveEndMinutes(
    candidate.startTime,
    candidate.endTime,
    candidate.isOvernight
  );
  const dayEvents = weekEvents.filter(
    (ev) => ev.dayOfWeek === candidate.dayOfWeek && ev.id !== excludeEventId
  );

  const overlaps: ConflictDetail[] = [];
  const bufferWarnings: ConflictDetail[] = [];

  for (const ev of dayEvents) {
    const evStart = timeToMinutes(ev.startTime);
    const evEnd = getEffectiveEndMinutes(
      ev.startTime,
      ev.endTime,
      ev.isOvernight
    );

    if (candStart < evEnd && evStart < candEnd) {
      const overlapMins = Math.min(candEnd, evEnd) - Math.max(candStart, evStart);
      overlaps.push({
        event: ev,
        kind: "overlap",
        minutes: overlapMins,
      });
      continue;
    }

    if (travelBufferMinutes > 0) {
      let gapMins: number | null = null;
      if (evEnd <= candStart) {
        gapMins = candStart - evEnd;
      } else if (candEnd <= evStart) {
        gapMins = evStart - candEnd;
      }

      if (gapMins !== null && gapMins < travelBufferMinutes) {
        bufferWarnings.push({
          event: ev,
          kind: "buffer",
          minutes: gapMins,
        });
      }
    }
  }

  const status =
    overlaps.length > 0
      ? "conflict"
      : bufferWarnings.length > 0
        ? "buffer"
        : "ok";

  return { status, overlaps, bufferWarnings };
}

export function buildDayTimeline(
  dayEvents: ScheduleEvent[],
  settings: PlannerSettings
): TimelineItem[] {
  const sorted = sortEventsChronologically(dayEvents);
  const configuredStart = timeToMinutes(settings.dayStartTime);
  const configuredEnd = timeToMinutes(settings.dayEndTime);
  const minGap = Math.max(5, settings.minFreeGapMinutes);
  const buffer = 0;

  if (sorted.length === 0) {
    if (configuredEnd - configuredStart >= minGap) {
      return [
        {
          type: "free",
          id: `free-${configuredStart}-${configuredEnd}`,
          startMinutes: configuredStart,
          endMinutes: configuredEnd,
          startTime: minutesToTime(configuredStart),
          endTime: minutesToTime(configuredEnd),
          durationMinutes: configuredEnd - configuredStart,
        },
      ];
    }
    return [];
  }

  const earliestEvent = Math.min(
    ...sorted.map((ev) => timeToMinutes(ev.startTime))
  );
  const latestEvent = Math.max(
    ...sorted.map((ev) =>
      getEffectiveEndMinutes(ev.startTime, ev.endTime, ev.isOvernight)
    )
  );

  const windowStart = Math.min(configuredStart, earliestEvent);
  const windowEnd = Math.max(configuredEnd, latestEvent);

  const overlapFlags = sorted.map((ev, index) => {
    const s1 = timeToMinutes(ev.startTime);
    const e1 = getEffectiveEndMinutes(ev.startTime, ev.endTime, ev.isOvernight);
    return sorted.some((other, otherIdx) => {
      if (index === otherIdx) return false;
      const s2 = timeToMinutes(other.startTime);
      const e2 = getEffectiveEndMinutes(
        other.startTime,
        other.endTime,
        other.isOvernight
      );
      return s1 < e2 && s2 < e1;
    });
  });

  const mergedBusy: Array<{ start: number; end: number }> = [];
  for (const ev of sorted) {
    const start = timeToMinutes(ev.startTime);
    const end = getEffectiveEndMinutes(ev.startTime, ev.endTime, ev.isOvernight);
    const last = mergedBusy[mergedBusy.length - 1];
    if (!last || start > last.end) {
      mergedBusy.push({ start, end });
    } else {
      last.end = Math.max(last.end, end);
    }
  }

  const freeGaps: Array<{ start: number; end: number }> = [];
  let cursor = windowStart;
  for (const block of mergedBusy) {
    if (block.start - cursor >= minGap) {
      freeGaps.push({ start: cursor, end: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (windowEnd - cursor >= minGap) {
    freeGaps.push({ start: cursor, end: windowEnd });
  }

  const eventItems: TimelineItem[] = sorted.map((ev, idx) => {
    const evStart = timeToMinutes(ev.startTime);
    const evEnd = timeToMinutes(ev.endTime);

    let tightBefore: number | null = null;
    let tightAfter: number | null = null;

    if (buffer > 0) {
      for (let i = 0; i < sorted.length; i++) {
        if (i === idx) continue;
        const otherStart = timeToMinutes(sorted[i].startTime);
        const otherEnd = timeToMinutes(sorted[i].endTime);
        if (otherEnd <= evStart) {
          const gap = evStart - otherEnd;
          if (gap < buffer && (tightBefore === null || gap < tightBefore)) {
            tightBefore = gap;
          }
        } else if (evEnd <= otherStart) {
          const gap = otherStart - evEnd;
          if (gap < buffer && (tightAfter === null || gap < tightAfter)) {
            tightAfter = gap;
          }
        }
      }
    }

    return {
      type: "event",
      id: ev.id,
      event: ev,
      hasOverlap: overlapFlags[idx],
      tightGapBeforeMinutes: tightBefore,
      tightGapAfterMinutes: tightAfter,
    };
  });

  const freeItems: TimelineItem[] = freeGaps.map((gap) => ({
    type: "free",
    id: `free-${gap.start}-${gap.end}`,
    startMinutes: gap.start,
    endMinutes: gap.end,
    startTime: minutesToTime(gap.start),
    endTime: minutesToTime(gap.end),
    durationMinutes: gap.end - gap.start,
  }));

  return [...eventItems, ...freeItems].sort((a, b) => {
    const startA =
      a.type === "event" ? timeToMinutes(a.event.startTime) : a.startMinutes;
    const startB =
      b.type === "event" ? timeToMinutes(b.event.startTime) : b.startMinutes;
    if (startA !== startB) return startA - startB;
    if (a.type !== b.type) return a.type === "free" ? -1 : 1;
    return 0;
  });
}

export function scanShiftTemplateAcrossWeek(
  template: ShiftTemplate,
  allEvents: ScheduleEvent[],
  scope: WeekScope,
  weekKey: string,
  travelBufferMinutes: number,
  referenceDate: Date = new Date()
): ShiftDayScanResult[] {
  const daysMeta = getWeekDaysMeta(scope, referenceDate);
  const weekEvents = getEventsForWeek(allEvents, weekKey);
  const shiftStart = timeToMinutes(template.startTime);
  const shiftEnd = timeToMinutes(template.endTime);

  return daysMeta.map((meta) => {
    const dayEvents = getEventsForDay(weekEvents, meta.dayOfWeek);
    const check = checkTimeConflicts(
      {
        dayOfWeek: meta.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime,
      },
      dayEvents,
      travelBufferMinutes
    );

    let previousEvent: ScheduleEvent | null = null;
    let nextEvent: ScheduleEvent | null = null;

    for (const ev of dayEvents) {
      const evStart = timeToMinutes(ev.startTime);
      const evEnd = timeToMinutes(ev.endTime);
      if (evEnd <= shiftStart) {
        previousEvent = ev;
      } else if (evStart >= shiftEnd && nextEvent === null) {
        nextEvent = ev;
      }
    }

    return {
      dayOfWeek: meta.dayOfWeek,
      dayLabel: meta.shortLabel,
      shortDate: meta.shortDate,
      isToday: meta.isToday,
      status:
        check.status === "ok"
          ? "valid"
          : check.status === "buffer"
            ? "buffer"
            : "conflict",
      overlaps: check.overlaps,
      bufferWarnings: check.bufferWarnings,
      previousEvent,
      nextEvent,
    };
  });
}

export function inferPrimarySession(startTime: string, endTime: string): SessionKey {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const mid = (start + end) / 2;
  if (mid < 12 * 60) return "morning";
  if (mid < 18 * 60) return "afternoon";
  return "evening";
}

export function getEventSessions(event: ScheduleEvent): SessionKey[] {
  if (event.sessionKey) {
    return [event.sessionKey];
  }
  const start = timeToMinutes(event.startTime);
  const end = getEffectiveEndMinutes(
    event.startTime,
    event.endTime,
    event.isOvernight
  );
  const sessions: SessionKey[] = [];
  if (start < 12 * 60 && end > 0) sessions.push("morning");
  if (start < 18 * 60 && end > 12 * 60) sessions.push("afternoon");
  if (end > 18 * 60) sessions.push("evening");
  if (sessions.length === 0) sessions.push("morning");
  return sessions;
}

export interface WeekStats {
  totalMinutesByCategory: Record<EventCategory, number>;
  formattedHoursByCategory: Record<EventCategory, string>;
  shiftCount: number;
  totalEvents: number;
}

export function computeWeekStats(weekEvents: ScheduleEvent[]): WeekStats {
  const mins: Record<EventCategory, number> = {
    study: 0,
    personal: 0,
    work: 0,
  };
  let shiftCount = 0;

  for (const ev of weekEvents) {
    const duration = getDurationMinutes(
      ev.startTime,
      ev.endTime,
      ev.isOvernight
    );
    mins[ev.category] += duration;
    if (ev.category === "work") shiftCount += 1;
  }

  return {
    totalMinutesByCategory: mins,
    formattedHoursByCategory: {
      study: formatHoursCompact(mins.study),
      personal: formatHoursCompact(mins.personal),
      work: formatHoursCompact(mins.work),
    },
    shiftCount,
    totalEvents: weekEvents.length,
  };
}

export function isSlotMarkedFree(
  freeSlots: string[],
  weekKey: string,
  dayOfWeek: DayOfWeek,
  sessionKey: SessionKey
): boolean {
  return (
    freeSlots.includes(`${weekKey}:${dayOfWeek}:${sessionKey}`) ||
    freeSlots.includes(`weekly:${dayOfWeek}:${sessionKey}`)
  );
}

export function getSuggestedFreeSessions(
  weekEvents: ScheduleEvent[],
  limit: number = 4
): string[] {
  const suggestions: string[] = [];

  for (let d = 0; d < 7; d++) {
    const day = d as DayOfWeek;
    for (const session of SESSION_LIST) {
      const hasAnyEvent = weekEvents.some(
        (ev) =>
          ev.dayOfWeek === day && getEventSessions(ev).includes(session.key)
      );
      if (!hasAnyEvent) {
        suggestions.push(`${session.label} ${DAY_SHORT_LABELS[day]}`);
        if (suggestions.length >= limit) {
          return suggestions;
        }
      }
    }
  }

  return suggestions;
}

export function buildCopyScheduleText(
  weekEvents: ScheduleEvent[],
  jobs: JobProfile[],
  weekDaysMeta: WeekDayMeta[],
  weekTitle: string
): string {
  const workEvents = sortEventsChronologically(
    weekEvents.filter((ev) => ev.category === "work")
  );

  if (workEvents.length === 0) {
    return `${weekTitle}\nChưa có ca làm nào được chốt.`;
  }

  let totalPaidMinutes = 0;
  let totalPay = 0;

  const lines = workEvents.map((ev) => {
    const dayMeta = weekDaysMeta[ev.dayOfWeek];
    const job = resolveJobForEvent(ev, jobs);
    const pay = calculateShiftPay(ev, job, ev.dayOfWeek);
    totalPaidMinutes += pay.paidMinutes;
    totalPay += pay.totalPay;

    const sessionKey = ev.sessionKey ?? inferPrimarySession(ev.startTime, ev.endTime);
    const sessionLabel =
      SESSION_LIST.find((s) => s.key === sessionKey)?.label ?? "";

    return `• ${dayMeta.fullLabel} (${dayMeta.shortDate}) - ${sessionLabel}: ${formatTimeRangeShort(ev.startTime, ev.endTime, ev.isOvernight)} | ${job?.name ?? ev.title} (${formatHoursDecimal(pay.paidMinutes)})`;
  });

  return [
    `📅 LỊCH LÀM ${weekTitle.toUpperCase()}`,
    ...lines,
    `---`,
    `Tổng cộng: ${workEvents.length} ca (${formatHoursDecimal(totalPaidMinutes)}) • Dự kiến: ${formatCurrencyVnd(totalPay)}`,
  ].join("\n");
}
