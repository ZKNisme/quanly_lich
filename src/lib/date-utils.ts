import type { DayOfWeek, WeekDayMeta, WeekScope } from "@/types/schedule";

export const DAY_SHORT_LABELS: readonly string[] = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

export const DAY_FULL_LABELS: readonly string[] = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 24 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0;
  }
  return Math.min(hours * 60 + minutes, 24 * 60);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function isValidTimeRange(
  startTime: string,
  endTime: string,
  allowOvernight: boolean = false
): boolean {
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const endPattern = /^(([01]\d|2[0-3]):([0-5]\d)|24:00)$/;
  if (!timePattern.test(startTime) || !endPattern.test(endTime)) {
    return false;
  }
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (e > s) return true;
  if (allowOvernight && e < s) return true;
  return false;
}

export function isOvernightShift(
  startTime: string,
  endTime: string,
  explicitOvernight?: boolean
): boolean {
  if (explicitOvernight) return true;
  return timeToMinutes(endTime) < timeToMinutes(startTime);
}

export function getEffectiveEndMinutes(
  startTime: string,
  endTime: string,
  explicitOvernight?: boolean
): number {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (explicitOvernight || e < s) {
    return e + 24 * 60;
  }
  return e;
}

export function getDurationMinutes(
  startTime: string,
  endTime: string,
  explicitOvernight?: boolean
): number {
  return Math.max(
    0,
    getEffectiveEndMinutes(startTime, endTime, explicitOvernight) -
      timeToMinutes(startTime)
  );
}

export function formatTimeRangeShort(
  startTime: string,
  endTime: string,
  explicitOvernight?: boolean
): string {
  const overnight = isOvernightShift(startTime, endTime, explicitOvernight);
  return overnight ? `${startTime} - ${endTime} (+1)` : `${startTime} - ${endTime}`;
}

export function formatDurationVi(minutes: number): string {
  const safeMins = Math.max(0, Math.round(minutes));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}g`;
  return `${h}g ${m}p`;
}

export function formatHoursCompact(minutes: number): string {
  const safeMins = Math.max(0, Math.round(minutes));
  const hours = safeMins / 60;
  if (Number.isInteger(hours)) return `${hours}g`;
  return `${hours.toFixed(1).replace(/\.0$/, "")}g`;
}

export function toMondayFirstDay(date: Date): DayOfWeek {
  return ((date.getDay() + 6) % 7) as DayOfWeek;
}

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekStartDateByOffset(
  weekOffset: number,
  referenceDate: Date = new Date()
): Date {
  const base = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const mondayOffset = toMondayFirstDay(base);
  base.setDate(base.getDate() - mondayOffset + weekOffset * 7);
  return base;
}

export function getWeekKeyByOffset(
  weekOffset: number,
  referenceDate: Date = new Date()
): string {
  return toLocalIsoDate(getWeekStartDateByOffset(weekOffset, referenceDate));
}

export function getWeekStartDate(
  scope: WeekScope,
  referenceDate: Date = new Date()
): Date {
  return getWeekStartDateByOffset(scope === "next" ? 1 : 0, referenceDate);
}

export function getWeekKey(
  scope: WeekScope,
  referenceDate: Date = new Date()
): string {
  return getWeekKeyByOffset(scope === "next" ? 1 : 0, referenceDate);
}

export function getWeekDaysMetaByOffset(
  weekOffset: number,
  referenceDate: Date = new Date()
): WeekDayMeta[] {
  const monday = getWeekStartDateByOffset(weekOffset, referenceDate);
  const todayIso = toLocalIsoDate(referenceDate);

  return Array.from({ length: 7 }, (_, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    const isoDate = toLocalIsoDate(dayDate);
    const dayNum = String(dayDate.getDate()).padStart(2, "0");
    const monthNum = String(dayDate.getMonth() + 1).padStart(2, "0");
    return {
      dayOfWeek: idx as DayOfWeek,
      shortLabel: DAY_SHORT_LABELS[idx],
      fullLabel: DAY_FULL_LABELS[idx],
      dateNumber: String(dayDate.getDate()),
      shortDate: `${dayNum}/${monthNum}`,
      isoDate,
      isToday: isoDate === todayIso,
    };
  });
}

export function getWeekDaysMeta(
  scope: WeekScope,
  referenceDate: Date = new Date()
): WeekDayMeta[] {
  return getWeekDaysMetaByOffset(scope === "next" ? 1 : 0, referenceDate);
}

export function formatWeekRangeLabel(
  scope: WeekScope,
  referenceDate: Date = new Date()
): string {
  const days = getWeekDaysMeta(scope, referenceDate);
  return `${days[0].shortDate} – ${days[6].shortDate}`;
}

export function formatWeekTitleWithYear(
  weekOffset: number,
  referenceDate: Date = new Date()
): string {
  const days = getWeekDaysMetaByOffset(weekOffset, referenceDate);
  const sundayIso = days[6].isoDate;
  const year = sundayIso.split("-")[0];
  return `Tuần ${days[0].shortDate} - ${days[6].shortDate}/${year}`;
}
