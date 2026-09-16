'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Heart, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingIntro() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient">
        <Sparkles className="h-7 w-7 text-primary-foreground" aria-hidden />
      </div>
      <h1 className="text-balance text-3xl font-bold tracking-tight">
        Let’s build your profile
      </h1>
      <p className="mt-3 text-muted-foreground">
        A few thoughtful steps. BOND turns your answers into a compatibility profile and finds a
        handful of people who genuinely fit.
      </p>

      <ul className="mt-8 space-y-4">
        {[
          { icon: Heart, text: 'Basics, photos and what you’re looking for' },
          { icon: Sparkles, text: '36 quick questions across personality, values and goals' },
          { icon: Shield, text: 'Private by design — your answers are never shown to others' },
        ].map((item) => (
          <li key={item.text} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated text-primary-light">
              <item.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm text-muted-foreground">{item.text}</span>
          </li>
        ))}
      </ul>

      <label className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-primary"
        />
        <span className="text-muted-foreground">
          I consent to BOND generating an AI compatibility profile from my answers. I understand
          this profile is a dating compatibility aid, not a psychological diagnosis.
        </span>
      </label>

      <Button
        className="mt-6"
        size="block"
        disabled={!consent}
        onClick={() => router.push('/onboarding/basics')}
      >
        Start <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
