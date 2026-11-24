"use client";

import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toLocalIsoDate } from "@/lib/date-utils";
import {
  serializePlannerBackup,
  validateAndParseState,
} from "@/lib/storage";
import type { PlannerState } from "@/types/schedule";

interface BackupResetModalProps {
  state: PlannerState;
  weekTitle: string;
  weekKey: string;
  onReplaceState: (next: PlannerState, message: string) => void;
  onResetCurrentWeek: (includeWeeklyShifts: boolean) => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
  onClose: () => void;
}

export function BackupResetModal({
  state,
  weekTitle,
  weekKey,
  onReplaceState,
  onResetCurrentWeek,
  onLoadSampleData,
  onClearAllData,
  onClose,
}: BackupResetModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");
  const [copied, setCopied] = useState(false);
  const [includeWeeklyShifts, setIncludeWeeklyShifts] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const onceCount = state.events.filter(
    (ev) => ev.repeatMode === "once" && ev.weekKey === weekKey
  ).length;
  const weeklyWorkCount = state.events.filter(
    (ev) => ev.repeatMode === "weekly" && ev.category === "work"
  ).length;

  const handleExportFile = () => {
    const json = serializePlannerBackup(state);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `banh-bao-nhim-backup-${toLocalIsoDate(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = async () => {
    const json = serializePlannerBackup(state);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setPasteText(json);
      setFeedback({
        type: "error",
        message: "Mã JSON đã hiển thị bên dưới để bạn sao chép thủ công.",
      });
    }
  };

  const handleImportText = () => {
    if (!pasteText.trim()) return;
    const result = validateAndParseState(pasteText);
    if (!result.ok) {
      setFeedback({ type: "error", message: result.error });
      return;
    }
    onReplaceState(
      result.state,
      `Đã khôi phục ${result.state.events.length} lịch & ${result.state.jobs.length} công việc!`
    );
    setPasteText("");
    setFeedback({
      type: "success",
      message: `Đã nhập thành công ${result.state.events.length} lịch trình.`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = validateAndParseState(text);
      if (!result.ok) {
        setFeedback({ type: "error", message: result.error });
        return;
      }
      onReplaceState(
        result.state,
        `Đã khôi phục dữ liệu từ file ${file.name}!`
      );
      setFeedback({
        type: "success",
        message: `Đã khôi phục thành công từ ${file.name}.`,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
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
          <h2 className="text-sm font-extrabold text-[#231F20]">
            Sao lưu JSON & Reset tuần mới
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

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Reset Week Section */}
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

          {/* Export / Import JSON */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#231F20]/60">
              Xuất / Nhập dữ liệu (Laptop ⇄ Điện thoại)
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportFile}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-orange-200/80 bg-white py-2.5 text-xs font-bold text-[#231F20] hover:bg-orange-50/50"
              >
                <Download className="h-4 w-4 text-[#FF7A00]" />
                <span>Xuất file JSON</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-orange-200/80 bg-white py-2.5 text-xs font-bold text-[#231F20] hover:bg-orange-50/50"
              >
                <Upload className="h-4 w-4 text-[#FF7A00]" />
                <span>Nhập file JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-[#C3E5AE] bg-[#ECF7E4] py-2.5 text-xs font-bold text-[#276723] hover:bg-[#dff1d2]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Đã copy mã sao lưu JSON!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy mã JSON (lịch, 3 jobs & thưởng/phạt)</span>
                </>
              )}
            </button>

            <textarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Dán mã JSON sao lưu vào đây để khôi phục..."
              className="w-full rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-[11px] text-[#231F20] placeholder:font-sans focus:border-[#FF7A00] focus:outline-none"
            />
            <button
              type="button"
              disabled={!pasteText.trim()}
              onClick={handleImportText}
              className="w-full rounded-2xl bg-[#231F20] py-2.5 text-xs font-bold text-[#FFFDF9] hover:bg-black disabled:opacity-40"
            >
              Khôi phục từ mã JSON
            </button>

            {feedback && (
              <p
                className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                  feedback.type === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-[#ECF7E4] text-[#276723]"
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>

          {/* Sample & Clear */}
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
