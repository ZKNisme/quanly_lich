"use client";

import { useState } from "react";
import { BookOpen, Plus, Repeat, Trash2, X } from "lucide-react";
import { DAY_SHORT_LABELS, isValidTimeRange } from "@/lib/date-utils";
import type { DayOfWeek, RepeatMode, SubjectPreset } from "@/types/schedule";

interface SubjectsModalProps {
  subjects: SubjectPreset[];
  onAddSubject: (subject: Omit<SubjectPreset, "id">) => SubjectPreset;
  onDeleteSubject: (subjectId: string) => void;
  onCommitSubjectToDays: (subject: SubjectPreset, days: DayOfWeek[]) => void;
  onClose: () => void;
}

export function SubjectsModal({
  subjects,
  onAddSubject,
  onDeleteSubject,
  onCommitSubjectToDays,
  onClose,
}: SubjectsModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id ?? ""
  );
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [adding, setAdding] = useState(subjects.length === 0);

  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("17:30");
  const [endTime, setEndTime] = useState("19:00");
  const [note, setNote] = useState("");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("weekly");
  const [repeatStartDate, setRepeatStartDate] = useState("");
  const [repeatEndDate, setRepeatEndDate] = useState("");

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0] ?? null;

  const repeatDateValid =
    repeatMode !== "weekly" ||
    !repeatStartDate ||
    !repeatEndDate ||
    repeatEndDate >= repeatStartDate;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidTimeRange(startTime, endTime) || !repeatDateValid)
      return;
    const created = onAddSubject({
      name: name.trim(),
      startTime,
      endTime,
      note: note.trim(),
      repeatMode,
      repeatStartDate:
        repeatMode === "weekly" && repeatStartDate ? repeatStartDate : null,
      repeatEndDate:
        repeatMode === "weekly" && repeatEndDate ? repeatEndDate : null,
    });
    setSelectedSubjectId(created.id);
    setAdding(false);
    setName("");
    setNote("");
    setRepeatStartDate("");
    setRepeatEndDate("");
  };

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
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-sky-50 text-sky-800 border border-sky-200/70">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#231F20]">
                Môn học & Lịch thêm nhanh
              </h2>
              <p className="text-[11px] text-[#231F20]/60">
                Lưu môn học để bấm 1 chạm xếp vào nhiều ngày
              </p>
            </div>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-[#231F20]/60">
              Danh sách môn ({subjects.length})
            </span>
            <button
              type="button"
              onClick={() => setAdding((p) => !p)}
              className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{adding ? "Đóng form" : "Thêm môn mới"}</span>
            </button>
          </div>

          {adding && (
            <form
              onSubmit={handleCreate}
              className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-3 space-y-2.5"
            >
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên môn (VD: Học moc, Tiếng Anh...)"
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-[#231F20] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#231F20]"
                />
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-[#231F20]"
                />
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Phòng học / Ghi chú (tùy chọn)"
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs text-[#231F20]"
              />
              <label className="flex items-center gap-2 text-xs font-semibold text-[#231F20] cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatMode === "weekly"}
                  onChange={(e) =>
                    setRepeatMode(e.target.checked ? "weekly" : "once")
                  }
                  className="rounded border-sky-300"
                />
                <span>Lặp cố định hàng tuần</span>
              </label>
              {repeatMode === "weekly" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[10.5px] font-semibold text-[#231F20]/70 mb-0.5">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={repeatStartDate}
                      onChange={(e) => setRepeatStartDate(e.target.value)}
                      className="block w-full min-w-0 max-w-full appearance-none rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#231F20] tabular-nums"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[10.5px] font-semibold text-[#231F20]/70 mb-0.5">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      min={repeatStartDate || undefined}
                      value={repeatEndDate}
                      onChange={(e) => setRepeatEndDate(e.target.value)}
                      className="block w-full min-w-0 max-w-full appearance-none rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#231F20] tabular-nums"
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={
                  !name.trim() ||
                  !isValidTimeRange(startTime, endTime) ||
                  !repeatDateValid
                }
                className="w-full rounded-xl bg-[#231F20] py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                Lưu môn học
              </button>
            </form>
          )}

          <div className="space-y-1.5">
            {subjects.map((subj) => {
              const selected = activeSubject?.id === subj.id;
              return (
                <div
                  key={subj.id}
                  className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition ${
                    selected
                      ? "border-sky-400 bg-sky-50"
                      : "border-orange-200/70 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectId(subj.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#231F20] truncate">
                        {subj.name}
                      </span>
                      {subj.repeatMode === "weekly" && (
                        <Repeat className="h-3 w-3 text-sky-700 shrink-0" />
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] font-semibold text-sky-800 tabular-nums">
                      {subj.startTime} – {subj.endTime}
                      {subj.note ? ` • ${subj.note}` : ""}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSubject(subj.id)}
                    aria-label={`Xóa ${subj.name}`}
                    className="p-1.5 rounded-lg text-[#231F20]/40 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {activeSubject && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 space-y-2.5">
              <p className="text-xs font-bold text-sky-900">
                Chọn ngày xếp môn &ldquo;{activeSubject.name}&rdquo;:
              </p>
              <div className="grid grid-cols-7 gap-1">
                {DAY_SHORT_LABELS.map((label, idx) => {
                  const d = idx as DayOfWeek;
                  const active = selectedDays.includes(d);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
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
            </div>
          )}
        </div>

        <div className="border-t border-orange-100 bg-orange-50/35 px-4 py-3 shrink-0">
          <button
            type="button"
            disabled={!activeSubject || selectedDays.length === 0}
            onClick={() => {
              if (activeSubject && selectedDays.length > 0) {
                onCommitSubjectToDays(activeSubject, selectedDays);
                onClose();
              }
            }}
            className="w-full h-11 rounded-2xl bg-[#231F20] text-xs font-bold text-white hover:bg-black disabled:opacity-40 transition"
          >
            {selectedDays.length > 0 && activeSubject
              ? `Thêm "${activeSubject.name}" vào ${selectedDays.length} ngày`
              : "Chọn thứ để thêm nhanh vào lịch"}
          </button>
        </div>
      </div>
    </div>
  );
}

