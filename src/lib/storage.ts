import { isOvernightShift, isValidTimeRange } from "@/lib/date-utils";
import {
  createSamplePlannerState,
  DEFAULT_JOBS,
  DEFAULT_SESSION_TIMES,
  DEFAULT_SETTINGS,
  DEFAULT_SHIFT_TEMPLATES,
  DEFAULT_SUBJECTS,
} from "@/lib/sample-data";
import type {
  ActualShiftLog,
  DayOfWeek,
  EventCategory,
  JobBadgeColor,
  JobDefaultSessionTimes,
  JobProfile,
  PayType,
  PlannerSettings,
  PlannerState,
  RepeatMode,
  ScheduleEvent,
  SessionKey,
  ShiftTemplate,
  SubjectPreset,
} from "@/types/schedule";

const STORAGE_KEY = "vui-weekly-planner:v2";
const LEGACY_STORAGE_KEY = "vui-weekly-planner:v1";

const SERVER_SNAPSHOT: PlannerState = {
  version: 4,
  events: [],
  shiftTemplates: DEFAULT_SHIFT_TEMPLATES,
  subjects: DEFAULT_SUBJECTS,
  jobs: DEFAULT_JOBS,
  freeSlots: [],
  settings: DEFAULT_SETTINGS,
};

let cachedClientState: PlannerState | null = null;
const listeners = new Set<() => void>();
let storageListenerAttached = false;

export function generateId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function isValidCategory(value: unknown): value is EventCategory {
  return value === "study" || value === "personal" || value === "work";
}

function isValidRepeatMode(value: unknown): value is RepeatMode {
  return value === "weekly" || value === "once";
}

function isValidDayOfWeek(value: unknown): value is DayOfWeek {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function isValidJobColor(value: unknown): value is JobBadgeColor {
  return (
    value === "purple" ||
    value === "amber" ||
    value === "teal" ||
    value === "emerald" ||
    value === "sky" ||
    value === "violet" ||
    value === "rose" ||
    value === "orange"
  );
}

function isValidPayType(value: unknown): value is PayType {
  return value === "hourly" || value === "shift";
}

function isValidSessionKey(value: unknown): value is SessionKey {
  return value === "morning" || value === "afternoon" || value === "evening";
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return fallback;
}

function sanitizeSessionTimes(raw: unknown): JobDefaultSessionTimes {
  const fallback: JobDefaultSessionTimes = {
    morning: { ...DEFAULT_SESSION_TIMES.morning },
    afternoon: { ...DEFAULT_SESSION_TIMES.afternoon },
    evening: { ...DEFAULT_SESSION_TIMES.evening },
  };
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  (["morning", "afternoon", "evening"] as SessionKey[]).forEach((key) => {
    const slot = obj[key];
    if (slot && typeof slot === "object") {
      const s = slot as Record<string, unknown>;
      const startTime =
        typeof s.startTime === "string" ? s.startTime.trim() : "";
      const endTime = typeof s.endTime === "string" ? s.endTime.trim() : "";
      if (isValidTimeRange(startTime, endTime)) {
        fallback[key] = { startTime, endTime };
      }
    }
  });
  return fallback;
}

function sanitizeJob(raw: unknown, index: number): JobProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) return null;

  const weekendMultiplier = toNonNegativeNumber(obj.weekendMultiplier, 1);
  const holidayMultiplier = toNonNegativeNumber(obj.holidayMultiplier, 4);
  const defaultColors: JobBadgeColor[] = ["purple", "amber", "teal"];

  return {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim()
        : generateId("job"),
    name,
    color: isValidJobColor(obj.color)
      ? obj.color
      : defaultColors[index % defaultColors.length],
    payType: isValidPayType(obj.payType) ? obj.payType : "hourly",
    rate: Math.round(toNonNegativeNumber(obj.rate, 28000)),
    allowancePerShift: Math.round(
      toNonNegativeNumber(obj.allowancePerShift, 0)
    ),
    weekendMultiplier: weekendMultiplier >= 1 ? weekendMultiplier : 1,
    holidayMultiplier: holidayMultiplier >= 1 ? holidayMultiplier : 1,
    defaultSessionTimes: sanitizeSessionTimes(obj.defaultSessionTimes),
  };
}

