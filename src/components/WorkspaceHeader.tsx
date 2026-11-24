"use client";

import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { BaoNhimLogo } from "@/components/BaoNhimLogo";

interface WorkspaceHeaderProps {
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToTodayWeek: () => void;
  weekTitle: string;
  isHydrated: boolean;
}

export function WorkspaceHeader({
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onResetToTodayWeek,
  weekTitle,
  isHydrated,
}: WorkspaceHeaderProps) {
  return (
    <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-5 pb-3 space-y-3">
      {/* Row 1: Bánh Bao Nhím Logo + Title + Week Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BaoNhimLogo className="h-11 w-11 sm:h-12 sm:w-12 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#231F20]">
              Lịch Bánh Bao
            </h1>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Tải lại trang"
            title="Tải lại trang"
            className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-orange-200/70 bg-[#FFFDF9] text-[#231F20]/75 hover:bg-orange-50 hover:text-[#FF7A00] active:scale-95 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Right Control Cluster */}
        <div className="flex items-center justify-center lg:justify-end gap-2">
          {/* Week Switcher Pill */}
          <div className="inline-flex items-center gap-1 rounded-2xl border border-orange-200/70 bg-[#FFFDF9] p-1">
            <button
              type="button"
              onClick={onPrevWeek}
              className="inline-flex items-center gap-0.5 rounded-xl px-2.5 py-1 text-xs font-bold text-[#231F20]/75 hover:bg-orange-50 hover:text-[#231F20] transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trước</span>
            </button>

            <button
              type="button"
              onClick={onResetToTodayWeek}
              title={
                weekOffset === 0 ? "Đang xem tuần hiện tại" : "Bấm để về tuần này"
              }
              className="px-2 py-1 text-xs font-extrabold text-[#231F20] tabular-nums hover:bg-orange-50/60 rounded-xl transition flex items-center gap-1.5"
            >
              <span suppressHydrationWarning>
                {isHydrated ? weekTitle : "Tuần --/-- - --/--"}
              </span>
              {weekOffset === 0 && (
                <span className="rounded-lg bg-[#ECF7E4] px-1.5 py-0.5 text-[10px] font-bold text-[#276723] border border-[#C3E5AE]">
                  Hiện tại
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onNextWeek}
              className="inline-flex items-center gap-0.5 rounded-xl px-2.5 py-1 text-xs font-bold text-[#231F20]/75 hover:bg-orange-50 hover:text-[#231F20] transition"
            >
              <span className="hidden sm:inline">Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Tải lại trang"
            title="Tải lại trang"
            className="hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-orange-200/70 bg-[#FFFDF9] text-[#231F20]/75 hover:bg-orange-50 hover:text-[#FF7A00] active:scale-95 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
