import Image from "next/image";

interface BaoNhimLogoProps {
  className?: string;
}

export function BaoNhimLogo({ className = "h-11 w-11" }: BaoNhimLogoProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-orange-200/80 shadow-2xs shrink-0 ${className}`}
    >
      <Image
        src="/app-logo.jpg"
        alt="Logo Bánh Bao Nhím"
        fill
        sizes="48px"
        className="object-cover"
        priority
      />
    </div>
  );
}