function sanitizeEvent(
  raw: unknown,
  validJobIds: Set<string>,
  defaultJobId: string
): ScheduleEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const startTime = typeof obj.startTime === "string" ? obj.startTime.trim() : "";
  const endTime = typeof obj.endTime === "string" ? obj.endTime.trim() : "";

  const allowOvernight =
    Boolean(obj.isOvernight) || isOvernightShift(startTime, endTime);

  if (
    !title ||
    !isValidCategory(obj.category) ||
    !isValidDayOfWeek(obj.dayOfWeek) ||
    !isValidTimeRange(startTime, endTime, allowOvernight)
  ) {
    return null;
  }

  const repeatMode: RepeatMode = isValidRepeatMode(obj.repeatMode)
    ? obj.repeatMode
    : "weekly";
  const weekKey =
    repeatMode === "once" &&
    typeof obj.weekKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.weekKey)
      ? obj.weekKey
      : null;

  if (repeatMode === "once" && !weekKey) {
    return null;
  }

  const rawRepeatStart =
    repeatMode === "weekly" &&
    typeof obj.repeatStartDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.repeatStartDate)
      ? obj.repeatStartDate
      : null;
  const rawRepeatEnd =
    repeatMode === "weekly" &&
    typeof obj.repeatEndDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.repeatEndDate)
      ? obj.repeatEndDate
      : null;
  const validRangeEnd =
    rawRepeatStart && rawRepeatEnd && rawRepeatEnd < rawRepeatStart
      ? null
      : rawRepeatEnd;

  const baseEvent: ScheduleEvent = {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim()
        : generateId("ev"),
    title,
    category: obj.category,
    dayOfWeek: obj.dayOfWeek,
    startTime,
    endTime,
    ...(allowOvernight ? { isOvernight: true } : {}),
    note: typeof obj.note === "string" ? obj.note.trim() : "",
    repeatMode,
    weekKey: repeatMode === "weekly" ? null : weekKey,
    ...(rawRepeatStart ? { repeatStartDate: rawRepeatStart } : {}),
    ...(validRangeEnd ? { repeatEndDate: validRangeEnd } : {}),
    createdAt:
      typeof obj.createdAt === "number" && Number.isFinite(obj.createdAt)
        ? obj.createdAt
        : Date.now(),
    ...(isValidSessionKey(obj.sessionKey)
      ? { sessionKey: obj.sessionKey }
      : {}),
  };

  if (baseEvent.category === "work") {
    const rawJobId = typeof obj.jobId === "string" ? obj.jobId.trim() : "";
    baseEvent.jobId =
      rawJobId && validJobIds.has(rawJobId) ? rawJobId : defaultJobId;
    baseEvent.breakMinutes = Math.round(
      toNonNegativeNumber(obj.breakMinutes, 0)
    );
    if (
      typeof obj.breakStartTime === "string" &&
      /^([01]\d|2[0-3]):([0-5]\d)$/.test(obj.breakStartTime) &&
      typeof obj.breakEndTime === "string" &&
      /^([01]\d|2[0-3]):([0-5]\d)$/.test(obj.breakEndTime)
    ) {
      baseEvent.breakStartTime = obj.breakStartTime;
      baseEvent.breakEndTime = obj.breakEndTime;
    }
    baseEvent.isHoliday = Boolean(obj.isHoliday);
    if (
      typeof obj.holidayMultiplier === "number" &&
      Number.isFinite(obj.holidayMultiplier) &&
      obj.holidayMultiplier >= 1
    ) {
      baseEvent.holidayMultiplier = obj.holidayMultiplier;
    }
    baseEvent.bonusAmount = Math.round(
      toNonNegativeNumber(obj.bonusAmount, 0)
    );
    baseEvent.deductionAmount = Math.round(
      toNonNegativeNumber(obj.deductionAmount, 0)
    );
    if (typeof obj.adjustmentNote === "string" && obj.adjustmentNote.trim()) {
      baseEvent.adjustmentNote = obj.adjustmentNote.trim();
    }
    baseEvent.isCompleted = Boolean(obj.isCompleted);
    if (Array.isArray(obj.completedDates)) {
      baseEvent.completedDates = obj.completedDates.filter(
        (d): d is string =>
          typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
      );
    }
    if (obj.actualLogs && typeof obj.actualLogs === "object") {
      const sanitizedLogs: Record<string, ActualShiftLog> = {};
      for (const [dateKey, rawLog] of Object.entries(
        obj.actualLogs as Record<string, unknown>
      )) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !rawLog || typeof rawLog !== "object") {
          continue;
        }
        const logObj = rawLog as Record<string, unknown>;
        const logStart =
          typeof logObj.startTime === "string" ? logObj.startTime.trim() : "";
        const logEnd =
          typeof logObj.endTime === "string" ? logObj.endTime.trim() : "";
        const logOvernight =
          Boolean(logObj.isOvernight) || isOvernightShift(logStart, logEnd);
        if (!isValidTimeRange(logStart, logEnd, logOvernight)) continue;
        const hasBreakRange =
          typeof logObj.breakStartTime === "string" &&
          /^([01]\d|2[0-3]):([0-5]\d)$/.test(logObj.breakStartTime) &&
          typeof logObj.breakEndTime === "string" &&
          /^([01]\d|2[0-3]):([0-5]\d)$/.test(logObj.breakEndTime);
        sanitizedLogs[dateKey] = {
          startTime: logStart,
          endTime: logEnd,
          ...(logOvernight ? { isOvernight: true } : {}),
          breakMinutes: Math.round(toNonNegativeNumber(logObj.breakMinutes, 0)),
          ...(hasBreakRange
            ? {
                breakStartTime: logObj.breakStartTime as string,
                breakEndTime: logObj.breakEndTime as string,
              }
            : {}),
          isHoliday: Boolean(logObj.isHoliday),
          ...(typeof logObj.holidayMultiplier === "number" &&
          Number.isFinite(logObj.holidayMultiplier) &&
          logObj.holidayMultiplier >= 1
            ? { holidayMultiplier: logObj.holidayMultiplier }
            : {}),
          bonusAmount: Math.round(toNonNegativeNumber(logObj.bonusAmount, 0)),
          deductionAmount: Math.round(
            toNonNegativeNumber(logObj.deductionAmount, 0)
          ),
        };
      }
      if (Object.keys(sanitizedLogs).length > 0) {
        baseEvent.actualLogs = sanitizedLogs;
      }
    }
  }

  return baseEvent;
}

