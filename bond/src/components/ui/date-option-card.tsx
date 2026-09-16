import { Check, Clock } from 'lucide-react';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { TimeOption } from '@/lib/types';

interface DateOptionCardProps {
  option: TimeOption;
  selected?: boolean;
  onSelect?: () => void;
  as?: 'button' | 'div';
}

export function DateOptionCard({ option, selected, onSelect, as = 'button' }: DateOptionCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-primary-light">
          <Clock className="h-4 w-4" aria-hidden />
        </div>
        <div className="text-left">
          <p className="font-semibold capitalize">{formatDate(option.start)}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(option.start)} · about {Math.round(option.durationMins / 60)}h
          </p>
        </div>
      </div>
      {selected ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground">
          <Check className="h-4 w-4" aria-hidden />
        </span>
      ) : null}
    </>
  );

  const className = cn(
    'flex w-full items-center justify-between rounded-md border p-3 text-sm transition-colors',
    selected ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-elevated',
  );

  if (as === 'div') return <div className={className}>{content}</div>;
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={className}>
      {content}
    </button>
  );
}
