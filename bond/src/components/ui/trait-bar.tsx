import { cn } from '@/lib/utils';

interface TraitBarProps {
  label: string;
  value: number; // 0..100
  className?: string;
  emphasis?: boolean;
}

export function TraitBar({ label, value, className, emphasis }: TraitBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3', className)}>
      <span className={cn('text-sm', emphasis ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full bg-brand-gradient transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-right text-sm tabular-nums text-muted-foreground">{Math.round(clamped)}%</span>
    </div>
  );
}