function sanitizeShiftTemplate(
  raw: unknown,
  validJobIds: Set<string>,
  defaultJobId: string
): ShiftTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const startTime = typeof obj.startTime === "string" ? obj.startTime.trim() : "";
  const endTime = typeof obj.endTime === "string" ? obj.endTime.trim() : "";

  const allowOvernight =
    Boolean(obj.isOvernight) || isOvernightShift(startTime, endTime);

  if (!name || !isValidTimeRange(startTime, endTime, allowOvernight)) return null;

  const rawJobId = typeof obj.jobId === "string" ? obj.jobId.trim() : "";

  return {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim()
        : generateId("shift"),
    name,
    startTime,
    endTime,
    ...(allowOvernight ? { isOvernight: true } : {}),
    note: typeof obj.note === "string" ? obj.note.trim() : "",
    jobId: rawJobId && validJobIds.has(rawJobId) ? rawJobId : defaultJobId,
    breakMinutes: Math.round(toNonNegativeNumber(obj.breakMinutes, 0)),
  };
}

function sanitizeSubject(raw: unknown): SubjectPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const startTime = typeof obj.startTime === "string" ? obj.startTime.trim() : "";
  const endTime = typeof obj.endTime === "string" ? obj.endTime.trim() : "";

  if (!name || !isValidTimeRange(startTime, endTime)) return null;

  const subjRepeatMode = isValidRepeatMode(obj.repeatMode)
    ? obj.repeatMode
    : "weekly";
  const subjStart =
    subjRepeatMode === "weekly" &&
    typeof obj.repeatStartDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.repeatStartDate)
      ? obj.repeatStartDate
      : null;
  const subjEnd =
    subjRepeatMode === "weekly" &&
    typeof obj.repeatEndDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.repeatEndDate) &&
    (!subjStart || obj.repeatEndDate >= subjStart)
      ? obj.repeatEndDate
      : null;

  return {
    id:
      typeof obj.id === "string" && obj.id.trim()
        ? obj.id.trim()
        : generateId("subj"),
    name,
    startTime,
    endTime,
    note: typeof obj.note === "string" ? obj.note.trim() : "",
    repeatMode: subjRepeatMode,
    ...(subjStart ? { repeatStartDate: subjStart } : {}),
    ...(subjEnd ? { repeatEndDate: subjEnd } : {}),
  };
}

