"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CopyScheduleModal } from "@/components/CopyScheduleModal";
import { DesktopRightSidebar } from "@/components/DesktopRightSidebar";
import { DesktopWeekGrid } from "@/components/DesktopWeekGrid";
import {
  EventShiftModal,
  type EventShiftDraft,
} from "@/components/EventShiftModal";
import { JobColumnModal } from "@/components/JobColumnModal";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { MobileIncomeJobsView } from "@/components/MobileIncomeJobsView";
import { MobileScheduleView } from "@/components/MobileScheduleView";
import { SubjectsModal } from "@/components/SubjectsModal";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import {
  formatWeekTitleWithYear,
  getWeekDaysMetaByOffset,
  getWeekKeyByOffset,
  toMondayFirstDay,
} from "@/lib/date-utils";
import { expandWorkOccurrencesForWeekOffset } from "@/lib/payroll-engine";
import { getEventsForWeek } from "@/lib/schedule-engine";
import {
  generateId,
  getPlannerServerSnapshot,
  getPlannerSnapshot,
  replacePlannerStateFromRemote,
  subscribeHydration,
  subscribePlannerStore,
  updatePlannerState,
  validateAndParseState,
} from "@/lib/storage";
import type {
  DayOfWeek,
  EventCategory,
  JobProfile,
  PlannerState,
  RepeatMode,
  ScheduleEvent,
  ShiftOccurrence,
  SubjectPreset,
} from "@/types/schedule";

