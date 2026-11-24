export type EventCategory = "study" | "personal" | "work";

export type RepeatMode = "weekly" | "once";

/** 0 = Thứ 2 (Monday) ... 6 = Chủ Nhật (Sunday) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekScope = "current" | "next";

export type TopTab = "matrix" | "income";

export type IncomeFilterPeriod = "this_week" | "next_week" | "this_month";

export type SessionKey = "morning" | "afternoon" | "evening";

export type PayType = "hourly" | "shift";

export type JobBadgeColor =
  | "purple"
  | "amber"
  | "teal"
  | "emerald"
  | "sky"
  | "violet"
  | "rose"
  | "orange";

export interface SessionTimeRange {
  startTime: string;
  endTime: string;
}

export type JobDefaultSessionTimes = Record<SessionKey, SessionTimeRange>;

export interface JobProfile {
  id: string;
  name: string;
  color: JobBadgeColor;
  payType: PayType;
  /** VNĐ/giờ if payType === "hourly", VNĐ/ca if payType === "shift" */
  rate: number;
  /** Phụ cấp cố định mỗi ca (tiền ăn / xăng xe) */
  allowancePerShift: number;
  /** Hệ số lương T7 & CN (VD: 1, 1.5, 2) */
  weekendMultiplier: number;
  /** Hệ số lương ngày lễ (VD: 2, 3) */
  holidayMultiplier: number;
  /** Giờ làm mặc định cho Sáng / Chiều / Tối */
  defaultSessionTimes: JobDefaultSessionTimes;
}

export interface ActualShiftLog {
  startTime: string;
  endTime: string;
  isOvernight?: boolean;
  breakMinutes?: number;
  breakStartTime?: string;
  breakEndTime?: string;
  isHoliday?: boolean;
  holidayMultiplier?: number;
  bonusAmount?: number;
  deductionAmount?: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  category: EventCategory;
  dayOfWeek: DayOfWeek;
  /** Format "HH:mm" (24h) */
  startTime: string;
  /** Format "HH:mm" (24h) */
  endTime: string;
  /** True when shift crosses midnight into next day (e.g. 20:00 -> 01:30) */
  isOvernight?: boolean;
  note: string;
  repeatMode: RepeatMode;
  /** ISO Monday date string "YYYY-MM-DD" when repeatMode === "once", null when "weekly" */
  weekKey: string | null;
  /** Optional inclusive ISO start date ("YYYY-MM-DD") when repeatMode === "weekly" */
  repeatStartDate?: string | null;
  /** Optional inclusive ISO end date ("YYYY-MM-DD") when repeatMode === "weekly" */
  repeatEndDate?: string | null;
  createdAt: number;
  /** Work shift fields */
  jobId?: string;
  sessionKey?: SessionKey;
  breakMinutes?: number;
  breakStartTime?: string;
  breakEndTime?: string;
  isHoliday?: boolean;
  holidayMultiplier?: number;
  bonusAmount?: number;
  deductionAmount?: number;
  adjustmentNote?: string;
  isCompleted?: boolean;
  completedDates?: string[];
  /** Actual hours/pay overrides per ISO date ("YYYY-MM-DD") for weekly recurring shifts */
  actualLogs?: Record<string, ActualShiftLog>;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isOvernight?: boolean;
  note: string;
  jobId?: string;
  breakMinutes?: number;
}

export interface SubjectPreset {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  note: string;
  repeatMode: RepeatMode;
  repeatStartDate?: string | null;
  repeatEndDate?: string | null;
}

export interface PlannerSettings {
  travelBufferMinutes: number;
  dayStartTime: string;
  dayEndTime: string;
  minFreeGapMinutes: number;
  theme: "system" | "light" | "dark";
  monthlyIncomeGoal: number;
}

export interface PlannerState {
  version: number;
  events: ScheduleEvent[];
  shiftTemplates: ShiftTemplate[];
  subjects: SubjectPreset[];
  jobs: JobProfile[];
  /** Explicit "Rảnh" slot keys: `${weekKey}:${dayOfWeek}:${sessionKey}` or `weekly:${dayOfWeek}:${sessionKey}` */
  freeSlots: string[];
  settings: PlannerSettings;
}

export interface ConflictDetail {
  event: ScheduleEvent;
  kind: "overlap" | "buffer";
  minutes: number;
}

export interface ConflictCheckResult {
  status: "ok" | "buffer" | "conflict";
  overlaps: ConflictDetail[];
  bufferWarnings: ConflictDetail[];
}

export type TimelineItem =
  | {
      type: "event";
      id: string;
      event: ScheduleEvent;
      hasOverlap: boolean;
      tightGapBeforeMinutes: number | null;
      tightGapAfterMinutes: number | null;
    }
  | {
      type: "free";
      id: string;
      startMinutes: number;
      endMinutes: number;
      startTime: string;
      endTime: string;
      durationMinutes: number;
    };

export interface ShiftDayScanResult {
  dayOfWeek: DayOfWeek;
  dayLabel: string;
  shortDate: string;
  isToday: boolean;
  status: "valid" | "buffer" | "conflict";
  overlaps: ConflictDetail[];
  bufferWarnings: ConflictDetail[];
  previousEvent: ScheduleEvent | null;
  nextEvent: ScheduleEvent | null;
}

export interface WeekDayMeta {
  dayOfWeek: DayOfWeek;
  shortLabel: string;
  fullLabel: string;
  dateNumber: string;
  shortDate: string;
  isoDate: string;
  isToday: boolean;
}

export interface ShiftPayBreakdown {
  rawMinutes: number;
  breakMinutes: number;
  paidMinutes: number;
  paidHours: number;
  multiplier: number;
  multiplierReason: "normal" | "weekend" | "holiday";
  basePay: number;
  allowance: number;
  bonus: number;
  deduction: number;
  totalPay: number;
}

export interface ShiftOccurrence {
  occurrenceKey: string;
  isoDate: string;
  shortDate: string;
  dayOfWeek: DayOfWeek;
  event: ScheduleEvent;
  job: JobProfile | null;
  pay: ShiftPayBreakdown;
  isCompleted: boolean;
  isPastScheduled: boolean;
}

export interface JobIncomeSummary {
  job: JobProfile;
  shiftCount: number;
  completedShifts: number;
  upcomingShifts: number;
  totalPaidMinutes: number;
  earnedAmount: number;
  projectedAmount: number;
  totalAmount: number;
  sharePercent: number;
}

export interface PeriodIncomeSummary {
  period: IncomeFilterPeriod;
  periodLabel: string;
  occurrences: ShiftOccurrence[];
  earnedAmount: number;
  projectedAmount: number;
  totalAmount: number;
  completedCount: number;
  upcomingCount: number;
  unconfirmedPastCount: number;
  totalPaidMinutes: number;
  jobSummaries: JobIncomeSummary[];
}
