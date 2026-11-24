import {
  formatWeekRangeLabel,
  getDurationMinutes,
  getOccurrenceIsoDate,
  getWeekKeyByOffset,
  isOvernightShift,
  isWeeklyEventActiveOnDate,
  timeToMinutes,
  toLocalIsoDate,
  toMondayFirstDay,
} from "@/lib/date-utils";

export { getOccurrenceIsoDate };
import type {
  DayOfWeek,
  IncomeFilterPeriod,
  JobIncomeSummary,
  JobProfile,
  PeriodIncomeSummary,
  ScheduleEvent,
  ShiftOccurrence,
  ShiftPayBreakdown,
  WeekScope,
} from "@/types/schedule";

export function resolveJobForEvent(
  event: ScheduleEvent,
  jobs: JobProfile[]
): JobProfile | null {
  if (jobs.length === 0) return null;
  if (event.jobId) {
    const found = jobs.find((j) => j.id === event.jobId);
    if (found) return found;
  }
  return jobs[0];
}

export function calculateShiftPay(
  event: Pick<
    ScheduleEvent,
    | "startTime"
    | "endTime"
    | "isOvernight"
    | "breakMinutes"
    | "isHoliday"
    | "holidayMultiplier"
    | "bonusAmount"
    | "deductionAmount"
  >,
  job: JobProfile | null,
  dayOfWeek: DayOfWeek
): ShiftPayBreakdown {
  const rawMinutes = getDurationMinutes(
    event.startTime,
    event.endTime,
    event.isOvernight
  );
  const breakMinutes = Math.min(
    rawMinutes,
    Math.max(0, Math.round(event.breakMinutes ?? 0))
  );
  const paidMinutes = Math.max(0, rawMinutes - breakMinutes);
  const paidHours = paidMinutes / 60;

  if (!job) {
    const bonus = Math.max(0, Math.round(event.bonusAmount ?? 0));
    const deduction = Math.max(0, Math.round(event.deductionAmount ?? 0));
    return {
      rawMinutes,
      breakMinutes,
      paidMinutes,
      paidHours,
      multiplier: 1,
      multiplierReason: "normal",
      basePay: 0,
      allowance: 0,
      bonus,
      deduction,
      totalPay: Math.max(0, bonus - deduction),
    };
  }

  let multiplier = 1;
  let multiplierReason: "normal" | "weekend" | "holiday" = "normal";

  if (event.isHoliday) {
    multiplier = Math.max(
      1,
      event.holidayMultiplier || job.holidayMultiplier || 4
    );
    if (multiplier > 1) multiplierReason = "holiday";
  } else if (dayOfWeek === 5 || dayOfWeek === 6) {
    multiplier = Math.max(1, job.weekendMultiplier || 1);
    if (multiplier > 1) multiplierReason = "weekend";
  }

  const basePay =
    job.payType === "hourly"
      ? Math.round(paidHours * job.rate * multiplier)
      : Math.round(job.rate * multiplier);

  const allowance = Math.max(0, Math.round(job.allowancePerShift || 0));
  const bonus = Math.max(0, Math.round(event.bonusAmount ?? 0));
  const deduction = Math.max(0, Math.round(event.deductionAmount ?? 0));
  const totalPay = Math.max(0, basePay + allowance + bonus - deduction);

  return {
    rawMinutes,
    breakMinutes,
    paidMinutes,
    paidHours,
    multiplier,
    multiplierReason,
    basePay,
    allowance,
    bonus,
    deduction,
    totalPay,
  };
}

export function formatShortDateFromIso(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function hasShiftEndPassed(
  isoDate: string,
  startTime: string,
  endTime: string,
  isOvernight: boolean | undefined,
  now: Date
): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  const endMinutes = timeToMinutes(endTime);
  const hours = Math.floor(endMinutes / 60);
  const mins = endMinutes % 60;
  const extraDay = isOvernightShift(startTime, endTime, isOvernight) ? 1 : 0;
  const shiftEnd = new Date(
    y,
    (m || 1) - 1,
    (d || 1) + extraDay,
    hours,
    mins,
    0,
    0
  );
  return now.getTime() >= shiftEnd.getTime();
}