function sanitizeSettings(raw: unknown): PlannerSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const obj = raw as Record<string, unknown>;
  const buffer =
    typeof obj.travelBufferMinutes === "number" &&
    Number.isFinite(obj.travelBufferMinutes) &&
    obj.travelBufferMinutes >= 0 &&
    obj.travelBufferMinutes <= 120
      ? Math.round(obj.travelBufferMinutes)
      : DEFAULT_SETTINGS.travelBufferMinutes;

  const rawStart =
    typeof obj.dayStartTime === "string" &&
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(obj.dayStartTime)
      ? obj.dayStartTime
      : DEFAULT_SETTINGS.dayStartTime;

  const rawEnd =
    typeof obj.dayEndTime === "string" &&
    /^(([01]\d|2[0-3]):([0-5]\d)|24:00)$/.test(obj.dayEndTime) &&
    isValidTimeRange(rawStart, obj.dayEndTime)
      ? obj.dayEndTime
      : DEFAULT_SETTINGS.dayEndTime;

  // Migrate legacy 07:00 - 22:00 default window to 00:00 - 24:00
  const isLegacyDefaultWindow = rawStart === "07:00" && rawEnd === "22:00";
  const dayStartTime = isLegacyDefaultWindow
    ? DEFAULT_SETTINGS.dayStartTime
    : rawStart;
  const dayEndTime = isLegacyDefaultWindow
    ? DEFAULT_SETTINGS.dayEndTime
    : rawEnd;

  const minFreeGapMinutes =
    typeof obj.minFreeGapMinutes === "number" &&
    Number.isFinite(obj.minFreeGapMinutes) &&
    obj.minFreeGapMinutes >= 10 &&
    obj.minFreeGapMinutes <= 180
      ? Math.round(obj.minFreeGapMinutes)
      : DEFAULT_SETTINGS.minFreeGapMinutes;

  const monthlyIncomeGoal = Math.round(
    toNonNegativeNumber(
      obj.monthlyIncomeGoal,
      DEFAULT_SETTINGS.monthlyIncomeGoal
    )
  );

  return {
    travelBufferMinutes: buffer,
    dayStartTime,
    dayEndTime,
    minFreeGapMinutes,
    theme: "light",
    monthlyIncomeGoal,
  };
}

