"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
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
import { calculateShiftPay } from "@/lib/payroll-engine";
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
    title: string;
    category: EventCategory;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isOvernight?: boolean;
    note: string;
    repeatMode: RepeatMode;
    weekKey: string | null;
    jobId?: string;
    breakMinutes?: number;
    isHoliday?: boolean;
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

  const [category, setCategory] = useState<EventCategory>(
    initial.editingEvent?.category ?? initial.category ?? "work"
  );
  const [title, setTitle] = useState(initial.editingEvent?.title ?? "");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(
    initial.editingEvent?.dayOfWeek ?? initial.dayOfWeek
  );
  const [startTime, setStartTime] = useState(
    initial.editingEvent?.startTime ?? initial.startTime
  );
  const [endTime, setEndTime] = useState(
    initial.editingEvent?.endTime ?? initial.endTime
  );
  const [isOvernight, setIsOvernight] = useState<boolean>(
    initial.editingEvent?.isOvernight ??
      isOvernightShift(
        initial.editingEvent?.startTime ?? initial.startTime,
        initial.editingEvent?.endTime ?? initial.endTime
      )
  );
  const [note, setNote] = useState(initial.editingEvent?.note ?? "");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(
    initial.editingEvent?.repeatMode ??
      ((initial.category ?? "work") === "study" ? "weekly" : "once")
  );
  const [touchedRepeat, setTouchedRepeat] = useState(isEditing);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [jobId, setJobId] = useState(
    initial.editingEvent?.jobId ?? jobs[0]?.id ?? ""
  );
  const [breakMinutes, setBreakMinutes] = useState(
    initial.editingEvent?.breakMinutes ?? 0
  );
  const [isHoliday, setIsHoliday] = useState(
    initial.editingEvent?.isHoliday ?? false
  );
  const [bonusAmount, setBonusAmount] = useState(
    String(initial.editingEvent?.bonusAmount ?? 0)
  );
  const [deductionAmount, setDeductionAmount] = useState(
    String(initial.editingEvent?.deductionAmount ?? 0)
  );
  const [isCompleted, setIsCompleted] = useState(
    initial.editingEvent?.isCompleted ?? false
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === jobId) ?? jobs[0] ?? null,
    [jobs, jobId]
  );

  const effectiveOvernight =
    isOvernight || timeToMinutes(endTime) < timeToMinutes(startTime);
  const timeValid = isValidTimeRange(startTime, endTime, effectiveOvernight);
  const durationMinutes = timeValid
    ? getDurationMinutes(startTime, endTime, effectiveOvernight)
    : 0;

  const payPreview = useMemo(() => {
    if (category !== "work" || !timeValid) return null;
    return calculateShiftPay(
      {
        startTime,
        endTime,
        isOvernight: effectiveOvernight,
        breakMinutes,
        isHoliday,
        bonusAmount: Math.max(0, Number(bonusAmount) || 0),
        deductionAmount: Math.max(0, Number(deductionAmount) || 0),
      },
      selectedJob,
      dayOfWeek
    );
  }, [
    category,
    timeValid,
    startTime,
    endTime,
    effectiveOvernight,
    breakMinutes,
    isHoliday,
    bonusAmount,
    deductionAmount,
    selectedJob,
    dayOfWeek,
  ]);

  const conflictReport = useMemo(() => {
    if (!timeValid) return null;
    const targetWeekKey =
      initial.editingEvent?.repeatMode === "once" &&
      initial.editingEvent.weekKey
        ? initial.editingEvent.weekKey
        : activeWeekKey;

    const primaryCheck = checkTimeConflicts(
      { dayOfWeek, startTime, endTime, isOvernight: effectiveOvernight },
      getEventsForWeek(allEvents, targetWeekKey),
      0,
      initial.editingEvent?.id
    );

    const secondaryCheck =
      repeatMode === "weekly"
        ? checkTimeConflicts(
            { dayOfWeek, startTime, endTime, isOvernight: effectiveOvernight },
            getEventsForWeek(allEvents, otherWeekKey),
            0,
            initial.editingEvent?.id
          )
        : null;

    return { primaryCheck, secondaryCheck };
  }, [
    timeValid,
    initial.editingEvent,
    activeWeekKey,
    otherWeekKey,
    allEvents,
    dayOfWeek,
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
    if (!cleanTitle || !timeValid) return;

    const preservedOnceKey =
      initial.editingEvent?.repeatMode === "once" &&
      initial.editingEvent.weekKey
        ? initial.editingEvent.weekKey
        : activeWeekKey;

    onSave({
      id: initial.editingEvent?.id,
      title: cleanTitle,
      category,
      dayOfWeek,
      startTime,
      endTime,
      isOvernight: effectiveOvernight,
      note: note.trim(),
      repeatMode,
      weekKey: repeatMode === "weekly" ? null : preservedOnceKey,
      ...(category === "work"
        ? {
            jobId: selectedJob?.id,
            breakMinutes,
            isHoliday,
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

  const hasOverlap = (conflictReport?.primaryCheck.overlaps.length ?? 0) > 0;

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

          {/* Day Pills */}
          <div className="grid grid-cols-7 gap-1">
            {DAY_SHORT_LABELS.map((label, idx) => {
              const d = idx as DayOfWeek;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDayOfWeek(d)}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    dayOfWeek === d
                      ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                      : "border-orange-200/70 bg-white text-[#231F20]/75"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Time Inputs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#231F20]">Khung giờ</span>
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
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-sm font-bold text-[#231F20]"
              />
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => {
                  const nextEnd = e.target.value;
                  setEndTime(nextEnd);
                  if (timeToMinutes(nextEnd) < timeToMinutes(startTime)) {
                    setIsOvernight(true);
                  }
                }}
                className="rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-sm font-bold text-[#231F20]"
              />
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#231F20]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={effectiveOvernight}
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

          {/* Work Shift Bonus/Deduction + Payroll Preview */}
          {category === "work" && (
            <div className="rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4]/75 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#276723]">
                  <Coins className="h-3.5 w-3.5" />
                  Thưởng / Phạt & Lương ca
                </span>
                {payPreview && (
                  <span className="text-sm font-extrabold text-[#231F20] tabular-nums">
                    {formatCurrencyVnd(payPreview.totalPay)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#231F20]/75">
                  Nghỉ giữa ca:
                </span>
                <div className="inline-flex rounded-xl border border-orange-200/70 bg-[#FFFDF9] p-0.5">
                  {[0, 15, 30, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBreakMinutes(m)}
                      className={`rounded-lg px-2 py-0.5 font-bold ${
                        breakMinutes === m
                          ? "bg-[#231F20] text-[#FFFDF9]"
                          : "text-[#231F20]/65"
                      }`}
                    >
                      {m}p
                    </button>
                  ))}
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
                  <span>Ngày lễ (x{selectedJob?.holidayMultiplier ?? 2})</span>
                </label>

                {repeatMode === "once" && (
                  <label className="inline-flex items-center gap-1.5 font-semibold text-[#276723] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={(e) => setIsCompleted(e.target.checked)}
                      className="rounded border-[#C3E5AE]"
                    />
                    <span>Đã hoàn thành</span>
                  </label>
                )}
              </div>

              {payPreview && (
                <p className="text-[11px] text-[#276723] tabular-nums">
                  Tính công {formatHoursDecimal(payPreview.paidMinutes)} • Lương{" "}
                  {formatCurrencyVnd(payPreview.basePay)}
                  {payPreview.allowance > 0
                    ? ` + ${formatCurrencyVnd(payPreview.allowance)} phụ cấp`
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
                  {conflictReport.primaryCheck.overlaps.map((o) => (
                    <p key={o.event.id}>
                      • Trùng <strong>{o.event.title}</strong> (
                      {o.event.startTime}–{o.event.endTime})
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
            disabled={(!title.trim() && category !== "work") || !timeValid}
            className="flex-1 h-10 rounded-2xl bg-[#FF7A00] text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 transition"
          >
            {isEditing ? "Lưu thay đổi" : "Lưu lịch"}
          </button>
        </div>
      </div>
    </div>
  );
}
