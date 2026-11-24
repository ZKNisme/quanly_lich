"use client";

import { useState } from "react";
import { RotateCcw, Trash2, X } from "lucide-react";
import type { ScheduleEvent } from "@/types/schedule";

interface ResetWeekModalProps {
  events: ScheduleEvent[];
  weekTitle: string;
  weekKey: string;
  onResetCurrentWeek: (includeWeeklyShifts: boolean) => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
  onClose: () => void;
}

export function ResetWeekModal({
  events,
  weekTitle,
  weekKey,
  onResetCurrentWeek,
  onLoadSampleData,
  onClearAllData,
  onClose,
}: ResetWeekModalProps) {
  const [includeWeeklyShifts, setIncludeWeeklyShifts] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const onceCount = events.filter(
    (ev) => ev.repeatMode === "once" && ev.weekKey === weekKey
  ).length;
  const weeklyWorkCount = events.filter(
    (ev) => ev.repeatMode === "weekly" && ev.category === "work"
  ).length;

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
            Reset tuần mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-[#231F20]/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#231F20]">
              <RotateCcw className="h-4 w-4 text-[#FF7A00]" />
              <span>Reset tuần ({weekTitle})</span>
            </div>
            <p className="text-xs text-[#231F20]/80">
              Giữ lại lịch học cố định hàng tuần, xóa{" "}
              <strong>{onceCount} lịch phát sinh / ca làm riêng tuần này</strong>.
            </p>
            {weeklyWorkCount > 0 && (
              <label className="flex items-center gap-2 text-xs font-semibold text-[#231F20] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWeeklyShifts}
                  onChange={(e) => setIncludeWeeklyShifts(e.target.checked)}
                  className="rounded border-orange-300"
                />
                <span>
                  Xóa cả {weeklyWorkCount} ca làm lặp cố định hàng tuần
                </span>
              </label>
            )}
            <button
              type="button"
              disabled={
                onceCount === 0 && (!includeWeeklyShifts || weeklyWorkCount === 0)
              }
              onClick={() => onResetCurrentWeek(includeWeeklyShifts)}
              className="w-full rounded-2xl bg-[#FF7A00] py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 transition"
            >
              Reset tuần này
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-orange-100">
            <button
              type="button"
              onClick={onLoadSampleData}
              className="rounded-2xl border border-orange-200/80 bg-white py-2.5 text-xs font-bold text-[#231F20] hover:bg-orange-50/50"
            >
              Nạp dữ liệu mẫu
            </button>
            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center justify-center gap-1 rounded-2xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa hết lịch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setConfirmClearAll(false);
                }}
                className="rounded-2xl bg-rose-600 py-2.5 text-xs font-bold text-white"
              >
                Xác nhận xóa hết!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

