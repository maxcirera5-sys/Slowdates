'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, PauseCircle } from 'lucide-react';
import { ProposalCard } from '@/components/proposal-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProposalCardSkeleton } from '@/components/ui/loading-skeleton';
import { SectionHeader } from '@/components/ui/section-header';
import { useDemoStore } from '@/store/demo-store';

export default function ProposalsPage() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const candidates = useDemoStore((s) => s.candidates);
  const proposals = useDemoStore((s) => s.proposals);
  const blockedIds = useDemoStore((s) => s.blockedIds);
  const showInterest = useDemoStore((s) => s.showInterest);
  const pass = useDemoStore((s) => s.pass);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  if (!me) return null;

  const active = proposals
    .filter((p) => p.state === 'waiting_for_interest' && !blockedIds.includes(p.candidateId))
    .slice(0, 3);

  return (
    <div className="animate-fade-in space-y-5">
      <SectionHeader
        eyebrow="For you"
        title="Your proposals"
        subtitle="A few people BOND believes you’re genuinely compatible with. No swiping."
      />

      {me.discoveryPaused ? (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <PauseCircle className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            Discovery is paused. New proposals won’t appear until you resume it in Settings.
          </span>
        </div>
      ) : null}

      {!ready ? (
        <div className="space-y-5">
          <ProposalCardSkeleton />
          <ProposalCardSkeleton />
        </div>
      ) : active.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="No active proposals"
          description="BOND curates a small set at a time. Check your Dates, or come back soon for new proposals."
          action={
            <Button variant="secondary" onClick={() => router.push('/app/dates')}>
              View your dates
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {active.map((p) => {
            const candidate = candidates.find((c) => c.id === p.candidateId);
            if (!candidate) return null;
            return (
              <ProposalCard
                key={p.id}
                proposal={p}
                candidate={candidate}
                me={me}
                onInterested={() => {
                  showInterest(p.id);
                  router.push(`/app/dates/${p.id}`);
                }}
                onPass={() => pass(p.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
