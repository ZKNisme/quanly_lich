"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  Repeat,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import {
  DAY_SHORT_LABELS,
  formatDurationVi,
  getDurationMinutes,
  isOvernightShift,
  isValidTimeRange,
  timeToMinutes,
} from "@/lib/date-utils";
import {
  formatCurrencyVnd,
  formatHoursDecimal,
  JOB_COLOR_STYLES,
} from "@/lib/job-meta";
import {
  calculateShiftPay,
  formatShortDateFromIso,
} from "@/lib/payroll-engine";
import { checkTimeConflicts, getEventsForWeek } from "@/lib/schedule-engine";
import type {
  DayOfWeek,
  EventCategory,
  JobProfile,
  RepeatMode,
  ScheduleEvent,
  SubjectPreset,
} from "@/types/schedule";

export interface EventShiftDraft {
  editingEvent?: ScheduleEvent;
  occurrenceIsoDate?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  category?: EventCategory;
}

interface EventShiftModalProps {
  initial: EventShiftDraft;
  activeWeekKey: string;
  otherWeekKey: string;
  allEvents: ScheduleEvent[];
  jobs: JobProfile[];
  subjects: SubjectPreset[];
  onSave: (payload: {
    id?: string;
    applyToIsoDate?: string;
    title: string;
    category: EventCategory;
    dayOfWeek: DayOfWeek;
    days: DayOfWeek[];
    startTime: string;
    endTime: string;
    isOvernight?: boolean;
    note: string;
    repeatMode: RepeatMode;
    weekKey: string | null;
    repeatStartDate?: string | null;
    repeatEndDate?: string | null;
    jobId?: string;
    breakMinutes?: number;
    breakStartTime?: string;
    breakEndTime?: string;
    isHoliday?: boolean;
    holidayMultiplier?: number;
    bonusAmount?: number;
    deductionAmount?: number;
    isCompleted?: boolean;
  }) => void;
  onDelete?: (eventId: string) => void;
  onOpenJobsModal: () => void;
  onClose: () => void;
}

const CATEGORY_TABS: Array<{
  id: EventCategory;
  label: string;
  dot: string;
  activeClass: string;
}> = [
  {
    id: "study",
    label: "Lịch học",
    dot: "bg-sky-500",
    activeClass: "bg-sky-50 text-sky-800 border-sky-300",
  },
  {
    id: "personal",
    label: "Cá nhân",
    dot: "bg-rose-500",
    activeClass: "bg-rose-50 text-rose-700 border-rose-300",
  },
  {
    id: "work",
    label: "Ca làm",
    dot: "bg-[#FF7A00]",
    activeClass: "bg-orange-50 text-orange-800 border-orange-300",
  },
];