export function SchedulePlannerApp() {
  const state = useSyncExternalStore(
    subscribePlannerStore,
    getPlannerSnapshot,
    getPlannerServerSnapshot
  );

  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false
  );

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<"schedule" | "income">("schedule");
  const [userSelectedDay, setUserSelectedDay] = useState<DayOfWeek | null>(
    null
  );
  const selectedDay: DayOfWeek = useMemo(
    () => userSelectedDay ?? (isHydrated ? toMondayFirstDay(new Date()) : 0),
    [userSelectedDay, isHydrated]
  );

  // Modals
  const [eventDraft, setEventDraft] = useState<EventShiftDraft | null>(null);
  const [jobModalTarget, setJobModalTarget] = useState<
    "new" | JobProfile | null
  >(null);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushStateToNeon = useCallback(async (nextState: PlannerState) => {
    try {
      await fetch("/api/planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
    } catch {
      // Offline / localStorage fallback stays intact
    }
  }, []);

  const commitPlannerChange = useCallback(
    (updater: (prev: PlannerState) => PlannerState) => {
      const next = updatePlannerState(updater);
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        void pushStateToNeon(next);
      }, 350);
      return next;
    },
    [pushStateToNeon]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromNeon() {
      try {
        const res = await fetch("/api/planner", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          exists?: boolean;
          state?: unknown;
        };
        if (cancelled) return;

        if (json.exists && json.state) {
          const parsed = validateAndParseState(JSON.stringify(json.state));
          if (parsed.ok) {
            replacePlannerStateFromRemote(parsed.state);
            return;
          }
        }

        // Neon DB has no workspace yet -> seed it with current local state
        const localSnapshot = getPlannerSnapshot();
        await pushStateToNeon(localSnapshot);
      } catch {
        // Offline fallback stays on localStorage
      }
    }

    void hydrateFromNeon();
    return () => {
      cancelled = true;
    };
  }, [pushStateToNeon]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  }, []);

  const activeWeekKey = useMemo(
    () => getWeekKeyByOffset(weekOffset),
    [weekOffset]
  );
  const otherWeekKey = useMemo(
    () => getWeekKeyByOffset(weekOffset === 0 ? 1 : 0),
    [weekOffset]
  );
  const weekDaysMeta = useMemo(
    () => getWeekDaysMetaByOffset(weekOffset),
    [weekOffset]
  );
  const weekTitle = useMemo(
    () => formatWeekTitleWithYear(weekOffset),
    [weekOffset]
  );

  const weekEvents = useMemo(
    () => getEventsForWeek(state.events, activeWeekKey),
    [state.events, activeWeekKey]
  );

  const weekWorkSummary = useMemo(() => {
    const occs = expandWorkOccurrencesForWeekOffset(
      state.events,
      state.jobs,
      weekOffset
    );
    const totalPaidMinutes = occs.reduce(
      (sum, o) => sum + o.pay.paidMinutes,
      0
    );
    const totalIncome = occs.reduce((sum, o) => sum + o.pay.totalPay, 0);
    return {
      shiftCount: occs.length,
      totalPaidMinutes,
      totalIncome,
    };
  }, [state.events, state.jobs, weekOffset]);

  const handleSaveEvent = (payload: {
    id?: string;
    applyToIsoDate?: string;
    title: string;
    category: EventCategory;
    dayOfWeek: DayOfWeek;
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
  }) => {
    commitPlannerChange((prev) => {
      const workExtras =
        payload.category === "work"
          ? {
              jobId: payload.jobId ?? prev.jobs[0]?.id,
              breakMinutes: payload.breakMinutes ?? 0,
              breakStartTime: payload.breakStartTime,
              breakEndTime: payload.breakEndTime,
              isHoliday: Boolean(payload.isHoliday),
              holidayMultiplier: payload.holidayMultiplier,
              bonusAmount: payload.bonusAmount ?? 0,
              deductionAmount: payload.deductionAmount ?? 0,
              isCompleted: Boolean(payload.isCompleted),
            }
          : {
              jobId: undefined,
              breakMinutes: undefined,
              breakStartTime: undefined,
              breakEndTime: undefined,
              isHoliday: undefined,
              holidayMultiplier: undefined,
              bonusAmount: undefined,
              deductionAmount: undefined,
              isCompleted: undefined,
            };

      if (payload.id) {
        return {
          ...prev,
          events: prev.events.map((ev) => {
            if (ev.id !== payload.id) return ev;

            if (
              payload.applyToIsoDate &&
              payload.category === "work" &&
              ev.repeatMode === "weekly" &&
              payload.repeatMode === "weekly"
            ) {
              const isoDate = payload.applyToIsoDate;
              const nextCompletedDates = new Set(ev.completedDates ?? []);
              if (payload.isCompleted) {
                nextCompletedDates.add(isoDate);
              } else {
                nextCompletedDates.delete(isoDate);
              }

              return {
                ...ev,
                title: payload.title,
                note: payload.note,
                jobId: payload.jobId ?? ev.jobId ?? prev.jobs[0]?.id,
                completedDates: Array.from(nextCompletedDates),
                actualLogs: {
                  ...(ev.actualLogs ?? {}),
                  [isoDate]: {
                    startTime: payload.startTime,
                    endTime: payload.endTime,
                    ...(payload.isOvernight ? { isOvernight: true } : {}),
                    breakMinutes: payload.breakMinutes ?? 0,
                    ...(payload.breakStartTime && payload.breakEndTime
                      ? {
                          breakStartTime: payload.breakStartTime,
                          breakEndTime: payload.breakEndTime,
                        }
                      : {}),
                    isHoliday: Boolean(payload.isHoliday),
                    ...(payload.holidayMultiplier
                      ? { holidayMultiplier: payload.holidayMultiplier }
                      : {}),
                    bonusAmount: payload.bonusAmount ?? 0,
                    deductionAmount: payload.deductionAmount ?? 0,
                  },
                },
              };
            }

            return {
              ...ev,
              title: payload.title,
              category: payload.category,
              dayOfWeek: payload.dayOfWeek,
              startTime: payload.startTime,
              endTime: payload.endTime,
              isOvernight: payload.isOvernight,
              note: payload.note,
              repeatMode: payload.repeatMode,
              weekKey: payload.weekKey,
              repeatStartDate:
                payload.repeatMode === "weekly"
                  ? (payload.repeatStartDate ?? null)
                  : null,
              repeatEndDate:
                payload.repeatMode === "weekly"
                  ? (payload.repeatEndDate ?? null)
                  : null,
              ...workExtras,
            };
          }),
        };
      }

      const created: ScheduleEvent = {
        id: generateId("ev"),
        title: payload.title,
        category: payload.category,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        isOvernight: payload.isOvernight,
        note: payload.note,
        repeatMode: payload.repeatMode,
        weekKey: payload.weekKey,
        ...(payload.repeatMode === "weekly" && payload.repeatStartDate
          ? { repeatStartDate: payload.repeatStartDate }
          : {}),
        ...(payload.repeatMode === "weekly" && payload.repeatEndDate
          ? { repeatEndDate: payload.repeatEndDate }
          : {}),
        createdAt: Date.now(),
        ...workExtras,
      };

      return {
        ...prev,
        events: [...prev.events, created],
      };
    });

    setUserSelectedDay(payload.dayOfWeek);
    setEventDraft(null);
    showToast(
      payload.category === "work" && payload.isCompleted
        ? "Đã cập nhật giờ thực tế & chốt lương ca!"
        : payload.id
          ? "Đã cập nhật lịch trình"
          : "Đã thêm lịch mới"
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    commitPlannerChange((prev) => ({
      ...prev,
      events: prev.events.filter((ev) => ev.id !== eventId),
    }));
    setEventDraft(null);
    showToast("Đã xóa lịch trình");
  };

  const handleAddSubject = (subject: Omit<SubjectPreset, "id">) => {
    const created: SubjectPreset = {
      id: generateId("subj"),
      ...subject,
    };
    commitPlannerChange((prev) => ({
      ...prev,
      subjects: [...prev.subjects, created],
    }));
    showToast(`Đã lưu môn "${created.name}"`);
    return created;
  };

  const handleDeleteSubject = (subjectId: string) => {
    commitPlannerChange((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
    }));
    showToast("Đã xóa môn học");
  };

  const handleCommitSubjectDays = (
    subject: SubjectPreset,
    days: DayOfWeek[]
  ) => {
    const newEvents: ScheduleEvent[] = days.map((day, idx) => ({
      id: generateId("study"),
      title: subject.name,
      category: "study",
      dayOfWeek: day,
      startTime: subject.startTime,
      endTime: subject.endTime,
      note: subject.note,
      repeatMode: subject.repeatMode,
      weekKey: subject.repeatMode === "weekly" ? null : activeWeekKey,
      ...(subject.repeatMode === "weekly" && subject.repeatStartDate
        ? { repeatStartDate: subject.repeatStartDate }
        : {}),
      ...(subject.repeatMode === "weekly" && subject.repeatEndDate
        ? { repeatEndDate: subject.repeatEndDate }
        : {}),
      createdAt: Date.now() + idx,
    }));

    commitPlannerChange((prev) => ({
      ...prev,
      events: [...prev.events, ...newEvents],
    }));
    showToast(`Đã thêm "${subject.name}" vào ${newEvents.length} ngày!`);
  };

  const handleSaveJob = (
    payload: Omit<JobProfile, "id"> & { id?: string }
  ) => {
    commitPlannerChange((prev) => {
      if (payload.id) {
        return {
          ...prev,
          jobs: prev.jobs.map((j) =>
            j.id === payload.id ? { ...payload, id: payload.id } : j
          ),
        };
      }
      const created: JobProfile = { ...payload, id: generateId("job") };
      return {
        ...prev,
        jobs: [...prev.jobs, created],
      };
    });
    setJobModalTarget(null);
    showToast(
      payload.id
        ? `Đã lưu cấu hình "${payload.name}"`
        : `Đã thêm công việc "${payload.name}"`
    );
  };

  const handleDeleteJob = (jobId: string) => {
    commitPlannerChange((prev) => {
      if (prev.jobs.length <= 1) return prev;
      const remaining = prev.jobs.filter((j) => j.id !== jobId);
      const fallbackId = remaining[0].id;
      return {
        ...prev,
        jobs: remaining,
        events: prev.events.map((ev) =>
          ev.category === "work" && ev.jobId === jobId
            ? { ...ev, jobId: fallbackId }
            : ev
        ),
        shiftTemplates: prev.shiftTemplates.map((tpl) =>
          tpl.jobId === jobId ? { ...tpl, jobId: fallbackId } : tpl
        ),
      };
    });
    setJobModalTarget(null);
    showToast("Đã xóa công việc");
  };

  const handleToggleOccurrenceCompleted = (occ: ShiftOccurrence) => {
    commitPlannerChange((prev) => ({
      ...prev,
      events: prev.events.map((ev) => {
        if (ev.id !== occ.event.id) return ev;
        if (ev.repeatMode === "once") {
          return { ...ev, isCompleted: !ev.isCompleted };
        }
        const existingDates = ev.completedDates ?? [];
        const hasDate = existingDates.includes(occ.isoDate);
        return {
          ...ev,
          completedDates: hasDate
            ? existingDates.filter((d) => d !== occ.isoDate)
            : [...existingDates, occ.isoDate],
        };
      }),
    }));
    showToast(
      occ.isCompleted
        ? "Đã chuyển ca về trạng thái Dự kiến"
        : "Đã chốt giờ thực tế cho ca làm!"
    );
  };

  return (
    <div className="min-h-dvh w-full text-[#231F20]">
      <WorkspaceHeader
        weekOffset={weekOffset}
        onPrevWeek={() => setWeekOffset((w) => w - 1)}
        onNextWeek={() => setWeekOffset((w) => w + 1)}
        onResetToTodayWeek={() => {
          setWeekOffset(0);
          setUserSelectedDay(null);
        }}
        weekTitle={weekTitle}
        isHydrated={isHydrated}
      />

      {/* LAPTOP / DESKTOP 2-COLUMN WORKSPACE (70% Left Grid / 30% Right Sidebar) */}
      <main className="hidden lg:grid lg:grid-cols-10 gap-5 max-w-7xl mx-auto px-6 pb-10 items-start">
        <div className="lg:col-span-7">
          <DesktopWeekGrid
            weekDaysMeta={weekDaysMeta}
            weekEvents={weekEvents}
            jobs={state.jobs}
            settings={state.settings}
            onQuickAddOnDay={(dayOfWeek, startTime, endTime) =>
              setEventDraft({
                dayOfWeek,
                startTime: startTime ?? "08:00",
                endTime: endTime ?? "12:00",
                category: startTime ? "work" : "study",
              })
            }
            onEditEvent={(ev, isoDate) => {
              const originalEvent =
                state.events.find((item) => item.id === ev.id) ?? ev;
              setEventDraft({
                editingEvent: originalEvent,
                occurrenceIsoDate: isoDate,
                dayOfWeek: originalEvent.dayOfWeek,
                startTime: ev.startTime,
                endTime: ev.endTime,
                category: originalEvent.category,
              });
            }}
            isHydrated={isHydrated}
          />
        </div>

        <div className="lg:col-span-3">
          <DesktopRightSidebar
            weekOffset={weekOffset}
            allEvents={state.events}
            jobs={state.jobs}
            subjects={state.subjects}
            settings={state.settings}
            onEditJob={(job) => setJobModalTarget(job)}
            onAddNewJob={() => setJobModalTarget("new")}
            onUpdateMonthlyGoal={(goal) => {
              commitPlannerChange((prev) => ({
                ...prev,
                settings: { ...prev.settings, monthlyIncomeGoal: goal },
              }));
              showToast("Đã cập nhật mục tiêu tháng");
            }}
            onAddSubject={handleAddSubject}
            onDeleteSubject={handleDeleteSubject}
            onCommitSubjectDays={handleCommitSubjectDays}
            onOpenCopyModal={() => setShowCopyModal(true)}
            isHydrated={isHydrated}
          />
        </div>
      </main>

      {/* MOBILE ONE-HANDED WORKSPACE (< 1024px) */}
      <main className="lg:hidden">
        {mobileTab === "schedule" ? (
          <MobileScheduleView
            weekDaysMeta={weekDaysMeta}
            weekEvents={weekEvents}
            jobs={state.jobs}
            settings={state.settings}
            selectedDay={selectedDay}
            onSelectDay={setUserSelectedDay}
            onEditEvent={(ev, isoDate) => {
              const originalEvent =
                state.events.find((item) => item.id === ev.id) ?? ev;
              setEventDraft({
                editingEvent: originalEvent,
                occurrenceIsoDate: isoDate,
                dayOfWeek: originalEvent.dayOfWeek,
                startTime: ev.startTime,
                endTime: ev.endTime,
                category: originalEvent.category,
              });
            }}
            onQuickAddInSlot={(day, startTime, endTime) =>
              setEventDraft({
                dayOfWeek: day,
                startTime,
                endTime,
                category: "work",
              })
            }
            onOpenSubjectsModal={() => setShowSubjectsModal(true)}
            onOpenCopyModal={() => setShowCopyModal(true)}
            isHydrated={isHydrated}
          />
        ) : (
          <MobileIncomeJobsView
            allEvents={state.events}
            jobs={state.jobs}
            monthlyIncomeGoal={state.settings.monthlyIncomeGoal}
            onUpdateMonthlyGoal={(goal) => {
              commitPlannerChange((prev) => ({
                ...prev,
                settings: { ...prev.settings, monthlyIncomeGoal: goal },
              }));
              showToast("Đã cập nhật mục tiêu tháng");
            }}
            onEditJob={(job) => setJobModalTarget(job)}
            onAddNewJob={() => setJobModalTarget("new")}
            onToggleOccurrenceCompleted={handleToggleOccurrenceCompleted}
            onEditShiftEvent={(ev, isoDate) => {
              const originalEvent =
                state.events.find((item) => item.id === ev.id) ?? ev;
              setEventDraft({
                editingEvent: originalEvent,
                occurrenceIsoDate: isoDate,
                dayOfWeek: originalEvent.dayOfWeek,
                startTime: ev.startTime,
                endTime: ev.endTime,
                category: originalEvent.category,
              });
            }}
            isHydrated={isHydrated}
          />
        )}

        <MobileBottomBar
          activeTab={mobileTab}
          onChangeTab={setMobileTab}
          weekIncomeTotal={weekWorkSummary.totalIncome}
          onQuickAdd={() =>
            setEventDraft({
              dayOfWeek: selectedDay,
              startTime: "08:00",
              endTime: "12:00",
              category: "work",
            })
          }
          isHydrated={isHydrated}
        />
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 inset-x-0 z-50 pointer-events-none flex justify-center px-4">
          <div className="rounded-2xl bg-[#231F20] px-4 py-2.5 text-xs font-bold text-[#FFFDF9] shadow-lg border border-orange-200/30">
            {toast}
          </div>
        </div>
      )}

      {/* Modals */}
      {eventDraft && (
        <EventShiftModal
          initial={eventDraft}
          activeWeekKey={activeWeekKey}
          otherWeekKey={otherWeekKey}
          allEvents={state.events}
          jobs={state.jobs}
          subjects={state.subjects}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onOpenJobsModal={() => setJobModalTarget(state.jobs[0] ?? "new")}
          onClose={() => setEventDraft(null)}
        />
      )}

      {jobModalTarget !== null && (
        <JobColumnModal
          job={jobModalTarget === "new" ? null : jobModalTarget}
          canDelete={state.jobs.length > 1}
          onSaveJob={handleSaveJob}
          onDeleteJob={handleDeleteJob}
          onClose={() => setJobModalTarget(null)}
        />
      )}

      {showSubjectsModal && (
        <SubjectsModal
          subjects={state.subjects}
          onAddSubject={handleAddSubject}
          onDeleteSubject={handleDeleteSubject}
          onCommitSubjectToDays={handleCommitSubjectDays}
          onClose={() => setShowSubjectsModal(false)}
        />
      )}

      {showCopyModal && (
        <CopyScheduleModal
          weekEvents={weekEvents}
          jobs={state.jobs}
          subjects={state.subjects}
          weekDaysMeta={weekDaysMeta}
          weekTitle={weekTitle}
          onCopied={(msg) => showToast(msg)}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  );
}
