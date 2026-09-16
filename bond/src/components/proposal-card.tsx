'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompatibilityRing } from '@/components/ui/compatibility-ring';
import type { Proposal, User } from '@/lib/types';
import { ageFromDob, approxDistanceLabel, distanceKm, formatDate } from '@/lib/utils';

export function ProposalCard({
  proposal,
  candidate,
  me,
  onInterested,
  onPass,
}: {
  proposal: Proposal;
  candidate: User;
  me: User;
  onInterested: () => void;
  onPass: () => void;
}) {
  const primary = candidate.photos.find((p) => p.isPrimary) ?? candidate.photos[0];
  const km = distanceKm(me, candidate);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
      <div className="relative aspect-[4/5] w-full bg-elevated">
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primary.url} alt={candidate.displayName} className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="text-white">
              <h2 className="text-2xl font-bold leading-tight drop-shadow">
                {candidate.displayName}, {ageFromDob(candidate.dob)}
              </h2>
              <p className="text-sm text-white/90 drop-shadow">{candidate.profession}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                <MapPin className="h-3 w-3" aria-hidden /> {approxDistanceLabel(km)}
              </p>
            </div>
            <div className="rounded-2xl bg-black/40 p-1.5 backdrop-blur">
              <CompatibilityRing value={proposal.compatibility.total} size={64} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-primary-light">Why you may fit: </span>
          {proposal.explanation.alignmentPoints[0]}
        </p>
        <p className="text-xs text-muted-foreground">
          Proposal expires {formatDate(proposal.expiresAt)}
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild variant="secondary" size="block">
            <Link href={`/app/proposals/${proposal.id}`}>View profile</Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onPass}>
              Not for me
            </Button>
            <Button className="flex-1" onClick={onInterested}>
              Interested
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
