export type Mood = "idle" | "thinking" | "happy";

/**
 * Junior: a small cream legal brief with a folded top right corner, two dot
 * eyes, periwinkle cheeks and white barrister bands.
 */
export function Mascot({ mood = "idle", size = 72, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const label =
    mood === "thinking" ? "Junior is thinking" : mood === "happy" ? "Junior is happy" : "Junior";
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      role="img"
      aria-label={label}
      className={`${mood === "thinking" ? "junior-thinking" : ""} ${className}`}
    >
      {/* The brief */}
      <path
        d="M28 8 H80 L102 30 V122 Q102 132 92 132 H28 Q18 132 18 122 V18 Q18 8 28 8 Z"
        fill="#F1EBDE"
        stroke="#171B28"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M80 8 V24 Q80 30 86 30 H102 Z"
        fill="#DCD3C0"
        stroke="#171B28"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Eyes */}
      {mood === "happy" ? (
        <g fill="none" stroke="#171B28" strokeWidth="3.5" strokeLinecap="round">
          <path d="M41 63 Q47 55 53 63" />
          <path d="M67 63 Q73 55 79 63" />
        </g>
      ) : (
        <g fill="#171B28">
          <circle className={mood === "idle" ? "junior-eye" : undefined} cx="47" cy={mood === "thinking" ? 57 : 61} r="4.5" />
          <circle className={mood === "idle" ? "junior-eye" : undefined} cx="73" cy={mood === "thinking" ? 57 : 61} r="4.5" />
        </g>
      )}

      {/* Cheeks */}
      <ellipse cx="38" cy="74" rx="6.5" ry="4" fill="#A8C0EA" />
      <ellipse cx="82" cy="74" rx="6.5" ry="4" fill="#A8C0EA" />

      {/* Barrister bands */}
      <g stroke="#171B28" strokeWidth="2.5" strokeLinejoin="round" fill="#FFFFFF">
        <path d="M53 90 H59.2 V114 Q59.2 117 56.2 117 H51.6 Q48.8 117 49.2 114 Z" />
        <path d="M60.8 90 H67 L70.8 114 Q71.2 117 68.4 117 H63.8 Q60.8 117 60.8 114 Z" />
      </g>
    </svg>
  );
}

/** Junior with a short status line beside it. */
export function MascotMessage({
  mood = "idle",
  title,
  children,
  size = 64,
}: {
  mood?: Mood;
  title: string;
  children?: React.ReactNode;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-4" role="status">
      <Mascot mood={mood} size={size} className="shrink-0" />
      <div>
        <p className="font-serif text-xl leading-snug text-ink">{title}</p>
        {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
      </div>
    </div>
  );
}
