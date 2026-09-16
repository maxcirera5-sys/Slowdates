'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarHeart, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { venueById } from '@/data/venues';
import type { DateState, Proposal, User } from '@/lib/types';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

const TABS: { key: 'upcoming' | 'pending' | 'history'; label: string; states: DateState[] }[] = [
  { key: 'upcoming', label: 'Upcoming', states: ['confirmed'] },
  {
    key: 'pending',
    label: 'Pending',
    states: ['mutual_interest', 'selecting_times', 'awaiting_time_response', 'selecting_venue'],
  },
  { key: 'history', label: 'History', states: ['completed', 'cancelled', 'declined', 'expired'] },
];

export default function DatesPage() {
  const [tab, setTab] = useState<'upcoming' | 'pending' | 'history'>('upcoming');
  const candidates = useDemoStore((s) => s.candidates);
  const proposals = useDemoStore((s) => s.proposals);

  const activeTab = TABS.find((t) => t.key === tab)!;
  const items = proposals.filter((p) => activeTab.states.includes(p.state));

  return (
    <div className="animate-fade-in space-y-5">
      <SectionHeader eyebrow="Your dates" title="Dates" subtitle="Where each connection stands." />

      <div role="tablist" aria-label="Date sections" className="flex gap-1 rounded-full bg-elevated p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
              tab === t.key ? 'bg-brand-gradient text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart className="h-6 w-6" />}
          title={`No ${activeTab.label.toLowerCase()} dates`}
          description={
            tab === 'upcoming'
              ? 'Confirmed dates will appear here.'
              : tab === 'pending'
                ? 'Dates being arranged will appear here.'
                : 'Your past dates will appear here.'
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((p) => {
            const candidate = candidates.find((c) => c.id === p.candidateId);
            if (!candidate) return null;
            return <DateRow key={p.id} proposal={p} candidate={candidate} />;
          })}
        </ul>
      )}
    </div>
  );
}

function DateRow({ proposal, candidate }: { proposal: Proposal; candidate: User }) {
  const primary = candidate.photos.find((p) => p.isPrimary) ?? candidate.photos[0];
  const venue = proposal.venueId ? venueById(proposal.venueId) : undefined;
  let context = '';
  if (proposal.state === 'confirmed' && proposal.selectedTime) {
    context = `${formatDate(proposal.selectedTime.start)} · ${formatTime(proposal.selectedTime.start)}${venue ? ` · ${venue.name}` : ''}`;
  } else if (proposal.state === 'awaiting_time_response') {
    context =
      proposal.timeProposedBy === 'them' ? 'They proposed times — your move' : 'Waiting for their reply';
  } else if (proposal.state === 'mutual_interest') {
    context = 'Mutual interest — pick times';
  } else if (proposal.state === 'selecting_venue') {
    context = 'Choosing a venue';
  }

  return (
    <li>
      <Link
        href={`/app/dates/${proposal.id}`}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-elevated"
      >
        <ProfileAvatar name={candidate.displayName} src={primary?.url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{candidate.displayName}</p>
            <StatusBadge state={proposal.state} />
          </div>
          {context ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{context}</p> : null}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