export function isOccurrenceManuallyCompleted(
  event: ScheduleEvent,
  isoDate: string
): boolean {
  if (event.repeatMode === "once") {
    return Boolean(event.isCompleted);
  }
  return Boolean(event.completedDates?.includes(isoDate));
}

export function resolveEventForDate(
  event: ScheduleEvent,
  isoDate?: string
): ScheduleEvent {
  if (
    !isoDate ||
    event.category !== "work" ||
    event.repeatMode !== "weekly" ||
    !event.actualLogs?.[isoDate]
  ) {
    return event;
  }
  return {
    ...event,
    ...event.actualLogs[isoDate],
  };
}

function buildOccurrence(
  event: ScheduleEvent,
  isoDate: string,
  jobs: JobProfile[],
  now: Date
): ShiftOccurrence {
  const effectiveEvent = resolveEventForDate(event, isoDate);
  const job = resolveJobForEvent(effectiveEvent, jobs);
  const pay = calculateShiftPay(effectiveEvent, job, effectiveEvent.dayOfWeek);
  const isPastScheduled = hasShiftEndPassed(
    isoDate,
    effectiveEvent.startTime,
    effectiveEvent.endTime,
    effectiveEvent.isOvernight,
    now
  );
  const manualCompleted = isOccurrenceManuallyCompleted(event, isoDate);

  return {
    occurrenceKey: `${event.id}::${isoDate}`,
    isoDate,
    shortDate: formatShortDateFromIso(isoDate),
    dayOfWeek: effectiveEvent.dayOfWeek,
    event: effectiveEvent,
    job,
    pay,
    isCompleted: manualCompleted,
    isPastScheduled,
  };
}

export function expandWorkOccurrencesForWeekOffset(
  allEvents: ScheduleEvent[],
  jobs: JobProfile[],
  weekOffset: number,
  referenceDate: Date = new Date()
): ShiftOccurrence[] {
  const weekKey = getWeekKeyByOffset(weekOffset, referenceDate);
  const workEvents = allEvents.filter((ev) => {
    if (ev.category !== "work") return false;
    if (ev.repeatMode === "once") return ev.weekKey === weekKey;
    return isWeeklyEventActiveOnDate(
      ev,
      getOccurrenceIsoDate(weekKey, ev.dayOfWeek)
    );
  });

  const occurrences = workEvents.map((ev) => {
    const isoDate = getOccurrenceIsoDate(weekKey, ev.dayOfWeek);
    return buildOccurrence(ev, isoDate, jobs, referenceDate);
  });

  return occurrences.sort((a, b) => {
    if (a.isoDate !== b.isoDate) return a.isoDate.localeCompare(b.isoDate);
    return timeToMinutes(a.event.startTime) - timeToMinutes(b.event.startTime);
  });
}

export function expandWorkOccurrencesForWeek(
  allEvents: ScheduleEvent[],
  jobs: JobProfile[],
  scope: WeekScope,
  referenceDate: Date = new Date()
): ShiftOccurrence[] {
  return expandWorkOccurrencesForWeekOffset(
    allEvents,
    jobs,
    scope === "next" ? 1 : 0,
    referenceDate
  );
}

export function expandWorkOccurrencesForMonth(
  allEvents: ScheduleEvent[],
  jobs: JobProfile[],
  referenceDate: Date = new Date()
): ShiftOccurrence[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workEvents = allEvents.filter((ev) => ev.category === "work");

  const occurrences: ShiftOccurrence[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isoDate = toLocalIsoDate(date);
    const dayOfWeek = toMondayFirstDay(date);
    const mondayOffset = dayOfWeek;
    const mondayDate = new Date(year, month, day - mondayOffset);
    const weekKey = toLocalIsoDate(mondayDate);

    for (const ev of workEvents) {
      if (ev.dayOfWeek !== dayOfWeek) continue;
      if (ev.repeatMode === "weekly" && isWeeklyEventActiveOnDate(ev, isoDate)) {
        occurrences.push(buildOccurrence(ev, isoDate, jobs, referenceDate));
      } else if (ev.repeatMode === "once" && ev.weekKey === weekKey) {
        occurrences.push(buildOccurrence(ev, isoDate, jobs, referenceDate));
      }
    }
  }

  return occurrences.sort((a, b) => {
    if (a.isoDate !== b.isoDate) return a.isoDate.localeCompare(b.isoDate);
    return timeToMinutes(a.event.startTime) - timeToMinutes(b.event.startTime);
  });
}