export function EventShiftModal({
  initial,
  activeWeekKey,
  otherWeekKey,
  allEvents,
  jobs,
  subjects,
  onSave,
  onDelete,
  onOpenJobsModal,
  onClose,
}: EventShiftModalProps) {
  const isEditing = Boolean(initial.editingEvent);
  const occurrenceIsoDate = initial.occurrenceIsoDate;
  const isEditingWeeklyOccurrence =
    isEditing &&
    initial.editingEvent?.repeatMode === "weekly" &&
    Boolean(occurrenceIsoDate);
  const actualLogForDate =
    isEditingWeeklyOccurrence && occurrenceIsoDate
      ? initial.editingEvent?.actualLogs?.[occurrenceIsoDate]
      : undefined;

  const initialStartTime =
    actualLogForDate?.startTime ??
    initial.editingEvent?.startTime ??
    initial.startTime;
  const rawInitialEndTime =
    actualLogForDate?.endTime ??
    initial.editingEvent?.endTime ??
    initial.endTime;
  const initialEndTime =
    rawInitialEndTime === "24:00" ? "23:59" : rawInitialEndTime;

  const [category, setCategory] = useState<EventCategory>(
    initial.editingEvent?.category ?? initial.category ?? "work"
  );
  const [title, setTitle] = useState(initial.editingEvent?.title ?? "");
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([
    initial.editingEvent?.dayOfWeek ?? initial.dayOfWeek,
  ]);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [isOvernight, setIsOvernight] = useState<boolean>(
    actualLogForDate?.isOvernight ??
      initial.editingEvent?.isOvernight ??
      isOvernightShift(initialStartTime, initialEndTime)
  );
  const [note, setNote] = useState(initial.editingEvent?.note ?? "");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(
    initial.editingEvent?.repeatMode ??
      ((initial.category ?? "work") === "study" ? "weekly" : "once")
  );
  const [repeatStartDate, setRepeatStartDate] = useState(
    initial.editingEvent?.repeatStartDate ?? ""
  );
  const [repeatEndDate, setRepeatEndDate] = useState(
    initial.editingEvent?.repeatEndDate ?? ""
  );
  const [touchedRepeat, setTouchedRepeat] = useState(isEditing);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [applyScope, setApplyScope] = useState<"single_date" | "all_weekly">(
    isEditingWeeklyOccurrence ? "single_date" : "all_weekly"
  );

  const [jobId, setJobId] = useState(
    initial.editingEvent?.jobId ?? jobs[0]?.id ?? ""
  );
  const [breakMinutes, setBreakMinutes] = useState(
    actualLogForDate?.breakMinutes ?? initial.editingEvent?.breakMinutes ?? 0
  );
  const [isHoliday, setIsHoliday] = useState(
    actualLogForDate?.isHoliday ?? initial.editingEvent?.isHoliday ?? false
  );
  const [holidayMultiplier, setHolidayMultiplier] = useState<number>(
    actualLogForDate?.holidayMultiplier ??
      initial.editingEvent?.holidayMultiplier ??
      4
  );
  const [bonusAmount, setBonusAmount] = useState(
    String(
      actualLogForDate?.bonusAmount ?? initial.editingEvent?.bonusAmount ?? 0
    )
  );
  const [deductionAmount, setDeductionAmount] = useState(
    String(
      actualLogForDate?.deductionAmount ??
        initial.editingEvent?.deductionAmount ??
        0
    )
  );
  const [isCompleted, setIsCompleted] = useState(
    isEditingWeeklyOccurrence && occurrenceIsoDate
      ? Boolean(
          initial.editingEvent?.completedDates?.includes(occurrenceIsoDate)
        )
      : (initial.editingEvent?.isCompleted ?? false)
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === jobId) ?? jobs[0] ?? null,
    [jobs, jobId]
  );

  const effectiveOvernight = isOvernight;
  const timeValid = isValidTimeRange(startTime, endTime, effectiveOvernight);
  const repeatDateValid =
    repeatMode !== "weekly" ||
    !repeatStartDate ||
    !repeatEndDate ||
    repeatEndDate >= repeatStartDate;
  const durationMinutes = timeValid
    ? getDurationMinutes(startTime, endTime, effectiveOvernight)
    : 0;

  const primaryDay: DayOfWeek = selectedDays[0] ?? initial.dayOfWeek;

  const payPreview = useMemo(() => {
    if (category !== "work" || !timeValid) return null;
    const baseInput = {
      startTime,
      endTime,
      isOvernight: effectiveOvernight,
      breakMinutes,
      isHoliday,
      holidayMultiplier,
      bonusAmount: Math.max(0, Number(bonusAmount) || 0),
      deductionAmount: Math.max(0, Number(deductionAmount) || 0),
    };
    const firstPay = calculateShiftPay(baseInput, selectedJob, primaryDay);
    const totalAllDays = selectedDays.reduce<number>(
      (sum, d) => sum + calculateShiftPay(baseInput, selectedJob, d).totalPay,
      0
    );
    return {
      ...firstPay,
      totalAllDays,
    };
  }, [
    category,
    timeValid,
    startTime,
    endTime,
    effectiveOvernight,
    breakMinutes,
    isHoliday,
    holidayMultiplier,
    bonusAmount,
    deductionAmount,
    selectedJob,
    primaryDay,
    selectedDays,
  ]);

  const conflictReport = useMemo(() => {
    if (!timeValid) return null;
    const targetWeekKey =
      initial.editingEvent?.repeatMode === "once" &&
      initial.editingEvent.weekKey
        ? initial.editingEvent.weekKey
        : activeWeekKey;

    const targetWeekEvents = getEventsForWeek(allEvents, targetWeekKey);
    const otherWeekEvents =
      repeatMode === "weekly" ? getEventsForWeek(allEvents, otherWeekKey) : [];

    const overlaps: Array<{ day: DayOfWeek; event: ScheduleEvent }> = [];
    for (const d of selectedDays) {
      const check = checkTimeConflicts(
        { dayOfWeek: d, startTime, endTime, isOvernight: effectiveOvernight },
        targetWeekEvents,
        0,
        initial.editingEvent?.id
      );
      for (const o of check.overlaps) {
        overlaps.push({ day: d, event: o.event });
      }
      if (repeatMode === "weekly") {
        const nextCheck = checkTimeConflicts(
          { dayOfWeek: d, startTime, endTime, isOvernight: effectiveOvernight },
          otherWeekEvents,
          0,
          initial.editingEvent?.id
        );
        for (const o of nextCheck.overlaps) {
          if (
            !overlaps.some(
              (x) => x.day === d && x.event.id === o.event.id
            )
          ) {
            overlaps.push({ day: d, event: o.event });
          }
        }
      }
    }

    return { overlaps };
  }, [
    timeValid,
    initial.editingEvent,
    activeWeekKey,
    otherWeekKey,
    allEvents,
    selectedDays,
    startTime,
    endTime,
    effectiveOvernight,
    repeatMode,
  ]);

  const handleCategoryChange = (next: EventCategory) => {
    setCategory(next);
    if (!touchedRepeat) {
      setRepeatMode(next === "study" ? "weekly" : "once");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle =
      title.trim() || (category === "work" && selectedJob ? selectedJob.name : "");
    if (!cleanTitle || !timeValid || !repeatDateValid || selectedDays.length === 0)
      return;

    const preservedOnceKey =
      initial.editingEvent?.repeatMode === "once" &&
      initial.editingEvent.weekKey
        ? initial.editingEvent.weekKey
        : activeWeekKey;

    const isSingleWeeklyEdit =
      isEditingWeeklyOccurrence &&
      category === "work" &&
      repeatMode === "weekly" &&
      applyScope === "single_date" &&
      Boolean(occurrenceIsoDate);

    const submitDays = isSingleWeeklyEdit ? [primaryDay] : selectedDays;

    onSave({
      id: initial.editingEvent?.id,
      ...(isSingleWeeklyEdit ? { applyToIsoDate: occurrenceIsoDate } : {}),
      title: cleanTitle,
      category,
      dayOfWeek: submitDays[0],
      days: submitDays,
      startTime,
      endTime,
      isOvernight: effectiveOvernight,
      note: note.trim(),
      repeatMode,
      weekKey: repeatMode === "weekly" ? null : preservedOnceKey,
      repeatStartDate:
        repeatMode === "weekly" && repeatStartDate ? repeatStartDate : null,
      repeatEndDate:
        repeatMode === "weekly" && repeatEndDate ? repeatEndDate : null,
      ...(category === "work"
        ? {
            jobId: selectedJob?.id,
            breakMinutes,
            isHoliday,
            holidayMultiplier,
            bonusAmount: Math.max(0, Math.round(Number(bonusAmount) || 0)),
            deductionAmount: Math.max(
              0,
              Math.round(Number(deductionAmount) || 0)
            ),
            isCompleted,
          }
        : {}),
    });
  };

  const hasOverlap = (conflictReport?.overlaps.length ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#231F20]/40 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-orange-200/70 bg-[#FFFDF9] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-orange-100 shrink-0">
          <h2 className="text-sm font-extrabold text-[#231F20]">
            {isEditing ? "Chỉnh sửa lịch / ca làm" : "Thêm lịch / chốt ca mới"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-[#231F20]/70 hover:bg-orange-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          id="unified-event-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-3.5"
        >
          {/* Category Pills */}
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryChange(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2 text-xs font-bold transition ${
                  category === tab.id
                    ? tab.activeClass
                    : "border-orange-200/70 bg-white text-[#231F20]/70 hover:bg-orange-50/40"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${tab.dot}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Subject Picker when category === "study" */}
          {category === "study" && subjects.length > 0 && (
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-3 space-y-2">
              <span className="block text-xs font-bold text-sky-900">
                Chọn nhanh môn đã lưu
              </span>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((subj) => (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => {
                      setTitle(subj.name);
                      setStartTime(subj.startTime);
                      setEndTime(subj.endTime);
                      setIsOvernight(false);
                      setNote(subj.note);
                      setRepeatMode(subj.repeatMode);
                      setRepeatStartDate(subj.repeatStartDate ?? "");
                      setRepeatEndDate(subj.repeatEndDate ?? "");
                    }}
                    className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                      title === subj.name && startTime === subj.startTime
                        ? "border-[#231F20] bg-[#231F20] text-white"
                        : "border-sky-200 bg-white text-sky-800 hover:bg-sky-100/70"
                    }`}
                  >
                    {subj.name} ({subj.startTime})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Job Picker for Work Shift */}
          {category === "work" && (
            <div className="rounded-2xl border border-orange-200/70 bg-orange-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#231F20]">
                  <Briefcase className="h-3.5 w-3.5 text-[#FF7A00]" />
                  Chọn công việc
                </span>
                <button
                  type="button"
                  onClick={onOpenJobsModal}
                  className="text-[11px] font-bold text-[#FF7A00] underline"
                >
                  Sửa mức lương
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {jobs.map((job) => {
                  const jc = JOB_COLOR_STYLES[job.color];
                  const active = selectedJob?.id === job.id;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        setJobId(job.id);
                        if (!title.trim()) setTitle(job.name);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-xs font-bold transition ${
                        active
                          ? `${jc.pillBg} ${jc.pillText} ${jc.pillBorder} ring-2 ring-[#FF7A00]/35`
                          : "border-orange-200/70 bg-white text-[#231F20]/70"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${jc.dot}`} />
                      <span>{job.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#231F20]">
              Tên môn / việc / ca làm
            </label>
            <input
              type="text"
              required={category !== "work"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === "study"
                  ? "VD: Cấu trúc dữ liệu..."
                  : category === "work"
                    ? selectedJob?.name ?? "VD: Ca Tối..."
                    : "VD: Tập Gym, Họp nhóm..."
              }
              className="w-full rounded-2xl border border-orange-200/70 bg-white px-3.5 py-2 text-sm font-semibold text-[#231F20] focus:border-[#FF7A00] focus:outline-none"
            />
          </div>

          {/* Day Pills (Multi-select) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#231F20]">
                Chọn ngày ({selectedDays.length} ngày)
              </span>
              <span className="text-[#231F20]/55">
                Chạm để chọn nhiều ngày
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAY_SHORT_LABELS.map((label, idx) => {
                const d = idx as DayOfWeek;
                const active = selectedDays.includes(d);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      setSelectedDays((prev) => {
                        if (prev.includes(d)) {
                          return prev.length > 1
                            ? prev.filter((x) => x !== d)
                            : prev;
                        }
                        return [...prev, d].sort((a, b) => a - b);
                      })
                    }
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      active
                        ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                        : "border-orange-200/70 bg-white text-[#231F20]/75"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Inputs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#231F20]">
                {category === "work"
                  ? isCompleted
                    ? "Giờ làm thực tế"
                    : "Khung giờ dự kiến"
                  : "Khung giờ"}
              </span>
              <span className="font-semibold text-[#231F20]/65 tabular-nums">
                {timeValid
                  ? `Thời lượng: ${formatDurationVi(durationMinutes)}${effectiveOvernight ? " (hôm sau)" : ""}`
                  : "Giờ kết thúc không hợp lệ"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => {
                  const nextStart = e.target.value;
                  setStartTime(nextStart);
                  setIsOvernight(
                    timeToMinutes(endTime) < timeToMinutes(nextStart)
                  );
                }}
                className="rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-sm font-bold text-[#231F20]"
              />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  setEndTime(nextEnd);
                  setIsOvernight(
                    timeToMinutes(nextEnd) < timeToMinutes(startTime)
                  );
                }}
                className="rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-sm font-bold text-[#231F20]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#231F20]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOvernight}
                  onChange={(e) => setIsOvernight(e.target.checked)}
                  className="rounded border-orange-300"
                />
                <span>Qua đêm (hết ca hôm sau)</span>
              </label>

              {category === "work" && (
                <div className="flex items-center gap-1">
                  {["01:00", "01:30", "02:00"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setEndTime(t);
                        setIsOvernight(true);
                      }}
                      className={`rounded-lg border px-2 py-0.5 font-mono text-[10.5px] font-bold ${
                        endTime === t && effectiveOvernight
                          ? "border-[#FF7A00] bg-orange-50 text-[#FF7A00]"
                          : "border-orange-200/70 bg-white text-[#231F20]/70"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Work Shift Status + Bonus/Deduction + Payroll Preview */}
          {category === "work" && (
            <div
              className={`rounded-2xl border p-3 space-y-2.5 transition ${
                isCompleted
                  ? "border-[#C3E5AE] bg-[#ECF7E4]/85"
                  : "border-orange-200/80 bg-orange-50/50"
              }`}
            >
              {/* Status Segmented Toggle: Scheduled vs Confirmed Actual */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-extrabold text-[#231F20]/75">
                  Trạng thái tính lương
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCompleted(false)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11.5px] font-bold transition ${
                      !isCompleted
                        ? "border-[#FF7A00] bg-[#FFFDF9] text-[#231F20] shadow-xs"
                        : "border-orange-200/60 bg-white/70 text-[#231F20]/60"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-[#FF7A00]" />
                    <span>Lịch dự kiến</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCompleted(true)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11.5px] font-bold transition ${
                      isCompleted
                        ? "border-[#276723] bg-[#276723] text-white shadow-xs"
                        : "border-[#C3E5AE] bg-white text-[#276723] hover:bg-[#ECF7E4]"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Đã làm &amp; chốt giờ</span>
                  </button>
                </div>
              </div>

              {isEditingWeeklyOccurrence &&
                occurrenceIsoDate &&
                repeatMode === "weekly" && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setApplyScope("single_date")}
                      className={`rounded-xl border py-1.5 px-2 text-[11px] font-bold transition ${
                        applyScope === "single_date"
                          ? "border-[#231F20] bg-[#231F20] text-white"
                          : "border-orange-200/70 bg-white text-[#231F20]/70"
                      }`}
                    >
                      Chỉ chốt ngày {formatShortDateFromIso(occurrenceIsoDate)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyScope("all_weekly")}
                      className={`rounded-xl border py-1.5 px-2 text-[11px] font-bold transition ${
                        applyScope === "all_weekly"
                          ? "border-[#231F20] bg-[#231F20] text-white"
                          : "border-orange-200/70 bg-white text-[#231F20]/70"
                      }`}
                    >
                      Sửa lịch lặp hàng tuần
                    </button>
                  </div>
                )}

              <div className="flex items-center justify-between pt-0.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#276723]">
                  <Coins className="h-3.5 w-3.5" />
                  {isCompleted ? "Lương thực nhận ca này" : "Lương dự kiến ca"}
                </span>
                {payPreview && (
                  <span className="text-sm font-extrabold text-[#231F20] tabular-nums">
                    {formatCurrencyVnd(payPreview.totalPay)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-[#231F20]/75">
                  Nghỉ giữa ca:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={durationMinutes || 720}
                    step={1}
                    value={breakMinutes}
                    onChange={(e) =>
                      setBreakMinutes(
                        Math.max(0, Math.round(Number(e.target.value) || 0))
                      )
                    }
                    aria-label="Số phút nghỉ giữa ca"
                    className="w-16 rounded-xl border border-orange-200/80 bg-[#FFFDF9] px-2.5 py-1 text-center font-mono text-xs font-bold text-[#231F20]"
                  />
                  <span className="font-semibold text-[#231F20]/65">phút</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-bold text-[#276723]">
                    + Thưởng / Tip (đ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-orange-200/70 bg-[#FFFDF9] px-2.5 py-1.5 font-mono text-xs font-bold text-[#276723]"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-rose-700">
                    - Phạt / Khấu trừ (đ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-orange-200/70 bg-[#FFFDF9] px-2.5 py-1.5 font-mono text-xs font-bold text-rose-700"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <label className="inline-flex items-center gap-1.5 font-semibold text-[#231F20] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHoliday}
                    onChange={(e) => setIsHoliday(e.target.checked)}
                    className="rounded border-orange-300"
                  />
                  <span>Ngày lễ (x{holidayMultiplier})</span>
                </label>

                {isHoliday && (
                  <div className="inline-flex rounded-xl border border-rose-200 bg-white p-0.5">
                    {[2, 3, 4].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setHolidayMultiplier(m)}
                        className={`rounded-lg px-2 py-0.5 text-[10.5px] font-bold transition ${
                          holidayMultiplier === m
                            ? "bg-rose-600 text-white"
                            : "text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        x{m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {payPreview && (
                <p className="text-[11px] text-[#276723] tabular-nums">
                  Tính công {formatHoursDecimal(payPreview.paidMinutes)} • Lương{" "}
                  {formatCurrencyVnd(payPreview.basePay)}
                  {payPreview.allowance > 0
                    ? ` + ${formatCurrencyVnd(payPreview.allowance)} phụ cấp`
                    : ""}
                  {selectedDays.length > 1
                    ? ` • ${selectedDays.length} ngày: ${formatCurrencyVnd(payPreview.totalAllDays)}`
                    : ""}
                </p>
              )}
            </div>
          )}

          {/* Conflict Check */}
          {timeValid && conflictReport && (
            <div className="space-y-1.5">
              {hasOverlap ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Trùng khung giờ!</span>
                  </div>
                  {conflictReport.overlaps.map((o) => (
                    <p key={`${o.day}-${o.event.id}`}>
                      • {DAY_SHORT_LABELS[o.day]}: Trùng{" "}
                      <strong>{o.event.title}</strong> ({o.event.startTime}–
                      {o.event.endTime})
                    </p>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] px-3 py-2 text-xs font-semibold text-[#276723]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Khung giờ hợp lệ, không trùng lịch.</span>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (Phòng học / Cơ sở làm việc...)"
            className="w-full rounded-2xl border border-orange-200/70 bg-white px-3.5 py-2 text-xs text-[#231F20] focus:border-[#FF7A00] focus:outline-none"
          />

          {/* Repeat Mode */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRepeatMode("weekly");
                setTouchedRepeat(true);
              }}
              className={`flex items-center gap-2 rounded-2xl border p-2.5 text-left transition ${
                repeatMode === "weekly"
                  ? "border-[#FF7A00] bg-orange-50/70 text-[#231F20]"
                  : "border-orange-200/70 bg-white text-[#231F20]/65"
              }`}
            >
              <Repeat className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-bold">Lặp hàng tuần</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRepeatMode("once");
                setTouchedRepeat(true);
              }}
              className={`flex items-center gap-2 rounded-2xl border p-2.5 text-left transition ${
                repeatMode === "once"
                  ? "border-[#FF7A00] bg-orange-50/70 text-[#231F20]"
                  : "border-orange-200/70 bg-white text-[#231F20]/65"
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-bold">Chỉ tuần này</span>
            </button>
          </div>

          {repeatMode === "weekly" && (
            <div className="rounded-2xl border border-orange-200/80 bg-orange-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#231F20]">
                  Khoảng thời gian lặp
                </span>
                {(repeatStartDate || repeatEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRepeatStartDate("");
                      setRepeatEndDate("");
                    }}
                    className="text-[10.5px] font-bold text-[#FF7A00] underline"
                  >
                    Xóa ngày
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <label className="block text-[10.5px] font-semibold text-[#231F20]/70 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={repeatStartDate}
                    onChange={(e) => setRepeatStartDate(e.target.value)}
                    className="block w-full min-w-0 max-w-full appearance-none rounded-xl border border-orange-200/80 bg-white px-3 py-2 text-xs font-semibold text-[#231F20] tabular-nums"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10.5px] font-semibold text-[#231F20]/70 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    min={repeatStartDate || undefined}
                    value={repeatEndDate}
                    onChange={(e) => setRepeatEndDate(e.target.value)}
                    className="block w-full min-w-0 max-w-full appearance-none rounded-xl border border-orange-200/80 bg-white px-3 py-2 text-xs font-semibold text-[#231F20] tabular-nums"
                  />
                </div>
              </div>
              {!repeatDateValid ? (
                <p className="text-[11px] font-bold text-rose-700">
                  Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.
                </p>
              ) : (
                <p className="text-[10.5px] text-[#231F20]/60">
                  Để trống nếu muốn lặp không giới hạn thời gian.
                </p>
              )}
            </div>
          )}
        </form>

        <div className="border-t border-orange-100 bg-orange-50/35 px-4 py-3 flex items-center gap-2 shrink-0">
          {isEditing && onDelete && initial.editingEvent && (
            <>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Xóa"
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDelete(initial.editingEvent!.id)}
                  className="h-10 rounded-2xl bg-rose-600 px-3 text-xs font-bold text-white"
                >
                  Xóa ngay
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-2xl border border-orange-200/80 bg-white text-xs font-bold text-[#231F20]/75"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="unified-event-form"
            disabled={
              (!title.trim() && category !== "work") ||
              !timeValid ||
              !repeatDateValid
            }
            className={`flex-1 h-10 rounded-2xl text-xs font-bold text-white disabled:opacity-40 transition ${
              category === "work" && isCompleted
                ? "bg-[#276723] hover:bg-[#1f531c]"
                : "bg-[#FF7A00] hover:bg-orange-600"
            }`}
          >
            {category === "work" && isCompleted
              ? selectedDays.length > 1
                ? `Lưu & Chốt ${selectedDays.length} ngày`
                : "Lưu & Chốt thực nhận"
              : isEditing
                ? selectedDays.length > 1
                  ? `Lưu & Thêm (${selectedDays.length} ngày)`
                  : "Lưu thay đổi"
                : selectedDays.length > 1
                  ? `Lưu ${selectedDays.length} ngày`
                  : "Lưu lịch"}
          </button>
        </div>
      </div>
    </div>
  );
}
