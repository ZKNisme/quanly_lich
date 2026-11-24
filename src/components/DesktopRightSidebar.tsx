"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  DAY_SHORT_LABELS,
  isOvernightShift,
  isValidTimeRange,
} from "@/lib/date-utils";
import { formatCurrencyVnd, JOB_COLOR_STYLES } from "@/lib/job-meta";
import {
  calculateShiftPay,
  computePeriodIncomeSummary,
} from "@/lib/payroll-engine";
import { checkTimeConflicts, getEventsForDay } from "@/lib/schedule-engine";
import type {
  DayOfWeek,
  JobProfile,
  PlannerSettings,
  RepeatMode,
  ScheduleEvent,
  ShiftTemplate,
  SubjectPreset,
} from "@/types/schedule";

interface DesktopRightSidebarProps {
  weekOffset: number;
  allEvents: ScheduleEvent[];
  weekEvents: ScheduleEvent[];
  jobs: JobProfile[];
  shiftTemplates: ShiftTemplate[];
  subjects: SubjectPreset[];
  settings: PlannerSettings;
  activeShiftTemplateId: string | null;
  onSelectShiftTemplate: (templateId: string | null) => void;
  onEditJob: (job: JobProfile) => void;
  onAddNewJob: () => void;
  onUpdateMonthlyGoal: (goal: number) => void;
  onAddTemplate: (tpl: Omit<ShiftTemplate, "id">) => ShiftTemplate;
  onDeleteTemplate: (tplId: string) => void;
  onCommitValidDaysForTemplate: (
    tpl: ShiftTemplate,
    days: DayOfWeek[]
  ) => void;
  onAddSubject: (subj: Omit<SubjectPreset, "id">) => SubjectPreset;
  onDeleteSubject: (subjId: string) => void;
  onCommitSubjectDays: (subj: SubjectPreset, days: DayOfWeek[]) => void;
  isHydrated: boolean;
}

