'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Flag, HelpCircle, Info, Lightbulb, Sparkles, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompatibilityBreakdown } from '@/components/ui/compatibility-breakdown';
import { CompatibilityRing } from '@/components/ui/compatibility-ring';
import { ConfirmationSheet, Sheet } from '@/components/ui/sheet';
import { PhotoCarousel } from '@/components/ui/photo-carousel';
import { EmptyState } from '@/components/ui/empty-state';
import { venueById } from '@/data/venues';
import { ageFromDob, approxDistanceLabel, distanceKm } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

const INTENTION_LABEL: Record<string, string> = {
  long_term: 'Long-term relationship',
  long_term_open_to_short: 'Long-term, open to see',
  short_term_open_to_long: 'Short-term, open to more',
  friends_first: 'Friends first',
  still_figuring_out: 'Still figuring it out',
};

export default function ProposalDetailPage() {
  const router = useRouter();
  const { proposalId } = useParams<{ proposalId: string }>();
  const me = useDemoStore((s) => s.me);
  const candidates = useDemoStore((s) => s.candidates);
  const proposals = useDemoStore((s) => s.proposals);
  const showInterest = useDemoStore((s) => s.showInterest);
  const pass = useDemoStore((s) => s.pass);
  const block = useDemoStore((s) => s.block);

  const [scoreOpen, setScoreOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const proposal = proposals.find((p) => p.id === proposalId);
  const candidate = candidates.find((c) => c.id === proposal?.candidateId);

  if (!me || !proposal || !candidate) {
    return (
      <EmptyState
        title="Proposal not found"
        description="It may have expired or been removed."
        action={
          <Button variant="secondary" onClick={() => router.push('/app/proposals')}>
            Back to proposals
          </Button>
        }
      />
    );
  }

  const venueCategories = [
    ...new Set(
      candidate.favouriteVenueIds
        .map((id) => venueById(id)?.category)
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    ),
  ];
  const km = distanceKm(me, candidate);

  return (
    <div className="animate-fade-in space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-elevated hover:text-foreground"
          >
            <Flag className="h-3.5 w-3.5" /> Report
          </button>
          <button
            onClick={() => setBlockOpen(true)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-elevated hover:text-destructive"
          >
            <UserX className="h-3.5 w-3.5" /> Block
          </button>
        </div>
      </div>

      <PhotoCarousel photos={candidate.photos} name={candidate.displayName} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {candidate.displayName}, {ageFromDob(candidate.dob)}
          </h1>
          <p className="text-muted-foreground">{candidate.profession}</p>
          <p className="mt-1 text-sm text-muted-foreground">{approxDistanceLabel(km)} away</p>
        </div>
        <CompatibilityRing value={proposal.compatibility.total} size={76} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{candidate.intro}</p>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Interests</h2>
        <div className="flex flex-wrap gap-2">
          {candidate.interests.map((i) => (
            <span key={i} className="rounded-full bg-elevated px-3 py-1 text-xs text-foreground">
              {i}
            </span>
          ))}
        </div>
      </div>

      {venueCategories.length ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Favourite venue types</h2>
          <div className="flex flex-wrap gap-2">
            {venueCategories.map((c) => (
              <span key={c} className="rounded-full bg-elevated px-3 py-1 text-xs capitalize text-foreground">
                {c.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-1 pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-light">
            <Sparkles className="h-4 w-4" /> AI profile summary
          </div>
          <p className="text-sm text-muted-foreground">{candidate.aiProfile?.summary}</p>
          <p className="pt-2 text-sm">
            <span className="text-muted-foreground">Looking for: </span>
            {INTENTION_LABEL[candidate.preferences.intention]}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Compatibility</h2>
            <button
              onClick={() => setScoreOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-primary-light hover:underline"
            >
              <HelpCircle className="h-3.5 w-3.5" /> How was this calculated?
            </button>
          </div>
          <CompatibilityBreakdown categories={proposal.compatibility.categories} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Why you may fit</h2>
            <ul className="space-y-2">
              {proposal.explanation.alignmentPoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gradient" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-elevated p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-warning">
              <Info className="h-3.5 w-3.5" /> Something to explore
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{proposal.explanation.potentialDifference}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-primary-light">
              <Lightbulb className="h-3.5 w-3.5" /> Talk about this on your date
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{proposal.explanation.conversationTopic}</p>
          </div>
        </CardContent>
      </Card>

      {proposal.state === 'waiting_for_interest' ? (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { pass(proposal.id); router.push('/app/proposals'); }}>
            Not for me
          </Button>
          <Button className="flex-1" onClick={() => { showInterest(proposal.id); router.push(`/app/dates/${proposal.id}`); }}>
            Interested
          </Button>
        </div>
      ) : (
        <Button asChild size="block" variant="secondary">
          <Link href={`/app/dates/${proposal.id}`}>Go to this date</Link>
        </Button>
      )}

      <Sheet
        open={scoreOpen}
        onOpenChange={setScoreOpen}
        title="How the score is calculated"
        description="BOND computes compatibility deterministically — the AI only writes the explanation."
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Five categories are each scored 0–100 from your questionnaire answers, then combined with
          fixed weights. Eligibility filters (age, mutual preferences, distance, intentions) run
          first.
        </p>
        <CompatibilityBreakdown categories={proposal.compatibility.categories} showWeights />
      </Sheet>

      <ConfirmationSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        title={`Report ${candidate.displayName}?`}
        description="Reports are private and reviewed by our safety team. The person won’t be notified."
        confirmLabel="Submit report"
        onConfirm={() => { block(candidate.id); router.push('/app/proposals'); }}
      />
      <ConfirmationSheet
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={`Block ${candidate.displayName}?`}
        description="You won’t see each other again. This can’t be undone in the demo."
        confirmLabel="Block"
        destructive
        onConfirm={() => { block(candidate.id); router.push('/app/proposals'); }}
      />
    </div>
  );
}
