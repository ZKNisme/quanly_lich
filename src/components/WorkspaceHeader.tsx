"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { BaoNhimLogo } from "@/components/BaoNhimLogo";
import { formatCurrencyVnd, formatHoursDecimal } from "@/lib/job-meta";

export type DbSyncStatus = "syncing" | "synced" | "offline";

interface WorkspaceHeaderProps {
  weekOffset: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToTodayWeek: () => void;
  weekTitle: string;
  weekShiftCount: number;
  weekPaidMinutes: number;
  weekProjectedIncome: number;
  suggestedFreeSessions: string[];
  copiedSchedule: boolean;
  onCopySchedule: () => void;
  onOpenBackupModal: () => void;
  resettableCount: number;
  dbSyncStatus: DbSyncStatus;
  onRetrySync: () => void;
  isHydrated: boolean;
}

export function WorkspaceHeader({
  weekOffset,
  onPrevWeek,
  onNextWeek,
  onResetToTodayWeek,
  weekTitle,
  weekShiftCount,
  weekPaidMinutes,
  weekProjectedIncome,
  suggestedFreeSessions,
  copiedSchedule,
  onCopySchedule,
  onOpenBackupModal,
  resettableCount,
  dbSyncStatus,
  onRetrySync,
  isHydrated,
}: WorkspaceHeaderProps) {
  const weekContextLabel =
    weekOffset === 0
      ? "Tuần này"
      : weekOffset === 1
        ? "Tuần sau"
        : weekOffset === -1
          ? "Tuần trước"
          : weekTitle;

  return (
    <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-5 pb-3 space-y-3">
      {/* Row 1: Bánh Bao Nhím Logo + Title + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <BaoNhimLogo className="h-11 w-11 sm:h-12 sm:w-12 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#231F20]">
                Lịch Tuần & Ví Bánh Bao
              </h1>
              {dbSyncStatus === "offline" ? (
                <button
                  type="button"
                  onClick={onRetrySync}
                  title="Bấm để đồng bộ lại với Neon PostgreSQL"
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Lưu cục bộ (Thử lại)
                </button>
              ) : dbSyncStatus === "syncing" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A00] animate-pulse" />
                  Đang đồng bộ Neon...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C3E5AE] bg-[#ECF7E4] px-2.5 py-0.5 text-[11px] font-bold text-[#276723]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#276723]" />
                  Đã lưu Neon DB
                </span>
              )}
            </div>
          </div>

          {/* Mobile quick Copy CTA */}
          <button
            type="button"
            onClick={onCopySchedule}
            className="lg:hidden inline-flex items-center gap-1.5 rounded-2xl bg-[#231F20] px-3.5 py-2 text-xs font-bold text-[#FFFDF9] hover:bg-black active:scale-95 transition"
          >
            {copiedSchedule ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#FF7A00]" />
                <span>Đã copy</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy lịch chốt</span>
              </>
            )}
          </button>
        </div>

        {/* Right Control Cluster */}
        <div className="flex items-center justify-between lg:justify-end flex-wrap gap-2">
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
                  Hôm nay
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

          {/* Utility + Primary Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenBackupModal}
              title="Reset tuần mới / Sao lưu JSON"
              className="inline-flex items-center gap-1 rounded-2xl border border-orange-200/70 bg-[#FFFDF9] px-3 py-2 text-xs font-bold text-[#231F20] hover:bg-orange-50/70 transition"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#FF7A00]" />
              <span className="hidden xl:inline">Reset tuần mới</span>
              {isHydrated && resettableCount > 0 && (
                <span className="rounded-full bg-orange-100 px-1.5 text-[10px] font-bold text-orange-800 tabular-nums">
                  {resettableCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenBackupModal}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-orange-200/70 bg-[#FFFDF9] px-3 py-2 text-xs font-bold text-[#231F20] hover:bg-orange-50/70 transition"
            >
              <Database className="h-3.5 w-3.5 text-[#FF7A00]" />
              <span className="hidden sm:inline">Sao lưu JSON</span>
            </button>

            <button
              type="button"
              onClick={onCopySchedule}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-2xl bg-[#231F20] px-4 py-2 text-xs font-bold text-[#FFFDF9] hover:bg-black active:scale-95 transition"
            >
              {copiedSchedule ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#FF7A00]" />
                  <span>Đã copy lịch!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy lịch chốt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Warm Cream Summary Banner with Dashed Orange Border */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-[#FF7A00]/60 bg-[#FFFDF9] px-4 py-2.5 text-xs text-[#231F20]">
        <Sparkles className="h-4 w-4 shrink-0 text-[#FF7A00]" />
        <p className="leading-relaxed">
          <strong className="font-extrabold">{weekContextLabel}:</strong> Đã
          chốt{" "}
          <strong className="tabular-nums text-[#FF7A00]">
            {weekShiftCount} ca
          </strong>{" "}
          (
          <span className="tabular-nums font-semibold">
            {formatHoursDecimal(weekPaidMinutes)}
          </span>
          ) • Dự kiến thu nhập:{" "}
          <strong className="text-[#231F20] tabular-nums underline decoration-[#FF7A00]/60 decoration-2 underline-offset-2">
            {isHydrated ? formatCurrencyVnd(weekProjectedIncome) : "0đ"}
          </strong>{" "}
          • Khung giờ trống đẹp:{" "}
          <strong className="text-[#276723]">
            {suggestedFreeSessions.length > 0
              ? suggestedFreeSessions.join(", ")
              : "Đã kín lịch"}
          </strong>
        </p>
      </div>
    </header>
  );
}
