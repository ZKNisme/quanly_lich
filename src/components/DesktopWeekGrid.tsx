"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Repeat,
  Sparkles,
} from "lucide-react";
import { formatDurationVi, formatTimeRangeShort } from "@/lib/date-utils";
import {
  formatCurrencyVnd,
  formatHoursDecimal,
  JOB_COLOR_STYLES,
} from "@/lib/job-meta";
import {
  calculateShiftPay,
  hasShiftEndPassed,
  isOccurrenceManuallyCompleted,
  resolveJobForEvent,
} from "@/lib/payroll-engine";
import {
  buildDayTimeline,
  checkTimeConflicts,
  getEventsForDay,
} from "@/lib/schedule-engine";
import type {
  DayOfWeek,
  JobProfile,
  PlannerSettings,
  ScheduleEvent,
  ShiftTemplate,
  WeekDayMeta,
} from "@/types/schedule";

interface DesktopWeekGridProps {
  weekDaysMeta: WeekDayMeta[];
  weekEvents: ScheduleEvent[];
  jobs: JobProfile[];
  settings: PlannerSettings;
  activeShiftTemplate: ShiftTemplate | null;
  onQuickAddOnDay: (
    dayOfWeek: DayOfWeek,
    startTime?: string,
    endTime?: string
  ) => void;
  onEditEvent: (event: ScheduleEvent) => void;
  onCommitSingleDayShift: (dayOfWeek: DayOfWeek, template: ShiftTemplate) => void;
  isHydrated: boolean;
}