export function validateAndParseState(rawText: string):
  | {
      ok: true;
      state: PlannerState;
    }
  | {
      ok: false;
      error: string;
    } {
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        error: "Dữ liệu không đúng định dạng JSON đối tượng.",
      };
    }
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.events)) {
      return {
        ok: false,
        error: "Thiếu danh sách sự kiện (events) hợp lệ.",
      };
    }

    const parsedJobs = Array.isArray(obj.jobs)
      ? obj.jobs
          .map((item, idx) => sanitizeJob(item, idx))
          .filter((item): item is JobProfile => item !== null)
      : [];

    const jobs =
      parsedJobs.length > 0
        ? parsedJobs
        : DEFAULT_JOBS.map((j) => ({
            ...j,
            defaultSessionTimes: {
              morning: { ...j.defaultSessionTimes.morning },
              afternoon: { ...j.defaultSessionTimes.afternoon },
              evening: { ...j.defaultSessionTimes.evening },
            },
          }));

    const validJobIds = new Set(jobs.map((j) => j.id));
    const defaultJobId = jobs[0].id;

    const events = obj.events
      .map((item) => sanitizeEvent(item, validJobIds, defaultJobId))
      .filter((item): item is ScheduleEvent => item !== null);

    const shiftTemplates = Array.isArray(obj.shiftTemplates)
      ? obj.shiftTemplates
          .map((item) => sanitizeShiftTemplate(item, validJobIds, defaultJobId))
          .filter((item): item is ShiftTemplate => item !== null)
      : DEFAULT_SHIFT_TEMPLATES.map((t) => ({ ...t, jobId: defaultJobId }));

    const subjects = Array.isArray(obj.subjects)
      ? obj.subjects
          .map(sanitizeSubject)
          .filter((item): item is SubjectPreset => item !== null)
      : DEFAULT_SUBJECTS.map((s) => ({ ...s }));

    const freeSlots = Array.isArray(obj.freeSlots)
      ? obj.freeSlots.filter((s): s is string => typeof s === "string")
      : [];

    const settings = sanitizeSettings(obj.settings);

    return {
      ok: true,
      state: {
        version: 4,
        events,
        shiftTemplates:
          shiftTemplates.length > 0
            ? shiftTemplates
            : DEFAULT_SHIFT_TEMPLATES.map((t) => ({
                ...t,
                jobId: defaultJobId,
              })),
        subjects,
        jobs,
        freeSlots,
        settings,
      },
    };
  } catch {
    return {
      ok: false,
      error: "Không thể giải mã JSON. Hãy kiểm tra lại nội dung sao lưu.",
    };
  }
}

function isGenericOldSample(state: PlannerState): boolean {
  const hasOldCafeJob = state.jobs.some((j) => j.id === "job-cafe");
  const hasOldStudy = state.events.some((e) => e.id === "ev-study-1");
  return hasOldCafeJob && hasOldStudy;
}

function readFromLocalStorage(): PlannerState {
  if (typeof window === "undefined") {
    return SERVER_SNAPSHOT;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = validateAndParseState(legacyRaw);
        if (legacyParsed.ok && !isGenericOldSample(legacyParsed.state)) {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(legacyParsed.state)
          );
          return legacyParsed.state;
        }
      }
      const sample = createSamplePlannerState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
      return sample;
    }
    const parsed = validateAndParseState(raw);
    if (parsed.ok) {
      const rawObj = JSON.parse(raw) as { version?: number };
      if (rawObj.version !== 4) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.state));
      }
      return parsed.state;
    }
    return createSamplePlannerState();
  } catch {
    return createSamplePlannerState();
  }
}

function writeToLocalStorage(state: PlannerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors gracefully
  }
}

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

export function getPlannerSnapshot(): PlannerState {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (cachedClientState === null) {
    cachedClientState = readFromLocalStorage();
  }
  return cachedClientState;
}

export function getPlannerServerSnapshot(): PlannerState {
  return SERVER_SNAPSHOT;
}

export function subscribePlannerStore(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window !== "undefined" && !storageListenerAttached) {
    storageListenerAttached = true;
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        cachedClientState = readFromLocalStorage();
        emitChange();
      }
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

export function updatePlannerState(
  updater: (prev: PlannerState) => PlannerState
): PlannerState {
  const current = getPlannerSnapshot();
  const next = updater(current);
  cachedClientState = next;
  writeToLocalStorage(next);
  emitChange();
  return next;
}

export function replacePlannerStateFromRemote(remoteState: PlannerState): void {
  cachedClientState = remoteState;
  writeToLocalStorage(remoteState);
  emitChange();
}

export function subscribeHydration(listener: () => void): () => void {
  if (typeof listener !== "function") return () => {};
  return () => {};
}

export function serializePlannerBackup(state: PlannerState): string {
  return JSON.stringify(state, null, 2);
}