export function computePeriodIncomeSummary(
  allEvents: ScheduleEvent[],
  jobs: JobProfile[],
  period: IncomeFilterPeriod,
  referenceDate: Date = new Date()
): PeriodIncomeSummary {
  let occurrences: ShiftOccurrence[] = [];
  let periodLabel = "";

  if (period === "this_week") {
    occurrences = expandWorkOccurrencesForWeek(
      allEvents,
      jobs,
      "current",
      referenceDate
    );
    periodLabel = `Tuần này (${formatWeekRangeLabel("current", referenceDate)})`;
  } else if (period === "next_week") {
    occurrences = expandWorkOccurrencesForWeek(
      allEvents,
      jobs,
      "next",
      referenceDate
    );
    periodLabel = `Tuần sau (${formatWeekRangeLabel("next", referenceDate)})`;
  } else {
    occurrences = expandWorkOccurrencesForMonth(
      allEvents,
      jobs,
      referenceDate
    );
    periodLabel = `Tháng ${referenceDate.getMonth() + 1}/${referenceDate.getFullYear()}`;
  }

  let earnedAmount = 0;
  let projectedAmount = 0;
  let completedCount = 0;
  let upcomingCount = 0;
  let unconfirmedPastCount = 0;
  let totalPaidMinutes = 0;

  const byJob = new Map<
    string,
    {
      job: JobProfile;
      shiftCount: number;
      completedShifts: number;
      upcomingShifts: number;
      totalPaidMinutes: number;
      earnedAmount: number;
      projectedAmount: number;
    }
  >();

  for (const job of jobs) {
    byJob.set(job.id, {
      job,
      shiftCount: 0,
      completedShifts: 0,
      upcomingShifts: 0,
      totalPaidMinutes: 0,
      earnedAmount: 0,
      projectedAmount: 0,
    });
  }

  for (const occ of occurrences) {
    totalPaidMinutes += occ.pay.paidMinutes;
    if (occ.isCompleted) {
      earnedAmount += occ.pay.totalPay;
      completedCount += 1;
    } else {
      projectedAmount += occ.pay.totalPay;
      upcomingCount += 1;
      if (occ.isPastScheduled) {
        unconfirmedPastCount += 1;
      }
    }

    if (occ.job) {
      const entry = byJob.get(occ.job.id);
      if (entry) {
        entry.shiftCount += 1;
        entry.totalPaidMinutes += occ.pay.paidMinutes;
        if (occ.isCompleted) {
          entry.completedShifts += 1;
          entry.earnedAmount += occ.pay.totalPay;
        } else {
          entry.upcomingShifts += 1;
          entry.projectedAmount += occ.pay.totalPay;
        }
      }
    }
  }

  const totalAmount = earnedAmount + projectedAmount;

  const jobSummaries: JobIncomeSummary[] = Array.from(byJob.values())
    .map((entry) => {
      const jobTotal = entry.earnedAmount + entry.projectedAmount;
      return {
        ...entry,
        totalAmount: jobTotal,
        sharePercent:
          totalAmount > 0 ? Math.round((jobTotal / totalAmount) * 100) : 0,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    period,
    periodLabel,
    occurrences,
    earnedAmount,
    projectedAmount,
    totalAmount,
    completedCount,
    upcomingCount,
    unconfirmedPastCount,
    totalPaidMinutes,
    jobSummaries,
  };
}

