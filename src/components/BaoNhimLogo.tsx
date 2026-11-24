interface BaoNhimLogoProps {
  className?: string;
}

export function BaoNhimLogo({ className = "h-10 w-10" }: BaoNhimLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Plump steamed bun outer base */}
      <circle
        cx="32"
        cy="33"
        r="27"
        fill="#FFFDF9"
        stroke="#231F20"
        strokeWidth="3"
      />
      {/* Swirl orange segments (Bánh Bao Nhím / Hedgehog Orange-Cream Swirl) */}
      <path
        d="M32 6C42.5 6 51.6 12 56.1 20.8C48.2 19.5 39.8 22.8 34.8 30.2C31.5 23.2 29.8 14.5 32 6Z"
        fill="#FF7A00"
      />
      <path
        d="M58.5 38.2C56.3 49.5 47.4 58.2 35.8 59.8C36.8 51.6 33.4 43.2 26.5 38.4C35.2 35.2 47.4 35.2 58.5 38.2Z"
        fill="#FF7A00"
      />
      <path
        d="M7.5 44.2C4.2 35.2 5.4 24.8 11.4 16.8C16.2 23.5 23.6 28.4 31.8 29.8C24.2 36.2 15.8 41.4 7.5 44.2Z"
        fill="#FF7A00"
      />
      {/* Crisp ceramic swirl pleat lines */}
      <path
        d="M32 32C36 22 44 17 55 19"
        stroke="#231F20"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 32C41 35 49 36 58 38"
        stroke="#231F20"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 32C28 42 32 51 36 59"
        stroke="#231F20"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 32C23 36 15 40 8 44"
        stroke="#231F20"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 32C24 26 17 22 11 17"
        stroke="#231F20"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M32 32C30 22 30 14 32 6"
        stroke="#231F20"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Center bun knot + cute highlight */}
      <circle
        cx="32"
        cy="32"
        r="5.5"
        fill="#FFFDF9"
        stroke="#231F20"
        strokeWidth="2.5"
      />
      <circle cx="32" cy="32" r="2.2" fill="#FF7A00" />
    </svg>
  );
}

