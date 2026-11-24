"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Target,
} from "lucide-react";
import { DAY_SHORT_LABELS } from "@/lib/date-utils";
import {
  formatCurrencyVnd,
  formatHoursDecimal,
  JOB_COLOR_STYLES,
} from "@/lib/job-meta";
import { computePeriodIncomeSummary } from "@/lib/payroll-engine";
import type {
  IncomeFilterPeriod,
  JobProfile,
  ScheduleEvent,
  ShiftOccurrence,
} from "@/types/schedule";

interface MobileIncomeJobsViewProps {
  allEvents: ScheduleEvent[];
  jobs: JobProfile[];
  monthlyIncomeGoal: number;
  onUpdateMonthlyGoal: (goal: number) => void;
  onEditJob: (job: JobProfile) => void;
  onAddNewJob: () => void;
  onToggleOccurrenceCompleted: (occ: ShiftOccurrence) => void;
  onEditShiftEvent: (event: ScheduleEvent) => void;
  isHydrated: boolean;
}

export function MobileIncomeJobsView({
  allEvents,
  jobs,
  monthlyIncomeGoal,
  onUpdateMonthlyGoal,
  onEditJob,
  onAddNewJob,
  onToggleOccurrenceCompleted,
  onEditShiftEvent,
  isHydrated,
}: MobileIncomeJobsViewProps) {
  const [period, setPeriod] = useState<IncomeFilterPeriod>("this_week");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(monthlyIncomeGoal));

  const summary = useMemo(
    () => computePeriodIncomeSummary(allEvents, jobs, period),
    [allEvents, jobs, period]
  );

  const monthSummary = useMemo(
    () =>
      period === "this_month"
        ? summary
        : computePeriodIncomeSummary(allEvents, jobs, "this_month"),
    [allEvents, jobs, period, summary]
  );

  const goalValue = Math.max(0, monthlyIncomeGoal);
  const earnedPct =
    goalValue > 0
      ? Math.min(100, Math.round((monthSummary.earnedAmount / goalValue) * 100))
      : 0;
  const totalPct =
    goalValue > 0
      ? Math.min(100, Math.round((monthSummary.totalAmount / goalValue) * 100))
      : 0;

  return (
    <div className="px-3 pb-28 space-y-3">
      {/* Period Selector */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-orange-200/70 bg-[#FFFDF9] p-1">
        {(
          [
            { id: "this_week", label: "Tuần này" },
            { id: "next_week", label: "Tuần sau" },
            { id: "this_month", label: "Tháng này" },
          ] as Array<{ id: IncomeFilterPeriod; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`rounded-xl py-2 text-xs font-bold transition ${
              period === item.id
                ? "bg-[#231F20] text-[#FFFDF9]"
                : "text-[#231F20]/70"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Earned vs Projected Card */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#231F20]/60">
              Tổng thu nhập ({summary.periodLabel})
            </span>
            <p
              suppressHydrationWarning
              className="text-2xl font-extrabold text-[#231F20] tabular-nums"
            >
              {isHydrated ? formatCurrencyVnd(summary.totalAmount) : "0đ"}
            </p>
          </div>
          <span className="rounded-2xl bg-orange-50 border border-orange-200 px-2.5 py-1 text-xs font-bold text-[#231F20] tabular-nums">
            {summary.occurrences.length} ca •{" "}
            {formatHoursDecimal(summary.totalPaidMinutes)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] p-2.5">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#276723]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Thực nhận</span>
            </div>
            <p className="mt-1 text-sm font-extrabold text-[#231F20] tabular-nums">
              {formatCurrencyVnd(summary.earnedAmount)}
            </p>
            <span className="text-[10px] text-[#276723] tabular-nums">
              {summary.completedCount} ca đã làm
            </span>
          </div>

          <div className="rounded-2xl border border-sky-200/70 bg-sky-50 p-2.5">
            <div className="flex items-center gap-1 text-[11px] font-bold text-sky-800">
              <Clock className="h-3.5 w-3.5" />
              <span>Dự kiến</span>
            </div>
            <p className="mt-1 text-sm font-extrabold text-[#231F20] tabular-nums">
              {formatCurrencyVnd(summary.projectedAmount)}
            </p>
            <span className="text-[10px] text-sky-800/80 tabular-nums">
              {summary.upcomingCount} ca sắp làm
            </span>
          </div>
        </div>

        {/* Monthly Goal (Striped Orange & Cream Progress Bar) */}
        <div className="pt-2 border-t border-orange-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-[#231F20]">
              <Target className="h-3.5 w-3.5 text-[#FF7A00]" />
              Mục tiêu tháng
            </span>
            <button
              type="button"
              onClick={() => {
                setGoalInput(String(monthlyIncomeGoal));
                setEditingGoal((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 font-extrabold text-[#231F20] tabular-nums"
            >
              <span>{formatCurrencyVnd(goalValue)}</span>
              <Pencil className="h-3 w-3 opacity-55" />
            </button>
          </div>

          {editingGoal && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateMonthlyGoal(
                  Math.max(0, Math.round(Number(goalInput) || 0))
                );
                setEditingGoal(false);
              }}
              className="flex gap-2"
            >
              <input
                type="number"
                min={0}
                step={100000}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#231F20]"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#FF7A00] px-3 py-1.5 text-xs font-bold text-white"
              >
                Lưu
              </button>
            </form>
          )}

          <div className="relative h-3.5 w-full overflow-hidden rounded-full border border-orange-200/80 bg-orange-50/70">
            <div
              style={{ width: `${totalPct}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-bao-striped-soft"
            />
            <div
              style={{ width: `${earnedPct}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-bao-striped"
            />
          </div>

          <p className="text-[11px] text-[#231F20]/70 tabular-nums">
            {monthSummary.totalAmount >= goalValue
              ? `Đã đạt 100% mục tiêu tháng!`
              : `Còn thiếu ${formatCurrencyVnd(goalValue - monthSummary.totalAmount)} (đã đạt ${totalPct}%)`}
          </p>
        </div>
      </div>

      {/* 3 Jobs List */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-[#FF7A00]" />
            <h2 className="text-sm font-extrabold text-[#231F20]">
              {jobs.length} Công việc Part-time
            </h2>
          </div>
          <button
            type="button"
            onClick={onAddNewJob}
            className="inline-flex items-center gap-1 rounded-2xl border border-orange-200 bg-white px-2.5 py-1 text-xs font-bold text-[#231F20]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Job</span>
          </button>
        </div>

        <div className="space-y-2">
          {summary.jobSummaries.map((item) => {
            const jc = JOB_COLOR_STYLES[item.job.color];
            return (
              <button
                key={item.job.id}
                type="button"
                onClick={() => onEditJob(item.job)}
                className={`w-full text-left rounded-2xl border p-3 space-y-1.5 ${jc.pillBg} ${jc.pillText} ${jc.pillBorder}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold">
                    <span className={`h-2.5 w-2.5 rounded-full ${jc.dot}`} />
                    {item.job.name}
                  </span>
                  <span className="text-sm font-extrabold text-[#231F20] tabular-nums">
                    {formatCurrencyVnd(item.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] opacity-85 tabular-nums">
                  <span>
                    {formatCurrencyVnd(item.job.rate)}
                    {item.job.payType === "hourly" ? "/g" : "/ca"}
                    {item.job.weekendMultiplier > 1
                      ? ` • T7/CN x${item.job.weekendMultiplier}`
                      : ""}
                  </span>
                  <span>
                    {item.shiftCount} ca •{" "}
                    {formatHoursDecimal(item.totalPaidMinutes)} (
                    {item.sharePercent}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shift Ledger */}
      <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] overflow-hidden">
        <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-[#231F20]/65">
            Ca làm trong kỳ ({summary.occurrences.length})
          </h3>
          <span className="text-[11px] text-[#231F20]/50">
            Chạm để thưởng/phạt
          </span>
        </div>

        {summary.occurrences.length === 0 ? (
          <div className="p-5 text-center text-xs text-[#231F20]/60">
            Chưa có ca làm nào trong kỳ này.
          </div>
        ) : (
          <div className="divide-y divide-orange-100/70">
            {summary.occurrences.map((occ) => {
              const jc = occ.job
                ? JOB_COLOR_STYLES[occ.job.color]
                : JOB_COLOR_STYLES.orange;
              return (
                <div
                  key={occ.occurrenceKey}
                  className="px-4 py-3 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onEditShiftEvent(occ.event)}
                    className="flex-1 text-left min-w-0 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#231F20] tabular-nums">
                        {DAY_SHORT_LABELS[occ.dayOfWeek]} {occ.shortDate}
                      </span>
                      <span className="font-mono text-[11px] text-[#231F20]/65 tabular-nums">
                        {occ.event.startTime}–{occ.event.endTime}
                      </span>
                      {occ.job && (
                        <span
                          className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${jc.pillBg} ${jc.pillText} ${jc.pillBorder}`}
                        >
                          {occ.job.name}
                        </span>
                      )}
                    </div>
                    {(occ.pay.bonus > 0 || occ.pay.deduction > 0) && (
                      <div className="flex items-center gap-2 text-[10.5px] font-bold tabular-nums">
                        {occ.pay.bonus > 0 && (
                          <span className="text-[#276723]">
                            +{formatCurrencyVnd(occ.pay.bonus)}
                          </span>
                        )}
                        {occ.pay.deduction > 0 && (
                          <span className="text-rose-700">
                            -{formatCurrencyVnd(occ.pay.deduction)}
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-extrabold text-[#231F20] tabular-nums">
                      {formatCurrencyVnd(occ.pay.totalPay)}
                    </span>
                    <button
                      type="button"
                      disabled={occ.isAutoCompletedByTime}
                      onClick={() => onToggleOccurrenceCompleted(occ)}
                      className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] font-bold ${
                        occ.isCompleted
                          ? "bg-[#ECF7E4] text-[#276723] border border-[#C3E5AE]"
                          : "border border-orange-200 bg-white text-[#231F20]"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{occ.isCompleted ? "Đã làm" : "Tick xong"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
