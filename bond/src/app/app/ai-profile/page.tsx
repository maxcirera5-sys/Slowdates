'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CompatibilityRing } from '@/components/ui/compatibility-ring';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import type { AiTraits } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

const TRAIT_LABELS: Record<keyof AiTraits, string> = {
  openness: 'Openness',
  sociability: 'Sociability',
  empathy: 'Empathy',
  planning: 'Planning',
  ambition: 'Ambition',
};

export default function AiProfilePage() {
  const router = useRouter();
  const me = useDemoStore((s) => s.me);
  const regenerate = useDemoStore((s) => s.regenerateAiProfile);
  const rate = useDemoStore((s) => s.rateProfile);
  const accuracy = useDemoStore((s) => s.profileAccuracy);
  const [cooldown, setCooldown] = useState(false);

  if (!me) return null;
  const p = me.aiProfile;

  if (!p) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6" />}
        title="No AI profile yet"
        description="Finish the questionnaire and BOND will build your compatibility profile."
        action={<Button onClick={() => router.push('/onboarding/questions')}>Complete the questionnaire</Button>}
      />
    );
  }

  function handleRegenerate() {
    if (cooldown) return;
    regenerate();
    setCooldown(true);
    setTimeout(() => setCooldown(false), 8000); // simple MVP rate limit
  }

  return (
    <div className="animate-fade-in space-y-5">
      <SectionHeader
        eyebrow="Your AI profile"
        title="How BOND sees you"
        subtitle="Built from your answers to help find compatible people."
        action={
          <button
            onClick={handleRegenerate}
            disabled={cooldown}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', cooldown && 'animate-spin')} /> Regenerate
          </button>
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
        <Info className="h-5 w-5 shrink-0 text-primary-light" aria-hidden />
        <span>This profile is a dating compatibility aid, not a psychological diagnosis.</span>
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="text-sm leading-relaxed">{p.summary}</p>
        </CardContent>
      </Card>

      {/* Traits — Apple-Watch-style rings */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-4 text-sm font-semibold">Trait snapshot</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
            {(Object.keys(TRAIT_LABELS) as (keyof AiTraits)[]).map((key) => (
              <div key={key} className="flex flex-col items-center gap-2 text-center">
                <CompatibilityRing value={p.traits[key]} size={64} showLabel />
                <span className="text-xs text-muted-foreground">{TRAIT_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard title="Top values">
          <div className="flex flex-wrap gap-2">
            {p.topValues.map((v) => (
              <span key={v} className="rounded-full bg-elevated px-3 py-1 text-xs">
                {v}
              </span>
            ))}
          </div>
        </InfoCard>
        <InfoCard title="Communication style">{p.communicationStyle}</InfoCard>
        <InfoCard title="Relationship intention">{p.relationshipIntention}</InfoCard>
        <InfoCard title="Lifestyle pattern">{p.lifestylePattern}</InfoCard>
        <InfoCard title="Conflict approach">{p.conflictApproach}</InfoCard>
        <InfoCard title="Preferred partner dynamics">{p.preferredPartnerDynamics}</InfoCard>
      </div>

      <InfoCard title="Potential friction areas">{p.frictionAreas}</InfoCard>

      <Card>
        <CardContent className="pt-5">
          <h2 className="text-sm font-semibold">Does this feel accurate?</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your feedback helps BOND tune your matches.</p>
          <div className="mt-3 flex gap-2">
            {(
              [
                { v: 'accurate', label: 'Accurate' },
                { v: 'partly', label: 'Partly' },
                { v: 'not', label: 'Not accurate' },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                onClick={() => rate(o.v)}
                aria-pressed={accuracy === o.v}
                className={cn(
                  'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                  accuracy === o.v
                    ? 'bg-brand-gradient text-primary-foreground'
                    : 'border border-border text-muted-foreground',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {accuracy ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Thanks. You can{' '}
              <button onClick={() => router.push('/onboarding/questions')} className="underline">
                revise your answers
              </button>{' '}
              and regenerate anytime.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Source: {p.source === 'openai' ? 'AI-assisted summary' : 'On-device deterministic model'} ·
        computed from your questionnaire
      </p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <div className="text-sm">{children}</div>
      </CardContent>
    </Card>
  );
}
