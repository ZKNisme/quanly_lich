"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  ListTodo,
  MapPin,
  Plus,
  Repeat,
} from "lucide-react";
import {
  formatDurationVi,
  formatTimeRangeShort,
  getDurationMinutes,
} from "@/lib/date-utils";
import {
  formatCurrencyVnd,
  JOB_COLOR_STYLES,
} from "@/lib/job-meta";
import {
  calculateShiftPay,
  isOccurrenceManuallyCompleted,
  resolveEventForDate,
  resolveJobForEvent,
} from "@/lib/payroll-engine";
import {
  buildDayTimeline,
  getEventsForDay,
  getEventSessions,
  SESSION_LIST,
} from "@/lib/schedule-engine";
import type {
  DayOfWeek,
  JobProfile,
  PlannerSettings,
  ScheduleEvent,
  WeekDayMeta,
} from "@/types/schedule";

interface MobileScheduleViewProps {
  weekDaysMeta: WeekDayMeta[];
  weekEvents: ScheduleEvent[];
  jobs: JobProfile[];
  settings: PlannerSettings;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  onEditEvent: (event: ScheduleEvent, isoDate?: string) => void;
  onQuickAddInSlot: (
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string
  ) => void;
  onOpenSubjectsModal: () => void;
  onOpenCopyModal: () => void;
  isHydrated: boolean;
}

