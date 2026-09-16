import { cn } from '@/lib/utils';
import type { DateState } from '@/lib/types';

const STATE_META: Record<DateState, { label: string; tone: string }> = {
  waiting_for_interest: { label: 'New proposal', tone: 'primary' },
  mutual_interest: { label: 'Mutual interest', tone: 'success' },
  selecting_times: { label: 'Choosing times', tone: 'warning' },
  awaiting_time_response: { label: 'Awaiting response', tone: 'warning' },
  selecting_venue: { label: 'Choosing venue', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  completed: { label: 'Completed', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'destructive' },
  declined: { label: 'Declined', tone: 'muted' },
  expired: { label: 'Expired', tone: 'muted' },
};

const TONES: Record<string, string> = {
  primary: 'bg-primary/15 text-primary-light',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
  muted: 'bg-elevated text-muted-foreground',
};

export function StatusBadge({ state, className }: { state: DateState; className?: string }) {
  const meta = STATE_META[state];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        TONES[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

export { STATE_META };
