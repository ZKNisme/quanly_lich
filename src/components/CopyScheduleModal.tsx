"use client";

import { useMemo, useState } from "react";
import { Briefcase, BookOpen, Check, Copy, User, X } from "lucide-react";
import {
  buildCustomCopyScheduleText,
  type CopyScheduleFilter,
} from "@/lib/schedule-engine";
import type {
  EventCategory,
  JobProfile,
  ScheduleEvent,
  SubjectPreset,
  WeekDayMeta,
} from "@/types/schedule";

interface CopyScheduleModalProps {
  weekEvents: ScheduleEvent[];
  jobs: JobProfile[];
  subjects: SubjectPreset[];
  weekDaysMeta: WeekDayMeta[];
  weekTitle: string;
  onCopied: (message: string) => void;
  onClose: () => void;
}

export function CopyScheduleModal({
  weekEvents,
  jobs,
  subjects,
  weekDaysMeta,
  weekTitle,
  onCopied,
  onClose,
}: CopyScheduleModalProps) {
  const defaultJobId = useMemo(() => {
    const firstActiveJob = jobs.find((job) =>
      weekEvents.some(
        (ev) =>
          ev.category === "work" &&
          (ev.jobId === job.id || (!ev.jobId && job.id === jobs[0]?.id))
      )
    );
    return firstActiveJob?.id ?? jobs[0]?.id ?? "all";
  }, [jobs, weekEvents]);

  const [category, setCategory] = useState<EventCategory>("work");
  const [selectedJobId, setSelectedJobId] = useState<string>(defaultJobId);
  const [selectedStudyTitle, setSelectedStudyTitle] = useState<string>("all");
  const [selectedPersonalTitle, setSelectedPersonalTitle] =
    useState<string>("all");
  const [use12h, setUse12h] = useState(true);
  const [copied, setCopied] = useState(false);

  const studyTitles = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const ev of weekEvents) {
      if (ev.category === "study" && ev.title.trim()) {
        const key = ev.title.trim();
        if (!seen.has(key.toLowerCase())) {
          seen.add(key.toLowerCase());
          list.push(key);
        }
      }
    }
    for (const subj of subjects) {
      const key = subj.name.trim();
      if (key && !seen.has(key.toLowerCase())) {
        seen.add(key.toLowerCase());
        list.push(key);
      }
    }
    return list;
  }, [weekEvents, subjects]);

  const personalTitles = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const ev of weekEvents) {
      if (ev.category === "personal" && ev.title.trim()) {
        const key = ev.title.trim();
        if (!seen.has(key.toLowerCase())) {
          seen.add(key.toLowerCase());
          list.push(key);
        }
      }
    }
    return list;
  }, [weekEvents]);

  const activeFilter: CopyScheduleFilter = useMemo(() => {
    if (category === "work") {
      return { category: "work", jobId: selectedJobId || "all" };
    }
    if (category === "study") {
      return { category: "study", title: selectedStudyTitle };
    }
    return { category: "personal", title: selectedPersonalTitle };
  }, [category, selectedJobId, selectedStudyTitle, selectedPersonalTitle]);

  const generatedText = useMemo(
    () =>
      buildCustomCopyScheduleText(
        weekEvents,
        jobs,
        weekDaysMeta,
        weekTitle,
        activeFilter,
        use12h
      ),
    [weekEvents, jobs, weekDaysMeta, weekTitle, activeFilter, use12h]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      onCopied("Đã copy lịch theo mẫu!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onCopied("Trình duyệt không cho phép copy tự động");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#231F20]/40 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-orange-200/70 bg-[#FFFDF9] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-orange-100 shrink-0">
          <div>
            <h2 className="text-sm font-extrabold text-[#231F20]">
              Copy lịch chốt ({weekTitle})
            </h2>
            <p className="text-[11px] text-[#231F20]/60">
              Chọn lịch làm, môn học hoặc lịch cá nhân để xuất gọn đẹp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-[#231F20]/70 hover:bg-orange-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Category Tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setCategory("work")}
              className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2 text-xs font-bold transition ${
                category === "work"
                  ? "border-orange-300 bg-orange-50 text-orange-800"
                  : "border-orange-200/70 bg-white text-[#231F20]/70"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span>Lịch làm</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory("study")}
              className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2 text-xs font-bold transition ${
                category === "study"
                  ? "border-sky-300 bg-sky-50 text-sky-800"
                  : "border-orange-200/70 bg-white text-[#231F20]/70"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Môn học</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory("personal")}
              className={`flex items-center justify-center gap-1.5 rounded-2xl border py-2 text-xs font-bold transition ${
                category === "personal"
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-orange-200/70 bg-white text-[#231F20]/70"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Cá nhân</span>
            </button>
          </div>

          {/* Sub-filter Pills */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-[#231F20]/70">
              {category === "work"
                ? "Chọn công việc:"
                : category === "study"
                  ? "Chọn môn học:"
                  : "Chọn lịch cá nhân:"}
            </span>

            {category === "work" && (
              <div className="flex flex-wrap gap-1.5">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      selectedJobId === job.id
                        ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                        : "border-orange-200/80 bg-white text-[#231F20]/80 hover:bg-orange-50/60"
                    }`}
                  >
                    {job.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedJobId("all")}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    selectedJobId === "all"
                      ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                      : "border-orange-200/80 bg-white text-[#231F20]/80 hover:bg-orange-50/60"
                  }`}
                >
                  Tất cả ca làm
                </button>
              </div>
            )}

            {category === "study" && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedStudyTitle("all")}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    selectedStudyTitle === "all"
                      ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                      : "border-sky-200 bg-white text-sky-900 hover:bg-sky-50"
                  }`}
                >
                  Tất cả môn
                </button>
                {studyTitles.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedStudyTitle(t)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      selectedStudyTitle === t
                        ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                        : "border-sky-200 bg-white text-sky-900 hover:bg-sky-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {category === "personal" && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPersonalTitle("all")}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    selectedPersonalTitle === "all"
                      ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                      : "border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                  }`}
                >
                  Tất cả lịch cá nhân
                </button>
                {personalTitles.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedPersonalTitle(t)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      selectedPersonalTitle === t
                        ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                        : "border-rose-200 bg-white text-rose-800 hover:bg-rose-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hour Format Toggle + Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#231F20]/70">
                Xem trước nội dung copy
              </span>
              <div className="inline-flex rounded-xl border border-orange-200/70 bg-orange-50/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setUse12h(true)}
                  className={`rounded-lg px-2.5 py-0.5 text-[10.5px] font-bold transition ${
                    use12h
                      ? "bg-[#231F20] text-[#FFFDF9]"
                      : "text-[#231F20]/65"
                  }`}
                >
                  12h
                </button>
                <button
                  type="button"
                  onClick={() => setUse12h(false)}
                  className={`rounded-lg px-2.5 py-0.5 text-[10.5px] font-bold transition ${
                    !use12h
                      ? "bg-[#231F20] text-[#FFFDF9]"
                      : "text-[#231F20]/65"
                  }`}
                >
                  24h
                </button>
              </div>
            </div>

            <pre className="w-full rounded-2xl border border-orange-200/80 bg-white p-3.5 font-sans text-xs leading-relaxed text-[#231F20] whitespace-pre-wrap select-all">
              {generatedText}
            </pre>
          </div>
        </div>

        <div className="border-t border-orange-100 bg-orange-50/35 px-4 py-3 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-2xl border border-orange-200/80 bg-white text-xs font-bold text-[#231F20]/75"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#231F20] text-xs font-bold text-[#FFFDF9] hover:bg-black active:scale-[0.99] transition"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-[#FF7A00]" />
                <span>Đã copy lịch!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy lịch này</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

