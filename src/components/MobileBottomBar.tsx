"use client";

import { CalendarDays, Plus, Wallet } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/job-meta";

interface MobileBottomBarProps {
  activeTab: "schedule" | "income";
  onChangeTab: (tab: "schedule" | "income") => void;
  weekIncomeTotal: number;
  onQuickAdd: () => void;
  isHydrated: boolean;
}

export function MobileBottomBar({
  activeTab,
  onChangeTab,
  weekIncomeTotal,
  onQuickAdd,
  isHydrated,
}: MobileBottomBarProps) {
  return (
    <div className="lg:hidden">
      {/* Floating Circular Orange Quick Add (+) */}
      <button
        type="button"
        onClick={onQuickAdd}
        aria-label="Thêm lịch hoặc ca làm"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7A00] text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition border-2 border-[#FFFDF9]"
      >
        <Plus className="h-6 w-6 stroke-[2.75]" />
      </button>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Điều hướng điện thoại"
        className="fixed bottom-0 inset-x-0 z-30 border-t border-orange-200/70 bg-[#FFFDF9]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-2 gap-1.5 px-3 py-2">
          <button
            type="button"
            onClick={() => onChangeTab("schedule")}
            className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold transition ${
              activeTab === "schedule"
                ? "bg-[#231F20] text-[#FFFDF9]"
                : "text-[#231F20]/70 hover:bg-orange-50"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Lịch trình</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("income")}
            className={`flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold transition ${
              activeTab === "income"
                ? "bg-[#231F20] text-[#FFFDF9]"
                : "text-[#231F20]/70 hover:bg-orange-50"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Lương & 3 Jobs</span>
            {isHydrated && weekIncomeTotal > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  activeTab === "income"
                    ? "bg-[#FF7A00] text-white"
                    : "bg-[#ECF7E4] text-[#276723] border border-[#C3E5AE]"
                }`}
              >
                {formatCurrencyCompact(weekIncomeTotal)}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
