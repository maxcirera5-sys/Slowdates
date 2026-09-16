import { cn } from '@/lib/utils';

interface CompatibilityRingProps {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function CompatibilityRing({
  value,
  size = 72,
  strokeWidth = 7,
  className,
  showLabel = true,
}: CompatibilityRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const gid = `ring-${size}`;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Compatibility ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C4DFF" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--elevated))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,0.61,0.36,1)' }}
        />
      </svg>
      {showLabel ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none tabular-nums">{Math.round(clamped)}</span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            match
          </span>
        </div>
      ) : null}
    </div>
  );
}
