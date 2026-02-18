export function SwimHubTimerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {/* Stopwatch crown */}
      <rect x="232" y="68" width="48" height="26" rx="9" fill="currentColor" />
      {/* Stopwatch body */}
      <circle
        cx="256"
        cy="284"
        r="155"
        stroke="currentColor"
        strokeWidth="16"
      />
      {/* Clock hand */}
      <line
        x1="256"
        y1="284"
        x2="256"
        y2="156"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Wave line */}
      <path
        d="M108 284 Q158 244, 208 284 Q258 324, 308 284 Q358 244, 408 284"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="256" cy="284" r="10" fill="currentColor" />
    </svg>
  );
}
