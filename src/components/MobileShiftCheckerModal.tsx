"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { formatCurrencyVnd, JOB_COLOR_STYLES } from "@/lib/job-meta";
import { calculateShiftPay } from "@/lib/payroll-engine";
import { checkTimeConflicts, getEventsForDay } from "@/lib/schedule-engine";
import type {
  DayOfWeek,
  JobProfile,
  ScheduleEvent,
  ShiftTemplate,
  WeekDayMeta,
} from "@/types/schedule";

interface MobileShiftCheckerModalProps {
  shiftTemplates: ShiftTemplate[];
  jobs: JobProfile[];
  weekEvents: ScheduleEvent[];
  weekDaysMeta: WeekDayMeta[];
  onCommitShifts: (template: ShiftTemplate, days: DayOfWeek[]) => void;
  onClose: () => void;
}

export function MobileShiftCheckerModal({
  shiftTemplates,
  jobs,
  weekEvents,
  weekDaysMeta,
  onCommitShifts,
  onClose,
}: MobileShiftCheckerModalProps) {
  const [selectedTplId, setSelectedTplId] = useState(
    shiftTemplates[0]?.id ?? ""
  );
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);

  const activeTpl = useMemo(
    () =>
      shiftTemplates.find((t) => t.id === selectedTplId) ??
      shiftTemplates[0] ??
      null,
    [shiftTemplates, selectedTplId]
  );

  const activeJob = useMemo(() => {
    if (!activeTpl) return jobs[0] ?? null;
    return jobs.find((j) => j.id === activeTpl.jobId) ?? jobs[0] ?? null;
  }, [activeTpl, jobs]);

  const scans = useMemo(() => {
    if (!activeTpl) return [];
    return weekDaysMeta.map((meta) => {
      const dayEvents = getEventsForDay(weekEvents, meta.dayOfWeek);
      const check = checkTimeConflicts(
        {
          dayOfWeek: meta.dayOfWeek,
          startTime: activeTpl.startTime,
          endTime: activeTpl.endTime,
        },
        dayEvents,
        0
      );
      const pay = activeJob
        ? calculateShiftPay(
            {
              startTime: activeTpl.startTime,
              endTime: activeTpl.endTime,
              isOvernight: activeTpl.isOvernight,
              breakMinutes: activeTpl.breakMinutes ?? 0,
            },
            activeJob,
            meta.dayOfWeek
          )
        : null;
      return { meta, check, pay };
    });
  }, [activeTpl, activeJob, weekDaysMeta, weekEvents]);

  const validDays = useMemo(
    () =>
      scans
        .filter((s) => s.check.status === "ok")
        .map((s) => s.meta.dayOfWeek),
    [scans]
  );

  const toggleDay = (d: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#231F20]/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-orange-200/70 bg-[#FFFDF9] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#FF7A00]" />
            <h2 className="text-sm font-extrabold text-[#231F20]">
              Soi ca nhanh 7 ngày
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-[#231F20]/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-1.5">
            {shiftTemplates.map((tpl) => {
              const tplJob =
                jobs.find((j) => j.id === tpl.jobId) ?? activeJob ?? jobs[0];
              const jc = tplJob
                ? JOB_COLOR_STYLES[tplJob.color]
                : JOB_COLOR_STYLES.orange;
              const selected = activeTpl?.id === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTplId(tpl.id);
                    setSelectedDays([]);
                  }}
                  className={`w-full text-left rounded-2xl border p-3 flex items-center justify-between ${
                    selected
                      ? "border-[#FF7A00] bg-orange-50/80"
                      : "border-orange-200/70 bg-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold text-[#231F20]">
                      {tpl.name}
                    </div>
                    {tplJob && (
                      <span
                        className={`inline-block mt-0.5 rounded-lg border px-1.5 py-0.5 text-[10px] font-bold ${jc.pillBg} ${jc.pillText} ${jc.pillBorder}`}
                      >
                        {tplJob.name}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-[#231F20] tabular-nums">
                    {tpl.startTime}–{tpl.endTime}
                  </span>
                </button>
              );
            })}
          </div>

          {validDays.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDays(validDays)}
              className="w-full rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] py-2 text-xs font-bold text-[#276723]"
            >
              Chọn tất cả {validDays.length} ngày hợp lệ
            </button>
          )}

          <div className="space-y-1.5">
            {scans.map(({ meta, check, pay }) => {
              const checked = selectedDays.includes(meta.dayOfWeek);
              const canSelect = check.status !== "conflict";

              return (
                <button
                  key={meta.dayOfWeek}
                  type="button"
                  disabled={!canSelect}
                  onClick={() => canSelect && toggleDay(meta.dayOfWeek)}
                  className={`w-full text-left rounded-2xl border p-2.5 flex items-start gap-2.5 ${
                    checked
                      ? "border-[#FF7A00] bg-orange-50"
                      : check.status === "ok"
                        ? "border-[#C3E5AE] bg-[#ECF7E4]/50"
                        : "border-rose-200 bg-rose-50/50 opacity-80"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border ${
                      checked
                        ? "border-[#FF7A00] bg-[#FF7A00] text-white"
                        : "border-orange-200 bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#231F20] tabular-nums">
                        {meta.shortLabel} ({meta.shortDate})
                        {pay && canSelect && (
                          <span className="ml-1.5 text-[#276723]">
                            +{formatCurrencyVnd(pay.totalPay)}
                          </span>
                        )}
                      </span>
                      {check.status === "ok" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#276723]">
                          <CheckCircle2 className="h-3 w-3" />
                          Hợp lệ
                        </span>
                      )}
                      {check.status === "conflict" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                          <XCircle className="h-3 w-3" />
                          Trùng {check.overlaps[0]?.event.title}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-orange-100 bg-orange-50/35 px-4 py-3 shrink-0">
          <button
            type="button"
            disabled={!activeTpl || selectedDays.length === 0}
            onClick={() => {
              if (activeTpl && selectedDays.length > 0) {
                onCommitShifts(activeTpl, selectedDays);
                onClose();
              }
            }}
            className="w-full h-11 rounded-2xl bg-[#FF7A00] text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 transition"
          >
            {selectedDays.length > 0
              ? `Chốt ${selectedDays.length} ca làm`
              : "Chọn ngày trống để chốt ca"}
          </button>
        </div>
      </div>
    </div>
  );
}