export function DesktopRightSidebar({
  weekOffset,
  allEvents,
  weekEvents,
  jobs,
  shiftTemplates,
  subjects,
  settings,
  activeShiftTemplateId,
  onSelectShiftTemplate,
  onEditJob,
  onAddNewJob,
  onUpdateMonthlyGoal,
  onAddTemplate,
  onDeleteTemplate,
  onCommitValidDaysForTemplate,
  onAddSubject,
  onDeleteSubject,
  onCommitSubjectDays,
  isHydrated,
}: DesktopRightSidebarProps) {
  const [walletMode, setWalletMode] = useState<"week" | "month">("week");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(settings.monthlyIncomeGoal));

  const [addingTemplate, setAddingTemplate] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplStart, setTplStart] = useState("08:00");
  const [tplEnd, setTplEnd] = useState("12:00");
  const [tplJobId, setTplJobId] = useState(jobs[0]?.id ?? "");

  // Subject quick-add states
  const [addingSubject, setAddingSubject] = useState(false);
  const [subjName, setSubjName] = useState("");
  const [subjStart, setSubjStart] = useState("17:30");
  const [subjEnd, setSubjEnd] = useState("19:00");
  const [subjNote, setSubjNote] = useState("");
  const [subjRepeat, setSubjRepeat] = useState<RepeatMode>("weekly");
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    subjects[0]?.id ?? null
  );
  const [selectedSubjectDays, setSelectedSubjectDays] = useState<DayOfWeek[]>(
    []
  );

  const weekSummary = useMemo(
    () =>
      computePeriodIncomeSummary(
        allEvents,
        jobs,
        weekOffset === 1 ? "next_week" : "this_week"
      ),
    [allEvents, jobs, weekOffset]
  );

  const monthSummary = useMemo(
    () => computePeriodIncomeSummary(allEvents, jobs, "this_month"),
    [allEvents, jobs]
  );

  const shownSummary = walletMode === "week" ? weekSummary : monthSummary;

  const goalValue = Math.max(0, settings.monthlyIncomeGoal);
  const earnedPct =
    goalValue > 0
      ? Math.min(100, Math.round((monthSummary.earnedAmount / goalValue) * 100))
      : 0;
  const totalPct =
    goalValue > 0
      ? Math.min(100, Math.round((monthSummary.totalAmount / goalValue) * 100))
      : 0;

  const activeTemplate = useMemo(
    () => shiftTemplates.find((t) => t.id === activeShiftTemplateId) ?? null,
    [shiftTemplates, activeShiftTemplateId]
  );

  const validDaysForActiveTemplate = useMemo(() => {
    if (!activeTemplate) return [];
    const days: DayOfWeek[] = [];
    for (let d = 0; d < 7; d++) {
      const day = d as DayOfWeek;
      const dayEvents = getEventsForDay(weekEvents, day);
      const check = checkTimeConflicts(
        {
          dayOfWeek: day,
          startTime: activeTemplate.startTime,
          endTime: activeTemplate.endTime,
        },
        dayEvents,
        0
      );
      if (check.status === "ok") {
        days.push(day);
      }
    }
    return days;
  }, [activeTemplate, weekEvents]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMonthlyGoal(Math.max(0, Math.round(Number(goalInput) || 0)));
    setEditingGoal(false);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const overnight = isOvernightShift(tplStart, tplEnd);
    if (!tplName.trim() || !isValidTimeRange(tplStart, tplEnd, overnight)) return;
    const created = onAddTemplate({
      name: tplName.trim(),
      startTime: tplStart,
      endTime: tplEnd,
      isOvernight: overnight,
      note: "",
      jobId: tplJobId || jobs[0]?.id,
      breakMinutes: 0,
    });
    setAddingTemplate(false);
    setTplName("");
    onSelectShiftTemplate(created.id);
  };

  return (
    <aside className="space-y-4">
      {/* Card 1: Ví Lương & Striped Orange-Cream Progress Bar */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50 text-[#FF7A00] border border-orange-200">
              <Wallet className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-extrabold text-[#231F20]">Ví Lương</h2>
          </div>

          <div className="inline-flex rounded-xl border border-orange-200/70 bg-orange-50/40 p-0.5">
            <button
              type="button"
              onClick={() => setWalletMode("week")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                walletMode === "week"
                  ? "bg-[#231F20] text-[#FFFDF9]"
                  : "text-[#231F20]/65"
              }`}
            >
              {weekOffset === 1 ? "Tuần sau" : "Tuần này"}
            </button>
            <button
              type="button"
              onClick={() => setWalletMode("month")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                walletMode === "month"
                  ? "bg-[#231F20] text-[#FFFDF9]"
                  : "text-[#231F20]/65"
              }`}
            >
              Tháng này
            </button>
          </div>
        </div>

        {/* Parallel Earned vs Projected */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] p-2.5">
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-[#276723]">
              <CheckCircle2 className="h-3 w-3" />
              <span>Thực nhận</span>
            </div>
            <p
              suppressHydrationWarning
              className="mt-1 text-sm font-extrabold text-[#231F20] tabular-nums"
            >
              {isHydrated
                ? formatCurrencyVnd(shownSummary.earnedAmount)
                : "0đ"}
            </p>
            <span className="text-[10px] text-[#276723] tabular-nums">
              {shownSummary.completedCount} ca đã làm
            </span>
          </div>

          <div className="rounded-2xl border border-sky-200/70 bg-sky-50 p-2.5">
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-sky-800">
              <Clock className="h-3 w-3" />
              <span>Dự kiến</span>
            </div>
            <p
              suppressHydrationWarning
              className="mt-1 text-sm font-extrabold text-[#231F20] tabular-nums"
            >
              {isHydrated
                ? formatCurrencyVnd(shownSummary.projectedAmount)
                : "0đ"}
            </p>
            <span className="text-[10px] text-sky-800/80 tabular-nums">
              {shownSummary.upcomingCount} ca sắp làm
            </span>
          </div>
        </div>

        {/* Monthly Goal Bar (Bánh Bao Nhím Striped Orange-Cream) */}
        <div className="pt-1.5 space-y-1.5 border-t border-orange-100">
          <div className="flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-bold text-[#231F20]">
              <Target className="h-3.5 w-3.5 text-[#FF7A00]" />
              Mục tiêu tháng
            </span>
            <button
              type="button"
              onClick={() => {
                setGoalInput(String(settings.monthlyIncomeGoal));
                setEditingGoal((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 font-extrabold text-[#231F20] hover:text-[#FF7A00] tabular-nums"
            >
              <span>{formatCurrencyVnd(goalValue)}</span>
              <Pencil className="h-2.5 w-2.5 opacity-60" />
            </button>
          </div>

          {editingGoal && (
            <form onSubmit={handleSaveGoal} className="flex gap-1.5">
              <input
                type="number"
                min={0}
                step={100000}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="flex-1 rounded-xl border border-orange-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#231F20]"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#FF7A00] px-2.5 py-1 text-[11px] font-bold text-white"
              >
                Lưu
              </button>
            </form>
          )}

          <div className="relative h-3.5 w-full overflow-hidden rounded-full border border-orange-200/80 bg-orange-50/70">
            <div
              style={{ width: `${totalPct}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-bao-striped-soft transition-all"
            />
            <div
              style={{ width: `${earnedPct}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-bao-striped transition-all"
            />
          </div>
          <p className="text-[11px] text-[#231F20]/70 tabular-nums">
            {monthSummary.totalAmount >= goalValue
              ? `Đạt 100% mục tiêu (dư ${formatCurrencyVnd(monthSummary.totalAmount - goalValue)})`
              : `Còn thiếu ${formatCurrencyVnd(goalValue - monthSummary.totalAmount)} (đạt ${totalPct}%)`}
          </p>
        </div>
      </div>

      {/* Card 2: Danh sách 3 Job Part-time */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#FF7A00]" />
            <h2 className="text-sm font-extrabold text-[#231F20]">
              {jobs.length} Công việc Part-time
            </h2>
          </div>
          <button
            type="button"
            onClick={onAddNewJob}
            className="inline-flex items-center gap-1 rounded-xl border border-orange-200/80 bg-white px-2.5 py-1 text-[11px] font-bold text-[#231F20] hover:bg-orange-50"
          >
            <Plus className="h-3 w-3" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="space-y-2">
          {weekSummary.jobSummaries.map((item) => {
            const jc = JOB_COLOR_STYLES[item.job.color];
            return (
              <button
                key={item.job.id}
                type="button"
                onClick={() => onEditJob(item.job)}
                className={`w-full text-left rounded-2xl border p-2.5 transition ${jc.pillBg} ${jc.pillText} ${jc.pillBorder} ${jc.pillHover}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold truncate">
                    <span className={`h-2.5 w-2.5 rounded-full ${jc.dot}`} />
                    <span className="truncate">{item.job.name}</span>
                  </span>
                  <Pencil className="h-3 w-3 opacity-60 shrink-0" />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px] tabular-nums">
                  <span className="opacity-85 font-semibold">
                    {formatCurrencyVnd(item.job.rate)}
                    {item.job.payType === "hourly" ? "/g" : "/ca"}
                    {item.job.weekendMultiplier > 1
                      ? ` • T7/CN x${item.job.weekendMultiplier}`
                      : ""}
                  </span>
                  <span className="font-extrabold text-[#231F20]">
                    {item.shiftCount} ca •{" "}
                    {formatCurrencyVnd(item.totalAmount)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card 3: Công cụ "Soi ca nhanh" */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#FF7A00]" />
            <h2 className="text-sm font-extrabold text-[#231F20]">
              Soi ca nhanh
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setAddingTemplate((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl border border-orange-200/80 bg-white px-2.5 py-1 text-[11px] font-bold text-[#231F20] hover:bg-orange-50"
          >
            <Plus className="h-3 w-3" />
            <span>Mẫu ca</span>
          </button>
        </div>

        {addingTemplate && (
          <form
            onSubmit={handleCreateTemplate}
            className="rounded-2xl border border-orange-200 bg-orange-50/50 p-2.5 space-y-2"
          >
            <input
              type="text"
              required
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Tên mẫu (VD: Ca Sáng 8-12)"
              className="w-full rounded-xl border border-orange-200 bg-[#FFFDF9] px-2.5 py-1.5 text-xs font-semibold text-[#231F20]"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="time"
                value={tplStart}
                onChange={(e) => setTplStart(e.target.value)}
                className="rounded-xl border border-orange-200 bg-[#FFFDF9] px-2 py-1 font-mono text-xs font-bold text-[#231F20]"
              />
              <input
                type="time"
                value={tplEnd}
                onChange={(e) => setTplEnd(e.target.value)}
                className="rounded-xl border border-orange-200 bg-[#FFFDF9] px-2 py-1 font-mono text-xs font-bold text-[#231F20]"
              />
            </div>
            <select
              value={tplJobId}
              onChange={(e) => setTplJobId(e.target.value)}
              className="w-full rounded-xl border border-orange-200 bg-[#FFFDF9] px-2 py-1.5 text-xs font-semibold text-[#231F20]"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#FF7A00] py-1.5 text-xs font-bold text-white"
            >
              Lưu mẫu ca
            </button>
          </form>
        )}

        <div className="space-y-1.5">
          {shiftTemplates.map((tpl) => {
            const isSelected = activeShiftTemplateId === tpl.id;
            const tplJob =
              jobs.find((j) => j.id === tpl.jobId) ?? jobs[0] ?? null;
            const pay = calculateShiftPay(
              {
                startTime: tpl.startTime,
                endTime: tpl.endTime,
                isOvernight: tpl.isOvernight,
                breakMinutes: tpl.breakMinutes ?? 0,
              },
              tplJob,
              0
            );

            return (
              <div
                key={tpl.id}
                className={`flex items-center justify-between gap-1.5 rounded-2xl border p-2.5 transition ${
                  isSelected
                    ? "border-[#FF7A00] bg-orange-50/90 ring-1 ring-orange-200"
                    : "border-orange-200/60 bg-white hover:bg-orange-50/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelectShiftTemplate(isSelected ? null : tpl.id)
                  }
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-[#231F20] truncate">
                      {tpl.name}
                    </span>
                    <span className="font-mono text-[10.5px] font-bold text-[#231F20]/70 tabular-nums shrink-0">
                      {tpl.startTime}–{tpl.endTime}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10.5px] text-[#231F20]/65">
                    <span className="truncate">{tplJob?.name}</span>
                    <span className="font-extrabold text-[#FF7A00] tabular-nums">
                      ~{formatCurrencyVnd(pay.totalPay)}
                    </span>
                  </div>
                </button>

                {shiftTemplates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteTemplate(tpl.id)}
                    aria-label={`Xóa ${tpl.name}`}
                    className="p-1 rounded-lg text-[#231F20]/40 hover:bg-rose-50 hover:text-rose-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {activeTemplate && (
          <div className="rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#276723]">
              <span>
                Tìm thấy {validDaysForActiveTemplate.length}/7 ngày trống
              </span>
              <button
                type="button"
                onClick={() => onSelectShiftTemplate(null)}
                className="underline text-[#231F20]"
              >
                Tắt soi
              </button>
            </div>
            {validDaysForActiveTemplate.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onCommitValidDaysForTemplate(
                    activeTemplate,
                    validDaysForActiveTemplate
                  )
                }
                className="w-full rounded-2xl bg-[#FF7A00] py-2 text-xs font-bold text-white hover:bg-orange-600 transition"
              >
                Chốt nhanh {validDaysForActiveTemplate.length} ngày hợp lệ
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card 4: Thêm Môn học (Xếp lịch nhanh) */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-sky-700" />
            <h2 className="text-sm font-extrabold text-[#231F20]">
              Thêm môn học
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setAddingSubject((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            <Plus className="h-3 w-3" />
            <span>Môn mới</span>
          </button>
        </div>

        {addingSubject && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!subjName.trim() || !isValidTimeRange(subjStart, subjEnd))
                return;
              const created = onAddSubject({
                name: subjName.trim(),
                startTime: subjStart,
                endTime: subjEnd,
                note: subjNote.trim(),
                repeatMode: subjRepeat,
              });
              setActiveSubjectId(created.id);
              setSubjName("");
              setSubjNote("");
              setAddingSubject(false);
            }}
            className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-2.5 space-y-2"
          >
            <input
              type="text"
              required
              value={subjName}
              onChange={(e) => setSubjName(e.target.value)}
              placeholder="Tên môn (VD: Học moc, Tiếng Anh...)"
              className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#231F20]"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="time"
                value={subjStart}
                onChange={(e) => setSubjStart(e.target.value)}
                className="rounded-xl border border-sky-200 bg-white px-2 py-1 font-mono text-xs font-bold text-[#231F20]"
              />
              <input
                type="time"
                value={subjEnd}
                onChange={(e) => setSubjEnd(e.target.value)}
                className="rounded-xl border border-sky-200 bg-white px-2 py-1 font-mono text-xs font-bold text-[#231F20]"
              />
            </div>
            <input
              type="text"
              value={subjNote}
              onChange={(e) => setSubjNote(e.target.value)}
              placeholder="Phòng học / Ghi chú (tùy chọn)"
              className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs text-[#231F20]"
            />
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#231F20] cursor-pointer">
              <input
                type="checkbox"
                checked={subjRepeat === "weekly"}
                onChange={(e) =>
                  setSubjRepeat(e.target.checked ? "weekly" : "once")
                }
                className="rounded border-sky-300"
              />
              <span>Lặp cố định mỗi tuần</span>
            </label>
            <button
              type="submit"
              disabled={!subjName.trim() || !isValidTimeRange(subjStart, subjEnd)}
              className="w-full rounded-xl bg-[#231F20] py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Lưu môn
            </button>
          </form>
        )}

        <div className="space-y-1.5">
          {subjects.map((subj) => {
            const isSelected = activeSubjectId === subj.id;
            return (
              <div
                key={subj.id}
                className={`rounded-2xl border p-2.5 transition space-y-2 ${
                  isSelected
                    ? "border-sky-300 bg-sky-50"
                    : "border-orange-200/60 bg-white hover:bg-sky-50/40"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubjectId(isSelected ? null : subj.id);
                      setSelectedSubjectDays([]);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-[#231F20] truncate">
                        {subj.name}
                      </span>
                      <span className="font-mono text-[10.5px] font-bold text-sky-800 tabular-nums shrink-0">
                        {subj.startTime}–{subj.endTime}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSubject(subj.id)}
                    aria-label={`Xóa ${subj.name}`}
                    className="p-1 rounded-lg text-[#231F20]/40 hover:bg-rose-50 hover:text-rose-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isSelected && (
                  <div className="space-y-1.5 pt-1 border-t border-sky-200/70">
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_SHORT_LABELS.map((label, idx) => {
                        const d = idx as DayOfWeek;
                        const active = selectedSubjectDays.includes(d);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              setSelectedSubjectDays((prev) =>
                                prev.includes(d)
                                  ? prev.filter((x) => x !== d)
                                  : [...prev, d]
                              )
                            }
                            className={`rounded-lg border py-1 text-[10px] font-bold transition ${
                              active
                                ? "border-[#231F20] bg-[#231F20] text-white"
                                : "border-sky-200 bg-white text-sky-900"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedSubjectDays.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onCommitSubjectDays(subj, selectedSubjectDays);
                          setSelectedSubjectDays([]);
                        }}
                        className="w-full rounded-xl bg-[#231F20] py-1.5 text-[11px] font-bold text-white hover:bg-black"
                      >
                        Thêm vào {selectedSubjectDays.length} ngày đã chọn
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
