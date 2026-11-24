import type { JobBadgeColor } from "@/types/schedule";

export interface JobColorStyle {
  id: JobBadgeColor;
  label: string;
  dot: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  pillHover: string;
  headerBg: string;
  headerText: string;
  barBg: string;
}

export const JOB_COLOR_STYLES: Record<JobBadgeColor, JobColorStyle> = {
  orange: {
    id: "orange",
    label: "Vị Bánh Bao Nhím (Cam kem)",
    dot: "bg-[#FF7A00]",
    pillBg: "bg-orange-50",
    pillText: "text-orange-800",
    pillBorder: "border-orange-200",
    pillHover: "hover:bg-orange-100/80",
    headerBg: "bg-orange-50/80",
    headerText: "text-orange-900",
    barBg: "bg-[#FF7A00]",
  },
  amber: {
    id: "amber",
    label: "Vị Trứng Muối (Vàng bơ)",
    dot: "bg-amber-500",
    pillBg: "bg-amber-50",
    pillText: "text-amber-800",
    pillBorder: "border-amber-200",
    pillHover: "hover:bg-amber-100/80",
    headerBg: "bg-amber-50/80",
    headerText: "text-amber-900",
    barBg: "bg-amber-500",
  },
  teal: {
    id: "teal",
    label: "Vị Trà Sữa Matcha (Xanh ngọc)",
    dot: "bg-teal-500",
    pillBg: "bg-teal-50",
    pillText: "text-teal-800",
    pillBorder: "border-teal-200",
    pillHover: "hover:bg-teal-100/80",
    headerBg: "bg-teal-50/80",
    headerText: "text-teal-900",
    barBg: "bg-teal-500",
  },
  sky: {
    id: "sky",
    label: "Xanh trời",
    dot: "bg-sky-500",
    pillBg: "bg-sky-50",
    pillText: "text-sky-800",
    pillBorder: "border-sky-200",
    pillHover: "hover:bg-sky-100/80",
    headerBg: "bg-sky-50/80",
    headerText: "text-sky-900",
    barBg: "bg-sky-500",
  },
  rose: {
    id: "rose",
    label: "Hồng dâu",
    dot: "bg-rose-500",
    pillBg: "bg-rose-50",
    pillText: "text-rose-700",
    pillBorder: "border-rose-200",
    pillHover: "hover:bg-rose-100/80",
    headerBg: "bg-rose-50/80",
    headerText: "text-rose-800",
    barBg: "bg-rose-500",
  },
  violet: {
    id: "violet",
    label: "Khoai môn (Tím nhạt)",
    dot: "bg-violet-500",
    pillBg: "bg-violet-50",
    pillText: "text-violet-700",
    pillBorder: "border-violet-200",
    pillHover: "hover:bg-violet-100/80",
    headerBg: "bg-violet-50/80",
    headerText: "text-violet-800",
    barBg: "bg-violet-500",
  },
  purple: {
    id: "purple",
    label: "Tím pastel",
    dot: "bg-purple-500",
    pillBg: "bg-purple-50",
    pillText: "text-purple-700",
    pillBorder: "border-purple-200",
    pillHover: "hover:bg-purple-100/80",
    headerBg: "bg-purple-50/80",
    headerText: "text-purple-800",
    barBg: "bg-purple-500",
  },
  emerald: {
    id: "emerald",
    label: "Cốm non",
    dot: "bg-emerald-500",
    pillBg: "bg-[#ECF7E4]",
    pillText: "text-[#276723]",
    pillBorder: "border-[#C3E5AE]",
    pillHover: "hover:bg-[#dff1d2]",
    headerBg: "bg-[#ECF7E4]",
    headerText: "text-[#276723]",
    barBg: "bg-emerald-500",
  },
};

export const JOB_COLOR_OPTIONS: JobBadgeColor[] = [
  "orange",
  "amber",
  "teal",
  "sky",
  "rose",
  "violet",
];

export function formatCurrencyVnd(amount: number): string {
  const rounded = Math.round(amount);
  return `${new Intl.NumberFormat("vi-VN").format(rounded)}đ`;
}

export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${m.toFixed(1).replace(/\.0$/, "")}tr`;
  }
  if (abs >= 1_000) {
    return `${Math.round(amount / 1_000)}k`;
  }
  return `${Math.round(amount)}đ`;
}

export function formatHoursDecimal(minutes: number): string {
  const safe = Math.max(0, minutes);
  const hours = safe / 60;
  return `${hours.toFixed(1).replace(/\.0$/, "")}h`;
}