export function DesktopWeekGrid({
  weekDaysMeta,
  weekEvents,
  jobs,
  settings,
  activeShiftTemplate,
  onQuickAddOnDay,
  onEditEvent,
  onCommitSingleDayShift,
  isHydrated,
}: DesktopWeekGridProps) {
  const activeTemplateJob = activeShiftTemplate
    ? jobs.find((j) => j.id === activeShiftTemplate.jobId) ?? jobs[0] ?? null
    : null;

  return (
    <div className="grid grid-cols-7 gap-2.5 items-start">
      {weekDaysMeta.map((dayMeta) => {
        const dayEvents = getEventsForDay(weekEvents, dayMeta.dayOfWeek);
        const timelineItems = buildDayTimeline(dayEvents, settings);
        const isToday = dayMeta.isToday && isHydrated;

        const templateScan = activeShiftTemplate
          ? checkTimeConflicts(
              {
                dayOfWeek: dayMeta.dayOfWeek,
                startTime: activeShiftTemplate.startTime,
                endTime: activeShiftTemplate.endTime,
              },
              dayEvents,
              0
            )
          : null;

        const templateDayPay =
          activeShiftTemplate && activeTemplateJob
            ? calculateShiftPay(
                {
                  startTime: activeShiftTemplate.startTime,
                  endTime: activeShiftTemplate.endTime,
                  breakMinutes: activeShiftTemplate.breakMinutes ?? 0,
                  isOvernight: activeShiftTemplate.isOvernight,
                },
                activeTemplateJob,
                dayMeta.dayOfWeek
              )
            : null;

        return (
          <div
            key={dayMeta.dayOfWeek}
            className={`rounded-3xl border bg-[#FFFDF9] flex flex-col min-h-[540px] transition ${
              isToday
                ? "border-[#FF7A00] ring-2 ring-orange-200/70"
                : templateScan?.status === "ok"
                  ? "border-[#276723]/50 ring-2 ring-[#C3E5AE]/70"
                  : "border-orange-200/70"
            }`}
          >
            {/* Day Column Header */}
            <div
              className={`px-2.5 py-2.5 border-b flex items-center justify-between gap-1 rounded-t-3xl ${
                isToday
                  ? "bg-orange-50/90 border-orange-200"
                  : "bg-orange-50/35 border-orange-200/60"
              }`}
            >
              <div className="min-w-0">
                <span
                  className={`block text-xs font-extrabold truncate ${
                    isToday ? "text-[#FF7A00]" : "text-[#231F20]"
                  }`}
                >
                  {dayMeta.fullLabel}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    suppressHydrationWarning
                    className="text-[11px] font-semibold text-[#231F20]/60 tabular-nums"
                  >
                    {isHydrated ? dayMeta.shortDate : "--/--"}
                  </span>
                  {isToday && (
                    <span className="rounded-md bg-[#FF7A00] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Hôm nay
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onQuickAddOnDay(dayMeta.dayOfWeek)}
                title={`Thêm lịch ${dayMeta.fullLabel}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-orange-200/80 bg-[#FFFDF9] text-[#231F20] hover:bg-[#FF7A00] hover:text-white hover:border-[#FF7A00] transition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Active "Soi ca nhanh" Ghost Highlight */}
            {activeShiftTemplate && templateScan && (
              <div className="p-2 pb-0">
                {templateScan.status === "ok" ? (
                  <button
                    type="button"
                    onClick={() =>
                      onCommitSingleDayShift(
                        dayMeta.dayOfWeek,
                        activeShiftTemplate
                      )
                    }
                    className="w-full text-left rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] p-2 text-[#276723] hover:bg-[#dff1d2] transition space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold">
                        <Sparkles className="h-3 w-3" />
                        Trống đẹp
                      </span>
                      <span className="rounded-lg bg-[#231F20] px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                        + Chốt
                      </span>
                    </div>
                    <div className="font-mono text-[10.5px] font-bold tabular-nums">
                      {formatTimeRangeShort(
                        activeShiftTemplate.startTime,
                        activeShiftTemplate.endTime,
                        activeShiftTemplate.isOvernight
                      )}
                    </div>
                    {templateDayPay && (
                      <div className="text-[10.5px] font-extrabold tabular-nums">
                        +{formatCurrencyVnd(templateDayPay.totalPay)}
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-2 text-rose-700 space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-extrabold">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Trùng lịch</span>
                    </div>
                    <p className="text-[9.5px] truncate">
                      {templateScan.overlaps[0]?.event.title} (
                      {templateScan.overlaps[0]?.event.startTime})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Day Vertical Timeline Items */}
            <div className="p-2 space-y-1.5 flex-1">
              {timelineItems.map((item) => {
                if (item.type === "free") {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        onQuickAddOnDay(
                          dayMeta.dayOfWeek,
                          item.startTime,
                          item.endTime
                        )
                      }
                      className="w-full text-left group rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] px-2.5 py-2 text-[#276723] hover:bg-[#dff1d2] transition"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10.5px] font-extrabold">
                          Trống
                        </span>
                        <span className="rounded-lg bg-[#FFFDF9]/85 px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums">
                          {formatDurationVi(item.durationMinutes)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-semibold tabular-nums opacity-90">
                          {item.startTime} - {item.endTime}
                        </span>
                        <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </button>
                  );
                }

                const {
                  event,
                  hasOverlap,
                } = item;
                const isWork = event.category === "work";
                const isStudy = event.category === "study";
                const job = isWork ? resolveJobForEvent(event, jobs) : null;
                const jobColor = job ? JOB_COLOR_STYLES[job.color] : null;
                const pay = isWork
                  ? calculateShiftPay(event, job, event.dayOfWeek)
                  : null;
                const isCompleted =
                  isWork && isHydrated
                    ? hasShiftEndPassed(
                        dayMeta.isoDate,
                        event.startTime,
                        event.endTime,
                        event.isOvernight,
                        new Date()
                      ) ||
                      isOccurrenceManuallyCompleted(event, dayMeta.isoDate)
                    : false;

                const cardColorClasses =
                  isWork && jobColor
                    ? `${jobColor.pillBg} ${jobColor.pillText} ${jobColor.pillBorder} ${jobColor.pillHover}`
                    : isStudy
                      ? "bg-sky-50 text-sky-800 border-sky-200/70 hover:bg-sky-100/70"
                      : "bg-rose-50 text-rose-700 border-rose-200/70 hover:bg-rose-100/70";

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEditEvent(event)}
                    className={`w-full text-left rounded-2xl border p-2.5 transition space-y-1 ${cardColorClasses} ${
                      hasOverlap ? "ring-2 ring-rose-300 border-rose-400" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold tabular-nums opacity-85">
                        <Clock className="h-2.5 w-2.5 shrink-0 opacity-75" />
                        {formatTimeRangeShort(
                          event.startTime,
                          event.endTime,
                          event.isOvernight
                        )}
                      </span>
                      {event.repeatMode === "weekly" && (
                        <Repeat className="h-2.5 w-2.5 shrink-0 opacity-65" />
                      )}
                    </div>

                    <div className="text-[11.5px] font-extrabold leading-snug line-clamp-2 text-[#231F20]">
                      {isWork && job ? job.name : event.title}
                    </div>

                    {isWork && pay && (
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <span className="text-[10px] font-semibold opacity-80 tabular-nums">
                          {formatHoursDecimal(pay.paidMinutes)}
                          {pay.multiplier > 1 ? ` • x${pay.multiplier}` : ""}
                        </span>
                        <span className="text-[11px] font-extrabold text-[#231F20] tabular-nums">
                          {formatCurrencyVnd(pay.totalPay)}
                        </span>
                      </div>
                    )}

                    {event.note && !isWork && (
                      <div className="flex items-center gap-1 text-[10px] opacity-80 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{event.note}</span>
                      </div>
                    )}

                    {(hasOverlap || isCompleted) && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {hasOverlap && (
                          <span className="inline-flex items-center gap-0.5 rounded-lg bg-rose-100 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-700">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Trùng giờ
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-0.5 rounded-lg bg-[#ECF7E4] px-1.5 py-0.5 text-[9.5px] font-bold text-[#276723] border border-[#C3E5AE]">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Đã làm
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