export function MobileScheduleView({
  weekDaysMeta,
  weekEvents,
  jobs,
  settings,
  selectedDay,
  onSelectDay,
  onEditEvent,
  onQuickAddInSlot,
  onOpenSubjectsModal,
  onOpenCopyModal,
  isHydrated,
}: MobileScheduleViewProps) {
  const [mobileMode, setMobileMode] = useState<"timeline" | "overview">(
    "timeline"
  );

  const selectedDayMeta = weekDaysMeta[selectedDay] ?? weekDaysMeta[0];
  const dayEvents = getEventsForDay(weekEvents, selectedDay).map((ev) =>
    resolveEventForDate(ev, selectedDayMeta.isoDate)
  );
  const timelineItems = buildDayTimeline(dayEvents, settings);

  const totalFreeMinutes = timelineItems.reduce(
    (sum, item) => (item.type === "free" ? sum + item.durationMinutes : sum),
    0
  );

  return (
    <div className="pb-28 space-y-3">
      {/* Sticky Day Strip (T2..CN) */}
      <div className="sticky top-0 z-20 bg-[#F6FAD9]/90 backdrop-blur-md px-3 pt-1.5 pb-2 border-b border-orange-200/60 space-y-2">
        <div className="grid grid-cols-7 gap-1">
          {weekDaysMeta.map((day) => {
            const isSelected = selectedDay === day.dayOfWeek;
            const dEvents = getEventsForDay(weekEvents, day.dayOfWeek);
            const hasStudy = dEvents.some((e) => e.category === "study");
            const hasPersonal = dEvents.some((e) => e.category === "personal");
            const hasWork = dEvents.some((e) => e.category === "work");

            return (
              <button
                key={day.dayOfWeek}
                type="button"
                onClick={() => {
                  onSelectDay(day.dayOfWeek);
                  if (mobileMode === "overview") {
                    setMobileMode("timeline");
                  }
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl border transition min-h-[52px] ${
                  isSelected && mobileMode === "timeline"
                    ? "bg-[#231F20] border-[#231F20] text-[#FFFDF9]"
                    : day.isToday && isHydrated
                      ? "bg-[#FFFDF9] border-[#FF7A00] text-[#231F20]"
                      : "bg-[#FFFDF9] border-orange-200/70 text-[#231F20]"
                }`}
              >
                <span className="text-[11px] font-bold leading-none">
                  {day.shortLabel}
                </span>
                <span
                  suppressHydrationWarning
                  className={`mt-1 text-[10.5px] font-semibold tabular-nums leading-none ${
                    isSelected && mobileMode === "timeline"
                      ? "text-orange-200"
                      : "text-[#231F20]/60"
                  }`}
                >
                  {isHydrated ? day.dateNumber : "--"}
                </span>

                {/* Category Dots */}
                <div className="mt-1.5 flex items-center gap-0.5 h-1.5">
                  {hasStudy && (
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  )}
                  {hasPersonal && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  )}
                  {hasWork && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A00]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sub-bar: Mode Toggle + Soi ca nhanh */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-2xl border border-orange-200/70 bg-[#FFFDF9] p-0.5">
            <button
              type="button"
              onClick={() => setMobileMode("timeline")}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                mobileMode === "timeline"
                  ? "bg-[#231F20] text-[#FFFDF9]"
                  : "text-[#231F20]/70"
              }`}
            >
              <ListTodo className="h-3 w-3" />
              <span>Theo ngày</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMode("overview")}
              className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                mobileMode === "overview"
                  ? "bg-[#231F20] text-[#FFFDF9]"
                  : "text-[#231F20]/70"
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              <span>Tổng quan 7 ngày</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSubjectsModal}
              className="inline-flex items-center gap-1 rounded-2xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-bold text-sky-800"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Thêm môn</span>
            </button>
          </div>
        </div>
      </div>

      {mobileMode === "timeline" ? (
        <div className="px-3 space-y-2.5">
          {/* Selected Day Header Card */}
          <div className="flex items-center justify-between rounded-3xl border border-orange-200/70 bg-[#FFFDF9] px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-[#231F20]">
                  {selectedDayMeta.fullLabel}
                </h2>
                {selectedDayMeta.isToday && isHydrated && (
                  <span className="rounded-lg bg-[#FF7A00] px-2 py-0.5 text-[10px] font-bold text-white">
                    Hôm nay
                  </span>
                )}
              </div>
              <p
                suppressHydrationWarning
                className="text-[11px] text-[#231F20]/60 tabular-nums"
              >
                {isHydrated ? selectedDayMeta.shortDate : "--/--"} •{" "}
                {dayEvents.length} lịch trình
              </p>
            </div>

            <div className="rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] px-3 py-1.5 text-xs font-bold text-[#276723] tabular-nums">
              Rảnh {formatDurationVi(totalFreeMinutes)}
            </div>
          </div>

          {/* Vertical Timeline Cards */}
          {timelineItems.map((item) => {
            if (item.type === "free") {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onQuickAddInSlot(
                      selectedDayMeta.dayOfWeek,
                      item.startTime,
                      item.endTime
                    )
                  }
                  className="w-full text-left rounded-3xl border border-[#C3E5AE] bg-[#ECF7E4] p-3.5 text-[#276723] flex items-center justify-between gap-2 active:scale-[0.99] transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold">
                        Khoảng trống rảnh
                      </span>
                      <span className="rounded-lg bg-[#FFFDF9]/85 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                        {formatDurationVi(item.durationMinutes)}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums opacity-90">
                      {item.startTime} – {item.endTime}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-2xl bg-[#FFFDF9] px-3 py-1.5 text-[11px] font-bold text-[#276723] border border-[#C3E5AE] shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm việc</span>
                  </span>
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
            const jc = job ? JOB_COLOR_STYLES[job.color] : null;
            const pay = isWork
              ? calculateShiftPay(event, job, event.dayOfWeek)
              : null;
            const isCompleted =
              isWork && isHydrated
                ? isOccurrenceManuallyCompleted(
                    event,
                    selectedDayMeta.isoDate
                  )
                : false;

            const duration = getDurationMinutes(
              event.startTime,
              event.endTime,
              event.isOvernight
            );

            const cardClass =
              isWork && jc
                ? `${jc.pillBg} ${jc.pillText} ${jc.pillBorder}`
                : isStudy
                  ? "bg-sky-50 text-sky-800 border-sky-200/70"
                  : "bg-rose-50 text-rose-700 border-rose-200/70";

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onEditEvent(event, selectedDayMeta.isoDate)}
                className={`w-full text-left rounded-3xl border p-4 space-y-2 active:scale-[0.99] transition ${cardClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums">
                    <Clock className="h-3.5 w-3.5 opacity-75" />
                    {formatTimeRangeShort(
                      event.startTime,
                      event.endTime,
                      event.isOvernight
                    )}{" "}
                    ({formatDurationVi(duration)})
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-xl bg-[#FFFDF9]/85 px-2 py-0.5 text-[10px] font-bold text-[#231F20]">
                    {event.repeatMode === "weekly" ? (
                      <>
                        <Repeat className="h-2.5 w-2.5" />
                        <span>Cố định</span>
                      </>
                    ) : (
                      <span>Tuần này</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-[#231F20] leading-snug">
                    {isWork && job ? job.name : event.title}
                  </h3>
                  {isWork && pay && (
                    <span className="text-sm font-extrabold text-[#231F20] tabular-nums shrink-0">
                      {formatCurrencyVnd(pay.totalPay)}
                    </span>
                  )}
                </div>

                {isWork &&
                  pay &&
                  (pay.multiplier > 1 || isCompleted) && (
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
                      {pay.multiplier > 1 && (
                        <span className="rounded-lg bg-[#FFFDF9]/85 px-1.5 py-0.5 text-[10px] font-bold">
                          x{pay.multiplier}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-0.5 rounded-lg bg-[#ECF7E4] px-1.5 py-0.5 text-[10px] font-bold text-[#276723] border border-[#C3E5AE]">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Đã chốt giờ
                        </span>
                      )}
                    </div>
                  )}

                {event.note && (
                  <div className="flex items-center gap-1 text-xs opacity-85">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{event.note}</span>
                  </div>
                )}

                {hasOverlap && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      <AlertTriangle className="h-3 w-3" />
                      Trùng khung giờ!
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Compact Mobile 7-Day Overview Grid */
        <div className="px-2.5">
          <div className="rounded-3xl border border-orange-200/70 bg-[#FFFDF9] overflow-hidden">
            <div className="grid grid-cols-[42px_repeat(7,minmax(0,1fr))] border-b border-orange-200/60 bg-orange-50/40 text-[11px] font-bold text-[#231F20]">
              <div className="py-2 text-center border-r border-orange-200/60">
                Buổi
              </div>
              {weekDaysMeta.map((d) => (
                <button
                  key={d.dayOfWeek}
                  type="button"
                  onClick={() => {
                    onSelectDay(d.dayOfWeek);
                    setMobileMode("timeline");
                  }}
                  className={`py-2 text-center border-r last:border-r-0 border-orange-100 ${
                    d.isToday && isHydrated ? "bg-orange-100/70 text-[#FF7A00]" : ""
                  }`}
                >
                  <div>{d.shortLabel}</div>
                  <div className="text-[9px] font-medium opacity-60 tabular-nums">
                    {isHydrated ? d.dateNumber : "--"}
                  </div>
                </button>
              ))}
            </div>

            <div className="divide-y divide-orange-100">
              {SESSION_LIST.map((session) => (
                <div
                  key={session.key}
                  className="grid grid-cols-[42px_repeat(7,minmax(0,1fr))] min-h-[96px]"
                >
                  <div className="flex items-center justify-center bg-orange-50/30 border-r border-orange-200/60 text-[11px] font-bold text-[#231F20]">
                    {session.label}
                  </div>

                  {weekDaysMeta.map((day) => {
                    const cellEvents = weekEvents
                      .filter(
                        (ev) =>
                          ev.dayOfWeek === day.dayOfWeek &&
                          getEventSessions(
                            resolveEventForDate(ev, day.isoDate)
                          ).includes(session.key)
                      )
                      .map((ev) => resolveEventForDate(ev, day.isoDate));

                    return (
                      <div
                        key={`${session.key}-${day.dayOfWeek}`}
                        className="p-0.5 border-r last:border-r-0 border-orange-100/70 flex flex-col gap-1"
                      >
                        {cellEvents.length > 0 ? (
                          cellEvents.map((ev) => {
                            const isWork = ev.category === "work";
                            const job = isWork
                              ? resolveJobForEvent(ev, jobs)
                              : null;
                            const jc = job
                              ? JOB_COLOR_STYLES[job.color]
                              : null;

                            const cls =
                              isWork && jc
                                ? `${jc.pillBg} ${jc.pillText} ${jc.pillBorder}`
                                : ev.category === "study"
                                  ? "bg-sky-50 text-sky-800 border-sky-200/70"
                                  : "bg-rose-50 text-rose-700 border-rose-200/70";

                            return (
                              <button
                                key={`${session.key}-${ev.id}`}
                                type="button"
                                onClick={() => onEditEvent(ev, day.isoDate)}
                                className={`w-full text-left rounded-xl border px-1 py-1 ${cls}`}
                              >
                                <div className="font-mono text-[8.5px] font-bold tabular-nums truncate">
                                  {ev.startTime}
                                </div>
                                <div className="text-[9px] font-bold leading-tight line-clamp-2 text-[#231F20]">
                                  {isWork && job ? job.name : ev.title}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onQuickAddInSlot(
                                day.dayOfWeek,
                                session.defaultStart,
                                session.defaultEnd
                              )
                            }
                            className="flex-1 w-full rounded-xl bg-[#ECF7E4]/70 hover:bg-[#ECF7E4] flex items-center justify-center text-[9px] font-bold text-[#276723]"
                          >
                            Trống
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 pt-1">
        <button
          type="button"
          onClick={onOpenCopyModal}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#231F20] px-4 py-3 text-xs font-bold text-[#FFFDF9] hover:bg-black active:scale-[0.99] transition"
        >
          <Copy className="h-4 w-4 text-[#FF7A00]" />
          <span>Copy lịch chốt</span>
        </button>
      </div>
    </div>
  );
}
