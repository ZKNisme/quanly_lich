"use client";

import { useState } from "react";
import { Briefcase, Check, Trash2, X } from "lucide-react";
import { JOB_COLOR_OPTIONS, JOB_COLOR_STYLES } from "@/lib/job-meta";
import { DEFAULT_SESSION_TIMES } from "@/lib/sample-data";
import type {
  JobBadgeColor,
  JobProfile,
  PayType,
} from "@/types/schedule";

interface JobColumnModalProps {
  job: JobProfile | null;
  canDelete: boolean;
  onSaveJob: (payload: Omit<JobProfile, "id"> & { id?: string }) => void;
  onDeleteJob: (jobId: string) => void;
  onClose: () => void;
}

export function JobColumnModal({
  job,
  canDelete,
  onSaveJob,
  onDeleteJob,
  onClose,
}: JobColumnModalProps) {
  const isNew = job === null;

  const [name, setName] = useState(job?.name ?? "");
  const [color, setColor] = useState<JobBadgeColor>(job?.color ?? "orange");
  const [payType, setPayType] = useState<PayType>(job?.payType ?? "hourly");
  const [rate, setRate] = useState(String(job?.rate ?? 30000));
  const [allowance, setAllowance] = useState(
    String(job?.allowancePerShift ?? 0)
  );
  const [weekendMultiplier, setWeekendMultiplier] = useState(
    String(job?.weekendMultiplier ?? 1)
  );
  const [holidayMultiplier, setHolidayMultiplier] = useState(
    String(job?.holidayMultiplier ?? 4)
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveJob({
      id: job?.id,
      name: name.trim(),
      color,
      payType,
      rate: Math.max(0, Math.round(Number(rate) || 0)),
      allowancePerShift: Math.max(0, Math.round(Number(allowance) || 0)),
      weekendMultiplier: Math.max(1, Number(weekendMultiplier) || 1),
      holidayMultiplier: Math.max(1, Number(holidayMultiplier) || 1),
      defaultSessionTimes: job?.defaultSessionTimes ?? {
        morning: { ...DEFAULT_SESSION_TIMES.morning },
        afternoon: { ...DEFAULT_SESSION_TIMES.afternoon },
        evening: { ...DEFAULT_SESSION_TIMES.evening },
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#231F20]/40 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-orange-200/70 bg-[#FFFDF9] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50 text-[#FF7A00] border border-orange-200">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#231F20]">
                {isNew ? "Thêm công việc mới" : "Cấu hình công việc & Lương"}
              </h2>
              <p className="text-[11px] text-[#231F20]/60">
                Đặt đơn giá, phụ cấp & hệ số cuối tuần
              </p>
            </div>
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

        <form
          id="job-column-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#231F20]">
              Tên công việc
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Texas, LHP, Dạy..."
              className="w-full rounded-2xl border border-orange-200/70 bg-white px-3.5 py-2 text-sm font-semibold text-[#231F20] focus:border-[#FF7A00] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#231F20]">
              Màu vị Bánh Bao
            </span>
            <div className="flex items-center gap-2">
              {JOB_COLOR_OPTIONS.map((c) => {
                const st = JOB_COLOR_STYLES[c];
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={st.label}
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${st.dot} transition ${
                      active
                        ? "ring-2 ring-offset-2 ring-[#231F20] scale-110"
                        : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-[#231F20]">
              Cách tính lương
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayType("hourly")}
                className={`rounded-2xl border py-2 text-xs font-bold transition ${
                  payType === "hourly"
                    ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                    : "border-orange-200/70 bg-white text-[#231F20]/70 hover:bg-orange-50/40"
                }`}
              >
                Theo giờ (VNĐ/giờ)
              </button>
              <button
                type="button"
                onClick={() => setPayType("shift")}
                className={`rounded-2xl border py-2 text-xs font-bold transition ${
                  payType === "shift"
                    ? "border-[#231F20] bg-[#231F20] text-[#FFFDF9]"
                    : "border-orange-200/70 bg-white text-[#231F20]/70 hover:bg-orange-50/40"
                }`}
              >
                Trọn gói ca (VNĐ/ca)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#231F20]">
                {payType === "hourly" ? "Đơn giá / giờ (đ)" : "Trọn gói / ca (đ)"}
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-sm font-bold text-[#231F20]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#231F20]">
                Phụ cấp / ca (đ)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                className="w-full rounded-2xl border border-orange-200/70 bg-white px-3 py-2 font-mono text-sm font-bold text-[#231F20]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#231F20]">
                Hệ số T7 / CN
              </label>
              <div className="flex gap-1">
                {["1", "1.5", "2"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWeekendMultiplier(m)}
                    className={`flex-1 rounded-xl border py-1.5 text-xs font-bold ${
                      weekendMultiplier === m
                        ? "border-amber-400 bg-amber-50 text-amber-800"
                        : "border-orange-200/70 bg-white text-[#231F20]/70"
                    }`}
                  >
                    x{m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#231F20]">
                Hệ số Ngày lễ
              </label>
              <div className="flex gap-1">
                {["1.5", "2", "3", "4"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setHolidayMultiplier(m)}
                    className={`flex-1 rounded-xl border py-1.5 text-xs font-bold ${
                      holidayMultiplier === m
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-orange-200/70 bg-white text-[#231F20]/70"
                    }`}
                  >
                    x{m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        <div className="border-t border-orange-100 bg-orange-50/35 px-4 py-3 flex items-center gap-2 shrink-0">
          {!isNew && canDelete && job && (
            <>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Xóa công việc"
                  className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeleteJob(job.id)}
                  className="h-10 rounded-2xl bg-rose-600 px-3 text-xs font-bold text-white"
                >
                  Xóa ngay
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-2xl border border-orange-200/80 bg-white text-xs font-bold text-[#231F20]/75"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="job-column-form"
            disabled={!name.trim()}
            className="flex-1 h-10 rounded-2xl bg-[#FF7A00] text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 transition"
          >
            {isNew ? "Thêm công việc" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
