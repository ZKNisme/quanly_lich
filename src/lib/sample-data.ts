import type {
  JobDefaultSessionTimes,
  JobProfile,
  PlannerSettings,
  PlannerState,
  ShiftTemplate,
  SubjectPreset,
} from "@/types/schedule";

export const DEFAULT_SESSION_TIMES: JobDefaultSessionTimes = {
  morning: { startTime: "08:00", endTime: "14:00" },
  afternoon: { startTime: "14:00", endTime: "18:00" },
  evening: { startTime: "20:00", endTime: "01:30" },
};

export const DEFAULT_JOBS: JobProfile[] = [
  {
    id: "job-texas",
    name: "Texas",
    color: "orange",
    payType: "hourly",
    rate: 28000,
    allowancePerShift: 0,
    weekendMultiplier: 1,
    holidayMultiplier: 4,
    defaultSessionTimes: {
      morning: { startTime: "08:00", endTime: "14:00" },
      afternoon: { startTime: "14:00", endTime: "18:00" },
      evening: { startTime: "18:00", endTime: "22:00" },
    },
  },
  {
    id: "job-lhp",
    name: "LHP (Lẩu Hè Phố)",
    color: "amber",
    payType: "hourly",
    rate: 30000,
    allowancePerShift: 0,
    weekendMultiplier: 1,
    holidayMultiplier: 4,
    defaultSessionTimes: {
      morning: { startTime: "09:00", endTime: "14:00" },
      afternoon: { startTime: "14:00", endTime: "18:00" },
      evening: { startTime: "20:00", endTime: "01:30" },
    },
  },
  {
    id: "job-day",
    name: "Dạy",
    color: "teal",
    payType: "shift",
    rate: 200000,
    allowancePerShift: 0,
    weekendMultiplier: 1,
    holidayMultiplier: 4,
    defaultSessionTimes: {
      morning: { startTime: "08:00", endTime: "10:00" },
      afternoon: { startTime: "14:00", endTime: "16:00" },
      evening: { startTime: "18:00", endTime: "20:00" },
    },
  },
];

export const DEFAULT_SETTINGS: PlannerSettings = {
  travelBufferMinutes: 0,
  dayStartTime: "00:00",
  dayEndTime: "24:00",
  minFreeGapMinutes: 30,
  theme: "light",
  monthlyIncomeGoal: 8000000,
};

export const DEFAULT_SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: "shift-texas-8-2",
    name: "Texas (8-2)",
    startTime: "08:00",
    endTime: "14:00",
    isOvernight: false,
    note: "Ca 8h sáng – 2h chiều",
    jobId: "job-texas",
    breakMinutes: 0,
  },
  {
    id: "shift-lhp-20",
    name: "LHP (8h - hết khách)",
    startTime: "20:00",
    endTime: "01:30",
    isOvernight: true,
    note: "Lẩu Hè Phố (~1h–2h hôm sau)",
    jobId: "job-lhp",
    breakMinutes: 0,
  },
  {
    id: "shift-lhp-2030",
    name: "LHP (8h30 - hết khách)",
    startTime: "20:30",
    endTime: "01:30",
    isOvernight: true,
    note: "Lẩu Hè Phố (~1h–2h hôm sau)",
    jobId: "job-lhp",
    breakMinutes: 0,
  },
  {
    id: "shift-day-6-8",
    name: "Dạy (6-8)",
    startTime: "18:00",
    endTime: "20:00",
    isOvernight: false,
    note: "Ca dạy tối",
    jobId: "job-day",
    breakMinutes: 0,
  },
];

export const DEFAULT_SUBJECTS: SubjectPreset[] = [];

export function createSamplePlannerState(): PlannerState {
  return {
    version: 4,
    events: [],
    shiftTemplates: DEFAULT_SHIFT_TEMPLATES,
    subjects: [],
    jobs: DEFAULT_JOBS.map((j) => ({
      ...j,
      defaultSessionTimes: {
        morning: { ...j.defaultSessionTimes.morning },
        afternoon: { ...j.defaultSessionTimes.afternoon },
        evening: { ...j.defaultSessionTimes.evening },
      },
    })),
    freeSlots: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
